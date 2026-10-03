import React, { useState, useEffect, useRef, useCallback } from "react"
import { CameraView } from "../camera/CameraView"
import {
  FaceDetection,
  FaceQualityCheck,
  RegistrationStepState,
  RegistrationSamplePrompt,
} from "../types"
import { loadYuNetModel } from "../models/yunet"
import { loadSFaceModel, SFACE_MODEL_NAME } from "../models/sface"
import { computeFaceEmbeddingFromVideo } from "../embedding/faceEmbedder"
import { faceApi, Employee } from "../../../services/api"

interface FaceRegistrationModalProps {
  employee: Employee
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const SAMPLE_PROMPTS: RegistrationSamplePrompt[] = [
  {
    step: 1,
    title: "Sample 1 of 5",
    instruction: "Look straight at the camera (neutral expression)",
  },
  {
    step: 2,
    title: "Sample 2 of 5",
    instruction: "Turn your head slightly to the left",
  },
  {
    step: 3,
    title: "Sample 3 of 5",
    instruction: "Turn your head slightly to the right",
  },
  {
    step: 4,
    title: "Sample 4 of 5",
    instruction: "Tilt your head slightly upward or downward",
  },
  {
    step: 5,
    title: "Sample 5 of 5",
    instruction: "Look straight at the camera again",
  },
]

export const FaceRegistrationModal: React.FC<FaceRegistrationModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [state, setState] = useState<RegistrationStepState>("INITIALIZING")
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0)
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<number[][]>([])
  const [statusMessage, setStatusMessage] = useState("Preparing face recognition...")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCapturingNow, setIsCapturingNow] = useState(false)
  const [modelMeta, setModelMeta] = useState({
    name: SFACE_MODEL_NAME,
    version: "2021dec-int8",
    dimension: 128,
  })

  const lastCaptureTimeRef = useRef<number>(0)
  const isMountedRef = useRef(true)

  // Reset state on modal open
  useEffect(() => {
    isMountedRef.current = true
    if (!isOpen) {
      setState("INITIALIZING")
      setCurrentSampleIndex(0)
      setCapturedEmbeddings([])
      setErrorMessage(null)
      return
    }

    // Load models
    const initModels = async () => {
      setState("MODEL_LOADING")
      setStatusMessage("Preparing face recognition models...")
      try {
        await Promise.all([loadYuNetModel(), loadSFaceModel()])
        if (!isMountedRef.current) return
        setState("CAMERA_READY")
        setStatusMessage("Align your face inside the frame")
      } catch (err: unknown) {
        if (!isMountedRef.current) return
        console.error("Model initialization failure:", err)
        setState("ERROR")
        setErrorMessage(
          "Face recognition models could not be loaded. Please check your connection."
        )
      }
    }

    initModels()

    return () => {
      isMountedRef.current = false
    }
  }, [isOpen])

  // Quality check callback
  const handleFaceStatusChange = useCallback(
    (quality: FaceQualityCheck) => {
      if (state === "SAVING" || state === "REGISTERED" || state === "ERROR") return

      if (quality.faceCount === 0) {
        setStatusMessage("Face not detected. Look at camera.")
      } else if (quality.faceCount > 1) {
        setStatusMessage("Only one person should be visible.")
      } else if (!quality.passed) {
        setStatusMessage(quality.reason || "Adjust your position")
      } else {
        setStatusMessage("Good position. Hold still...")
      }
    },
    [state]
  )

  // Face validated and ready for sample capture
  const handleFaceValidated = useCallback(
    async (
      detection: FaceDetection,
      quality: FaceQualityCheck,
      video: HTMLVideoElement
    ) => {
      const now = Date.now()

      // Enforce quality, minimum interval between samples (750ms), and state guards
      if (
        !quality.passed ||
        isCapturingNow ||
        state === "SAVING" ||
        state === "REGISTERED" ||
        state === "ERROR" ||
        now - lastCaptureTimeRef.current < 750
      ) {
        return
      }

      if (currentSampleIndex >= SAMPLE_PROMPTS.length) {
        return
      }

      setIsCapturingNow(true)
      lastCaptureTimeRef.current = now

      try {
        // Extract 128-d L2 normalized embedding
        const res = await computeFaceEmbeddingFromVideo(
          video,
          detection.landmarks
        )

        if (!isMountedRef.current) return

        setModelMeta({
          name: res.modelName,
          version: res.modelVersion,
          dimension: res.dimension,
        })

        const updated = [...capturedEmbeddings, res.embedding]
        setCapturedEmbeddings(updated)

        const nextIndex = currentSampleIndex + 1
        setCurrentSampleIndex(nextIndex)

        // If completed all 5 samples, submit registration to backend
        if (nextIndex >= SAMPLE_PROMPTS.length) {
          setState("SAVING")
          setStatusMessage("Saving face template...")

          try {
            await faceApi.register(employee.id, {
              embeddings: updated,
              model_name: res.modelName,
              model_version: res.modelVersion,
              embedding_dimension: res.dimension,
            })

            if (!isMountedRef.current) return
            setState("REGISTERED")
          } catch (err: unknown) {
            if (!isMountedRef.current) return
            const errObj = err as { detail?: string; message?: string }
            setState("ERROR")
            setErrorMessage(
              errObj.detail || errObj.message || "Unable to save face registration."
            )
          }
        }
      } catch (err: unknown) {
        console.warn("Sample extraction error:", err)
      } finally {
        if (isMountedRef.current) {
          setIsCapturingNow(false)
        }
      }
    },
    [currentSampleIndex, capturedEmbeddings, isCapturingNow, state, employee.id]
  )

  const handleReset = () => {
    setCurrentSampleIndex(0)
    setCapturedEmbeddings([])
    setState("CAMERA_READY")
    setErrorMessage(null)
    setStatusMessage("Align your face inside the frame")
  }

  if (!isOpen) return null

  const prompt =
    SAMPLE_PROMPTS[Math.min(currentSampleIndex, SAMPLE_PROMPTS.length - 1)]

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      style={{ zIndex: 1000 }}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Register Face
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {employee.name} ·{" "}
              <span className="font-mono text-emerald-400">
                {employee.employee_code}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4">
          {state === "REGISTERED" ? (
            /* Success Screen (Requirement 34) */
            <div className="py-8 flex flex-col items-center text-center gap-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-100">
                  Face Registered Successfully
                </h4>
                <p className="text-sm text-slate-400 mt-1">
                  {employee.name} (
                  <span className="font-mono">{employee.employee_code}</span>)
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-800/60 rounded-full text-xs text-emerald-300 font-medium">
                  <span>✓ 5 biometric samples captured</span>
                  <span>·</span>
                  <span>{modelMeta.dimension}-D template</span>
                </div>
              </div>

              <div className="pt-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess()
                    onClose()
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold rounded-xl shadow-lg transition duration-150"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Indicators for 5 samples */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400">
                    {state === "MODEL_LOADING"
                      ? "Loading AI Models..."
                      : state === "SAVING"
                        ? "Saving Face Template..."
                        : prompt.title}
                  </span>
                  <span className="text-slate-400">
                    {capturedEmbeddings.length} of {SAMPLE_PROMPTS.length} samples
                  </span>
                </div>

                {/* Progress bars */}
                <div className="grid grid-cols-5 gap-1.5">
                  {SAMPLE_PROMPTS.map((p, idx) => (
                    <div
                      key={p.step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx < capturedEmbeddings.length
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : idx === capturedEmbeddings.length
                            ? "bg-emerald-500/40 animate-pulse"
                            : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-300 mt-1">
                  {state === "MODEL_LOADING"
                    ? "Initializing lightweight browser neural network..."
                    : state === "SAVING"
                      ? "Transmitting biometric template to secure storage..."
                      : prompt.instruction}
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="ml-2 underline font-semibold hover:text-rose-200"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Live Camera View with Face HUD */}
              <CameraView
                onFaceValidated={handleFaceValidated}
                onFaceStatusChange={handleFaceStatusChange}
                statusMessage={statusMessage}
                isCapturing={isCapturingNow}
              />

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  Reset Samples
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
