import { FaceRecognitionEmployee } from "../../../services/api"

export interface TemporalRecognitionState {
  candidate: FaceRecognitionEmployee | null
  consecutiveMatches: number
  requiredMatches: number
  lastMatchTimestamp: number
  isConfirmed: boolean
}

export class TemporalRecognizer {
  private candidate: FaceRecognitionEmployee | null = null
  private consecutiveMatches = 0
  private readonly requiredMatches: number
  private readonly maxIntervalMs: number
  private lastMatchTimestamp = 0

  constructor(requiredMatches = 3, maxIntervalMs = 1500) {
    this.requiredMatches = requiredMatches
    this.maxIntervalMs = maxIntervalMs
  }

  /**
   * Process a new frame match candidate.
   * Returns current temporal state.
   */
  public update(
    matchedEmployee: FaceRecognitionEmployee | null,
    now: number = Date.now()
  ): TemporalRecognitionState {
    if (!matchedEmployee) {
      this.reset()
      return this.getState()
    }

    // Check if too much time elapsed between frames (face lost or jerky tracking)
    if (
      this.lastMatchTimestamp > 0 &&
      now - this.lastMatchTimestamp > this.maxIntervalMs
    ) {
      this.reset()
    }

    if (
      this.candidate &&
      this.candidate.employee_id === matchedEmployee.employee_id
    ) {
      // Same candidate confirmed another frame
      this.consecutiveMatches += 1
    } else {
      // Different candidate or first frame
      this.candidate = matchedEmployee
      this.consecutiveMatches = 1
    }

    this.lastMatchTimestamp = now

    return this.getState()
  }

  /**
   * Reset temporal tracker.
   */
  public reset(): void {
    this.candidate = null
    this.consecutiveMatches = 0
    this.lastMatchTimestamp = 0
  }

  public getState(): TemporalRecognitionState {
    return {
      candidate: this.candidate,
      consecutiveMatches: this.consecutiveMatches,
      requiredMatches: this.requiredMatches,
      lastMatchTimestamp: this.lastMatchTimestamp,
      isConfirmed: this.consecutiveMatches >= this.requiredMatches,
    }
  }
}
