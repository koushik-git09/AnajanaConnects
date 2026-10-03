export interface Point2D {
  x: number
  y: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type FaceLandmarks = [
  rightEye: Point2D,
  leftEye: Point2D,
  noseTip: Point2D,
  rightMouth: Point2D,
  leftMouth: Point2D,
]

export interface FaceDetection {
  bbox: BoundingBox
  landmarks: FaceLandmarks
  score: number
}

export interface FaceQualityCheck {
  passed: boolean
  faceCount: number
  reason?: string
  isCentered?: boolean
  isLargeEnough?: boolean
  isNotTilted?: boolean
}

export type RegistrationStepState =
  | "INITIALIZING"
  | "MODEL_LOADING"
  | "CAMERA_READY"
  | "DETECTING"
  | "CAPTURING"
  | "PROCESSING"
  | "SAVING"
  | "REGISTERED"
  | "ERROR"

export interface RegistrationSamplePrompt {
  step: number
  title: string
  instruction: string
}
