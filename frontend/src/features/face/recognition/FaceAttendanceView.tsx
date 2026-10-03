import React, { useState, useEffect, useRef, useCallback } from "react"
import { CameraView } from "../camera/CameraView"
import { FaceDetection, FaceQualityCheck } from "../types"
import { loadYuNetModel } from "../models/yunet"
import { loadSFaceModel } from "../models/sface"
import { computeFaceEmbeddingFromVideo } from "../embedding/faceEmbedder"
import {
  faceApi,
  FaceRecognitionEmployee,
  FaceAttendanceMarkResponse,
} from "../../../services/api"
import { findMatchingEmployee, DEFAULT_RECOGNITION_THRESHOLD } from "./faceMatcher"
import { TemporalRecognizer } from "./temporalRecognizer"

interface FaceAttendanceViewProps {
  onAttendanceRecorded?: (record: FaceAttendanceMarkResponse) => void
  onClose?: () => void
}

type ScanStatusMode =
  | "INITIALIZING"
  | "SCANNING"
  | "VERIFYING"
  | "MARKED_SUCCESS"
  | "ALREADY_PRESENT"
  | "ABSENT_CONFLICT"
  | "UNKNOWN_FACE"
  | "ERROR"

export const FaceAttendanceView: React.FC<FaceAttendanceViewProps> = ({
  onAttendanceRecorded,
  onClose,
}) => {
  const [statusMode, setStatusMode] = useState<ScanStatusMode>("INITIALIZING")
  const [statusText, setStatusText] = useState("Preparing face recognition...")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [registeredEmployees, setRegisteredEmployees] = useState<
    FaceRecognitionEmployee[]
  >([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeEmployeeResult, setActiveEmployeeResult] =
    useState<FaceAttendanceMarkResponse | null>(null)
  const [verifyingProgress, setVerifyingProgress] = useState(0)

  // Diagnostics support (VITE_FACE_DEBUG=true)
  const isDebugMode =
    typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_FACE_DEBUG === "true"
  const [debugInfo, setDebugInfo] = useState<{
    candidateName?: string
    similarity?: number
    frameMatchCount?: number
  } | null>(null)

  const temporalRecognizerRef = useRef<TemporalRecognizer>(
    new TemporalRecognizer(3, 1500)
  )
  const isProcessingFrameRef = useRef(false)
  const isPausedRef = useRef(false)
  const isMountedRef = useRef(true)

  // Initialize models and backend recognition session
  const initSession = useCallback(async () => {
    setStatusMode("INITIALIZING")
    setErrorMessage(null)
    setStatusText("Initializing AI models & scanner...")

    try {
      // 1. Ensure models are loaded in browser memory
      await Promise.all([loadYuNetModel(), loadSFaceModel()])

      if (!isMountedRef.current) return

      // 2. Request short-lived agency-scoped recognition session
      const session = await faceApi.createRecognitionSession()

      if (!isMountedRef.current) return

      setSessionId(session.session_id)
      setRegisteredEmployees(session.employees)

      if (session.employees.length === 0) {
        setStatusMode("SCANNING")
        setStatusText("No staff members have registered face templates yet.")
      } else {
        setStatusMode("SCANNING")
        setStatusText("Looking for a face...")
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      console.error("Failed to initialize face attendance session:", err)
      const errObj = err as { detail?: string; message?: string }
      setStatusMode("ERROR")
      setErrorMessage(
        errObj.detail ||
          errObj.message ||
          "Unable to start face attendance session. Please check connection."
      )
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    initSession()

    return () => {
      isMountedRef.current = false
      // Clear sensitive embeddings and session from memory on unmount (Requirement 6 & 26)
      setRegisteredEmployees([])
      setSessionId(null)
    }
  }, [initSession])

  // Quality status handler from camera
  const handleFaceStatusChange = useCallback((quality: FaceQualityCheck) => {
    if (isPausedRef.current || statusMode === "ERROR") return

    if (quality.faceCount === 0) {
      temporalRecognizerRef.current.reset()
      setStatusMode("SCANNING")
      setStatusText("Position your face inside the frame.")
      setVerifyingProgress(0)
    } else if (quality.faceCount > 1) {
      temporalRecognizerRef.current.reset()
      setStatusMode("SCANNING")
      setStatusText("Only one person should be visible.")
      setVerifyingProgress(0)
    } else if (!quality.passed) {
      temporalRecognizerRef.current.reset()
      setStatusMode("SCANNING")
      setStatusText(quality.reason || "Adjust your position")
      setVerifyingProgress(0)
    }
  }, [statusMode])

  // Validated face frame inference
  const handleFaceValidated = useCallback(
    async (
      detection: FaceDetection,
      quality: FaceQualityCheck,
      video: HTMLVideoElement
    ) => {
      if (
        !quality.passed ||
        isProcessingFrameRef.current ||
        isPausedRef.current ||
        !sessionId ||
        registeredEmployees.length === 0
      ) {
        return
      }

      isProcessingFrameRef.current = true

      try {
        // 1. Extract 128-D normalized live embedding
        const { embedding } = await computeFaceEmbeddingFromVideo(
          video,
          detection.landmarks
        )

        if (!isMountedRef.current || isPausedRef.current) return

        // 2. Local cosine similarity matching
        const matchResult = findMatchingEmployee(
          embedding,
          registeredEmployees,
          DEFAULT_RECOGNITION_THRESHOLD
        )

        // 3. Update temporal confirmation tracker
        const temporalState = temporalRecognizerRef.current.update(
          matchResult.employee
        )

        if (isDebugMode) {
          setDebugInfo({
            candidateName: matchResult.employee?.name || "None",
            similarity: matchResult.maxSimilarity,
            frameMatchCount: temporalState.consecutiveMatches,
          })
        }

        if (matchResult.isMatch && temporalState.candidate) {
          const candidate = temporalState.candidate
          const currentCount = temporalState.consecutiveMatches
          const required = temporalState.requiredMatches

          setVerifyingProgress(Math.min(100, (currentCount / required) * 100))

          if (!temporalState.isConfirmed) {
            // Confirming candidate across consecutive frames (0.5 - 1.5s)
            setStatusMode("VERIFYING")
            setStatusText(
              `Verifying ${candidate.name}... (Sample ${currentCount} of ${required})`
            )
          } else {
            // Identity confirmed! Mark attendance with backend
            isPausedRef.current = true
            setStatusText(`Recording attendance for ${candidate.name}...`)

            try {
              const res = await faceApi.markFaceAttendance({
                recognition_session_id: sessionId,
                employee_id: candidate.employee_id,
              })

              if (!isMountedRef.current) return

              setActiveEmployeeResult(res)
              onAttendanceRecorded?.(res)

              if (res.status === "marked") {
                setStatusMode("MARKED_SUCCESS")
                setStatusText(`✓ Attendance marked: ${candidate.name}`)
              } else if (res.status === "already_marked") {
                setStatusMode("ALREADY_PRESENT")
                setStatusText(`✓ Already marked Present today: ${candidate.name}`)
              } else if (res.status === "already_marked_absent") {
                setStatusMode("ABSENT_CONFLICT")
                setStatusText(
                  "Attendance already marked Absent today. Use Manual Attendance to change."
                )
              }

              // Auto-resume scanning for next employee after short delay
              setTimeout(() => {
                if (!isMountedRef.current) return
                temporalRecognizerRef.current.reset()
                setActiveEmployeeResult(null)
                setVerifyingProgress(0)
                setStatusMode("SCANNING")
                setStatusText("Ready for next employee")
                isPausedRef.current = false
              }, 2500)
            } catch (err: unknown) {
              if (!isMountedRef.current) return
              console.warn("Face mark error:", err)
              const errObj = err as { detail?: string; message?: string }
              setStatusMode("ERROR")
              setErrorMessage(
                errObj.detail || errObj.message || "Failed to record attendance."
              )
              isPausedRef.current = false
            }
          }
        } else {
          // No registered employee exceeded the threshold
          setStatusMode("UNKNOWN_FACE")
          setStatusText("Face not recognized. Try again.")
          setVerifyingProgress(0)
        }
      } catch (err) {
        console.warn("Face recognition frame error:", err)
      } finally {
        if (isMountedRef.current) {
          isProcessingFrameRef.current = false
        }
      }
    },
    [sessionId, registeredEmployees, onAttendanceRecorded, isDebugMode]
  )

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Face Attendance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {registeredEmployees.length} staff member
            {registeredEmployees.length === 1 ? "" : "s"} enrolled for facial
            recognition
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Switch to Manual
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={initSession}
            className="ml-2 font-semibold underline hover:text-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Camera Scanning View */}
      <div className="relative">
        <CameraView
          onFaceValidated={handleFaceValidated}
          onFaceStatusChange={handleFaceStatusChange}
          statusMessage={statusText}
          isCapturing={statusMode === "VERIFYING"}
        />

        {/* Verification Progress Bar */}
        {statusMode === "VERIFYING" && verifyingProgress > 0 && (
          <div className="absolute top-2 left-4 right-4 z-20">
            <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden backdrop-blur-md">
              <div
                className="bg-emerald-400 h-1.5 transition-all duration-150"
                style={{ width: `${verifyingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Diagnostic Mode Overlay (Development Only) */}
        {isDebugMode && debugInfo && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded bg-black/80 backdrop-blur-sm text-[11px] font-mono text-emerald-400 border border-emerald-500/30">
            Candidate: {debugInfo.candidateName} | Score:{" "}
            {(debugInfo.similarity || 0).toFixed(3)} | Frames:{" "}
            {debugInfo.frameMatchCount}/3
          </div>
        )}

        {/* Live Attendance Result Cards Overlay */}
        {activeEmployeeResult && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn rounded-2xl">
            {activeEmployeeResult.status === "marked" && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  ✓
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                    Attendance Marked
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">
                    {activeEmployeeResult.employee_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeEmployeeResult.employee_code}
                  </p>
                </div>
                <div className="px-3 py-1 bg-emerald-950/50 border border-emerald-800/60 rounded-full text-xs text-emerald-300 font-medium">
                  Present ·{" "}
                  {new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}

            {activeEmployeeResult.status === "already_marked" && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-sky-400">
                    Already Recorded
                  </span>
                  <h3 className="text-lg font-bold text-slate-100 mt-1">
                    {activeEmployeeResult.employee_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeEmployeeResult.employee_code}
                  </p>
                </div>
                <p className="text-xs text-slate-300">
                  Already marked Present for today.
                </p>
              </div>
            )}

            {activeEmployeeResult.status === "already_marked_absent" && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">
                  !
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                    Conflict
                  </span>
                  <h3 className="text-lg font-bold text-slate-100 mt-1">
                    {activeEmployeeResult.employee_name}
                  </h3>
                </div>
                <p className="text-xs text-amber-300 max-w-xs">
                  Attendance was already marked Absent today. Use Manual
                  Attendance to change it.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions & Footnote */}
      <div className="px-4 py-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs text-slate-400">
        <span>
          Keep face centered in frame. Verifies in ~1 second when steady.
        </span>
        <span className="font-semibold text-emerald-400/90">Single Person</span>
      </div>
    </div>
  )
}
