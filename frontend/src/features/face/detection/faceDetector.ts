import { FaceDetection, FaceQualityCheck } from "../types"
import { detectFacesWithYuNet } from "../models/yunet"
import { checkFaceTilt } from "../alignment/faceAlignment"

export async function detectAndValidateFace(
  video: HTMLVideoElement
): Promise<{
  detections: FaceDetection[]
  quality: FaceQualityCheck
  primaryDetection?: FaceDetection
}> {
  if (!video.videoWidth || !video.videoHeight) {
    return {
      detections: [],
      quality: {
        passed: false,
        faceCount: 0,
        reason: "Camera feed not ready",
      },
    }
  }

  const detections = await detectFacesWithYuNet(video, 0.65)

  if (detections.length === 0) {
    return {
      detections,
      quality: {
        passed: false,
        faceCount: 0,
        reason: "Face not detected",
      },
    }
  }

  if (detections.length > 1) {
    return {
      detections,
      quality: {
        passed: false,
        faceCount: 0,
        reason: "Multiple faces detected. Only one person should be visible.",
      },
    }
  }

  const primary = detections[0]
  const vidW = video.videoWidth
  const vidH = video.videoHeight

  // 1. Check face size
  const minWidth = vidW * 0.18
  const minHeight = vidH * 0.18
  if (primary.bbox.width < minWidth || primary.bbox.height < minHeight) {
    return {
      detections,
      primaryDetection: primary,
      quality: {
        passed: false,
        faceCount: 1,
        isLargeEnough: false,
        reason: "Move closer to the camera",
      },
    }
  }

  // 2. Check if face is inside frame (not cropped off edges)
  const edgeMarginX = vidW * 0.03
  const edgeMarginY = vidH * 0.03
  if (
    primary.bbox.x < edgeMarginX ||
    primary.bbox.y < edgeMarginY ||
    primary.bbox.x + primary.bbox.width > vidW - edgeMarginX ||
    primary.bbox.y + primary.bbox.height > vidH - edgeMarginY
  ) {
    return {
      detections,
      primaryDetection: primary,
      quality: {
        passed: false,
        faceCount: 1,
        isCentered: false,
        reason: "Keep your face inside the frame",
      },
    }
  }

  // 3. Check tilt & roll
  const tiltResult = checkFaceTilt(primary.landmarks)
  if (tiltResult.isTilted) {
    return {
      detections,
      primaryDetection: primary,
      quality: {
        passed: false,
        faceCount: 1,
        isNotTilted: false,
        reason: tiltResult.reason || "Look directly at the camera",
      },
    }
  }

  return {
    detections,
    primaryDetection: primary,
    quality: {
      passed: true,
      faceCount: 1,
      isCentered: true,
      isLargeEnough: true,
      isNotTilted: true,
      reason: "Good position",
    },
  }
}
