import { FaceLandmarks } from "../types"
import { alignFaceToCanvas } from "../alignment/faceAlignment"
import {
  extractSFaceEmbedding,
  SFACE_MODEL_NAME,
  getActiveSFaceModelVersion,
} from "../models/sface"

let alignmentCanvas: HTMLCanvasElement | null = null

export interface EmbeddingResult {
  embedding: number[]
  dimension: number
  modelName: string
  modelVersion: string
}

/**
 * Align face from video using landmarks and extract SFace embedding.
 */
export async function computeFaceEmbeddingFromVideo(
  video: HTMLVideoElement,
  landmarks: FaceLandmarks
): Promise<EmbeddingResult> {
  if (!alignmentCanvas) {
    alignmentCanvas = document.createElement("canvas")
    alignmentCanvas.width = 112
    alignmentCanvas.height = 112
  }

  // Align face using 5 landmarks to 112x112 canonical template
  alignFaceToCanvas(video, landmarks, alignmentCanvas)

  // Run SFace inference
  const { embedding, dimension, modelVersion } =
    await extractSFaceEmbedding(alignmentCanvas)

  return {
    embedding,
    dimension,
    modelName: SFACE_MODEL_NAME,
    modelVersion: modelVersion || getActiveSFaceModelVersion(),
  }
}
