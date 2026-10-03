import * as ort from "onnxruntime-web"
import { BoundingBox, FaceDetection, FaceLandmarks } from "../types"

// Configure ONNX Runtime Web WASM paths locally
if (typeof window !== "undefined" && ort?.env?.wasm) {
  ort.env.wasm.wasmPaths = "/wasm/"
  ort.env.wasm.numThreads = 1
}

let yunetSession: ort.InferenceSession | null = null

const PRIMARY_MODEL_PATH =
  "/models/face/yunet/face_detection_yunet_2023mar_int8.onnx"
const FALLBACK_MODEL_PATH =
  "/models/face/yunet/face_detection_yunet_2023mar.onnx"

export async function loadYuNetModel(): Promise<ort.InferenceSession> {
  if (yunetSession) return yunetSession

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  }

  try {
    yunetSession = await ort.InferenceSession.create(
      PRIMARY_MODEL_PATH,
      sessionOptions
    )
    return yunetSession
  } catch (err) {
    console.warn("YuNet INT8 model load failed, attempting FP32 fallback:", err)
    yunetSession = await ort.InferenceSession.create(
      FALLBACK_MODEL_PATH,
      sessionOptions
    )
    return yunetSession
  }
}

/**
 * Calculates Intersection over Union between two bounding boxes.
 */
function calculateIoU(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = a.width * a.height
  const areaB = b.width * b.height
  const union = areaA + areaB - intersection

  return union > 0 ? intersection / union : 0
}

/**
 * Non-Maximum Suppression (NMS)
 */
function applyNMS(
  detections: FaceDetection[],
  iouThreshold = 0.45
): FaceDetection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score)
  const result: FaceDetection[] = []

  for (const det of sorted) {
    let keep = true
    for (const kept of result) {
      if (calculateIoU(det.bbox, kept.bbox) > iouThreshold) {
        keep = false
        break
      }
    }
    if (keep) {
      result.push(det)
    }
  }

  return result
}

// Reusable offscreen canvas for preprocessing
let preprocessCanvas: HTMLCanvasElement | null = null

/**
 * Run YuNet face detection on a video or canvas element.
 */
export async function detectFacesWithYuNet(
  imageSource: HTMLVideoElement | HTMLCanvasElement,
  confThreshold = 0.65
): Promise<FaceDetection[]> {
  const session = await loadYuNetModel()

  const srcWidth =
    "videoWidth" in imageSource ? imageSource.videoWidth : imageSource.width
  const srcHeight =
    "videoHeight" in imageSource ? imageSource.videoHeight : imageSource.height

  if (!srcWidth || !srcHeight) {
    return []
  }

  const targetSize = 640
  if (!preprocessCanvas) {
    preprocessCanvas = document.createElement("canvas")
    preprocessCanvas.width = targetSize
    preprocessCanvas.height = targetSize
  }

  const ctx = preprocessCanvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return []

  // Letterbox scaling: preserve aspect ratio
  const scale = Math.min(targetSize / srcWidth, targetSize / srcHeight)
  const scaledW = Math.round(srcWidth * scale)
  const scaledH = Math.round(srcHeight * scale)
  const padX = Math.round((targetSize - scaledW) / 2)
  const padY = Math.round((targetSize - scaledH) / 2)

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, targetSize, targetSize)
  ctx.drawImage(imageSource, padX, padY, scaledW, scaledH)

  const imgData = ctx.getImageData(0, 0, targetSize, targetSize)
  const pixels = imgData.data

  // YuNet input: shape [1, 3, 640, 640], BGR channel ordering, float32 range [0, 255]
  const inputData = new Float32Array(3 * targetSize * targetSize)
  const channelSize = targetSize * targetSize

  for (let i = 0; i < channelSize; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]
    // BGR ordering
    inputData[i] = b
    inputData[channelSize + i] = g
    inputData[channelSize * 2 + i] = r
  }

  const inputTensor = new ort.Tensor("float32", inputData, [
    1,
    3,
    targetSize,
    targetSize,
  ])

  const feeds: Record<string, ort.Tensor> = {
    [session.inputNames[0] || "input"]: inputTensor,
  }

  const results = await session.run(feeds)

  // Stride heads in YuNet
  const strides = [8, 16, 32] as const
  const rawDetections: FaceDetection[] = []

  for (const stride of strides) {
    const clsName = `cls_${stride}`
    const objName = `obj_${stride}`
    const bboxName = `bbox_${stride}`
    const kpsName = `kps_${stride}`

    const clsTensor = results[clsName]
    const objTensor = results[objName]
    const bboxTensor = results[bboxName]
    const kpsTensor = results[kpsName]

    if (!clsTensor || !objTensor || !bboxTensor || !kpsTensor) continue

    const clsData = clsTensor.data as Float32Array
    const objData = objTensor.data as Float32Array
    const bboxData = bboxTensor.data as Float32Array
    const kpsData = kpsTensor.data as Float32Array

    const gridW = targetSize / stride
    const gridH = targetSize / stride
    const numCells = gridW * gridH

    for (let r = 0; r < gridH; r++) {
      for (let c = 0; c < gridW; c++) {
        const idx = r * gridW + c
        if (idx >= numCells) break

        const clsVal = Math.max(0, Math.min(1, clsData[idx]))
        const objVal = Math.max(0, Math.min(1, objData[idx]))
        const score = Math.sqrt(clsVal * objVal)

        if (score < confThreshold) continue

        // Bounding box offsets
        const bIdx = idx * 4
        const dx = bboxData[bIdx]
        const dy = bboxData[bIdx + 1]
        const dw = bboxData[bIdx + 2]
        const dh = bboxData[bIdx + 3]

        const cx = (c + dx) * stride
        const cy = (r + dy) * stride
        const bw = Math.exp(dw) * stride
        const bh = Math.exp(dh) * stride
        const bx = cx - bw / 2
        const by = cy - bh / 2

        // Map back from letterbox (640x640) to original image coordinates
        const origX = (bx - padX) / scale
        const origY = (by - padY) / scale
        const origW = bw / scale
        const origH = bh / scale

        // 5 Keypoints
        const kIdx = idx * 10
        const landmarks: FaceLandmarks = [
          // 0: right eye
          {
            x: ((kpsData[kIdx] + c) * stride - padX) / scale,
            y: ((kpsData[kIdx + 1] + r) * stride - padY) / scale,
          },
          // 1: left eye
          {
            x: ((kpsData[kIdx + 2] + c) * stride - padX) / scale,
            y: ((kpsData[kIdx + 3] + r) * stride - padY) / scale,
          },
          // 2: nose tip
          {
            x: ((kpsData[kIdx + 4] + c) * stride - padX) / scale,
            y: ((kpsData[kIdx + 5] + r) * stride - padY) / scale,
          },
          // 3: right mouth
          {
            x: ((kpsData[kIdx + 6] + c) * stride - padX) / scale,
            y: ((kpsData[kIdx + 7] + r) * stride - padY) / scale,
          },
          // 4: left mouth
          {
            x: ((kpsData[kIdx + 8] + c) * stride - padX) / scale,
            y: ((kpsData[kIdx + 9] + r) * stride - padY) / scale,
          },
        ]

        rawDetections.push({
          bbox: {
            x: Math.max(0, origX),
            y: Math.max(0, origY),
            width: Math.min(srcWidth, origW),
            height: Math.min(srcHeight, origH),
          },
          landmarks,
          score,
        })
      }
    }
  }

  return applyNMS(rawDetections, 0.45)
}
