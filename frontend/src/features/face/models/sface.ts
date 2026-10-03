import * as ort from "onnxruntime-web"

// Configure ONNX Runtime Web WASM paths locally
if (typeof window !== "undefined" && ort?.env?.wasm) {
  ort.env.wasm.wasmPaths = "/wasm/"
  ort.env.wasm.numThreads = 1
}

let sfaceSession: ort.InferenceSession | null = null
let activeModelVersion = "2021dec-int8"

const PRIMARY_MODEL_PATH =
  "/models/face/sface/face_recognition_sface_2021dec_int8.onnx"
const FALLBACK_MODEL_PATH =
  "/models/face/sface/face_recognition_sface_2021dec.onnx"

export const SFACE_MODEL_NAME = "opencv-sface"

export function getActiveSFaceModelVersion(): string {
  return activeModelVersion
}

export async function loadSFaceModel(): Promise<ort.InferenceSession> {
  if (sfaceSession) return sfaceSession

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  }

  try {
    sfaceSession = await ort.InferenceSession.create(
      PRIMARY_MODEL_PATH,
      sessionOptions
    )
    activeModelVersion = "2021dec-int8"
    return sfaceSession
  } catch (err) {
    console.warn("SFace INT8 model load failed, attempting FP32 fallback:", err)
    sfaceSession = await ort.InferenceSession.create(
      FALLBACK_MODEL_PATH,
      sessionOptions
    )
    activeModelVersion = "2021dec"
    return sfaceSession
  }
}

/**
 * L2-normalize an embedding vector.
 */
export function l2Normalize(vector: Float32Array): Float32Array {
  let sumSq = 0
  for (let i = 0; i < vector.length; i++) {
    const val = vector[i]
    if (isNaN(val) || !isFinite(val)) {
      throw new Error(`Embedding contains invalid value at index ${i}: ${val}`)
    }
    sumSq += val * val
  }

  const norm = Math.sqrt(sumSq)
  if (norm < 1e-7) {
    throw new Error("Cannot normalize near-zero embedding vector")
  }

  const normalized = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm
  }

  return normalized
}

/**
 * Run SFace embedding on a 112x112 aligned face canvas.
 * Input: 112x112 canvas containing the aligned face.
 * Output: 128-dimensional L2-normalized float array.
 */
export async function extractSFaceEmbedding(
  alignedCanvas: HTMLCanvasElement
): Promise<{
  embedding: number[]
  dimension: number
  modelVersion: string
}> {
  const session = await loadSFaceModel()

  const ctx = alignedCanvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) {
    throw new Error("Failed to get 2D context from aligned face canvas")
  }

  const imgData = ctx.getImageData(0, 0, 112, 112)
  const pixels = imgData.data

  // SFace input shape: [1, 3, 112, 112], float32 in range [0, 255], RGB order
  const channelSize = 112 * 112
  const inputData = new Float32Array(3 * channelSize)

  for (let i = 0; i < channelSize; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]

    // Planar RGB ordering
    inputData[i] = r
    inputData[channelSize + i] = g
    inputData[channelSize * 2 + i] = b
  }

  const inputName = session.inputNames[0] || "data"
  const inputTensor = new ort.Tensor("float32", inputData, [1, 3, 112, 112])

  const feeds: Record<string, ort.Tensor> = {
    [inputName]: inputTensor,
  }

  const results = await session.run(feeds)
  const outputName = session.outputNames[0] || "fc1"
  const outputTensor = results[outputName]

  if (!outputTensor) {
    throw new Error(`SFace inference did not return output tensor '${outputName}'`)
  }

  const rawVec = outputTensor.data as Float32Array
  const normalized = l2Normalize(rawVec)

  return {
    embedding: Array.from(normalized),
    dimension: normalized.length,
    modelVersion: activeModelVersion,
  }
}
