import { FaceLandmarks, Point2D } from "../types"

/**
 * Standard canonical 5-point face landmarks for 112x112 aligned face crop.
 * Reference: OpenCV Zoo SFace / ArcFace canonical landmarks.
 * Landmarks order:
 * 0: Right eye
 * 1: Left eye
 * 2: Nose tip
 * 3: Right mouth corner
 * 4: Left mouth corner
 */
export const CANONICAL_LANDMARKS_112: Point2D[] = [
  { x: 38.2946, y: 51.6963 }, // Right eye
  { x: 73.5318, y: 51.5014 }, // Left eye
  { x: 56.0252, y: 71.7366 }, // Nose tip
  { x: 41.5493, y: 92.3655 }, // Right mouth corner
  { x: 70.7299, y: 92.2041 }, // Left mouth corner
]

export interface SimilarityTransformParams {
  a: number
  b: number
  tx: number
  ty: number
  scale: number
  angleDeg: number
}

/**
 * Compute the 2D similarity transform (rotation, uniform scale, translation)
 * that maps source 5 landmarks to canonical 112x112 target landmarks.
 *
 * Transformation equation:
 * u = a * x - b * y + tx
 * v = b * x + a * y + ty
 *
 * where:
 * a = scale * cos(theta)
 * b = scale * sin(theta)
 */
export function computeSimilarityTransform(
  sourcePoints: Point2D[],
  targetPoints: Point2D[] = CANONICAL_LANDMARKS_112
): SimilarityTransformParams {
  const n = sourcePoints.length
  if (n !== targetPoints.length || n === 0) {
    throw new Error("Source and target landmarks count mismatch")
  }

  // 1. Compute centroids
  let meanSrcX = 0
  let meanSrcY = 0
  let meanDstX = 0
  let meanDstY = 0

  for (let i = 0; i < n; i++) {
    meanSrcX += sourcePoints[i].x
    meanSrcY += sourcePoints[i].y
    meanDstX += targetPoints[i].x
    meanDstY += targetPoints[i].y
  }

  meanSrcX /= n
  meanSrcY /= n
  meanDstX /= n
  meanDstY /= n

  // 2. Compute variance and covariance
  let denom = 0
  let numA = 0
  let numB = 0

  for (let i = 0; i < n; i++) {
    const dx = sourcePoints[i].x - meanSrcX
    const dy = sourcePoints[i].y - meanSrcY
    const du = targetPoints[i].x - meanDstX
    const dv = targetPoints[i].y - meanDstY

    denom += dx * dx + dy * dy
    numA += dx * du + dy * dv
    numB += dx * dv - dy * du
  }

  if (denom < 1e-7) {
    // Degenerate points fallback: identity transform
    return { a: 1, b: 0, tx: 0, ty: 0, scale: 1, angleDeg: 0 }
  }

  const a = numA / denom
  const b = numB / denom
  const tx = meanDstX - (a * meanSrcX - b * meanSrcY)
  const ty = meanDstY - (b * meanSrcX + a * meanSrcY)

  const scale = Math.sqrt(a * a + b * b)
  const angleDeg = (Math.atan2(b, a) * 180) / Math.PI

  return { a, b, tx, ty, scale, angleDeg }
}

/**
 * Align face from video/canvas onto a 112x112 canvas using 5 facial landmarks.
 */
export function alignFaceToCanvas(
  source: CanvasImageSource,
  landmarks: FaceLandmarks,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = targetCanvas || document.createElement("canvas")
  canvas.width = 112
  canvas.height = 112

  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) {
    throw new Error("Failed to get 2D context for face alignment canvas")
  }

  // Clear canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, 112, 112)

  // Compute similarity transform parameters
  const { a, b, tx, ty } = computeSimilarityTransform(landmarks)

  /**
   * In HTML Canvas 2D setTransform(a, b, c, d, e, f):
   * X = a * x + c * y + e
   * Y = b * x + d * y + f
   *
   * Here:
   * u = a * x - b * y + tx => c = -b, e = tx
   * v = b * x + a * y + ty => d = a,  f = ty
   */
  ctx.setTransform(a, b, -b, a, tx, ty)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, 0, 0)

  // Reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  return canvas
}

/**
 * Check if the face is tilted beyond acceptable limits.
 */
export function checkFaceTilt(landmarks: FaceLandmarks): {
  isTilted: boolean
  rollDeg: number
  yawRatio: number
  reason?: string
} {
  const [rightEye, leftEye, noseTip] = landmarks

  // Roll: angle between eyes (horizontal tilt)
  const dEyeX = leftEye.x - rightEye.x
  const dEyeY = leftEye.y - rightEye.y
  const rollDeg = (Math.atan2(dEyeY, dEyeX) * 180) / Math.PI

  // Yaw proxy: horizontal distance from nose to right eye vs nose to left eye
  const distToRight = Math.abs(noseTip.x - rightEye.x)
  const distToLeft = Math.abs(noseTip.x - leftEye.x)
  const yawRatio = distToLeft > 0 ? distToRight / distToLeft : 1

  // Permissible tilt limits
  if (Math.abs(rollDeg) > 22) {
    return {
      isTilted: true,
      rollDeg,
      yawRatio,
      reason: "Look directly at the camera (head is tilted)",
    }
  }

  if (yawRatio < 0.35 || yawRatio > 2.8) {
    return {
      isTilted: true,
      rollDeg,
      yawRatio,
      reason: "Turn face slightly towards center",
    }
  }

  return { isTilted: false, rollDeg, yawRatio }
}
