import React, { useEffect, useRef, useState, useCallback } from "react"
import { FaceDetection, FaceQualityCheck } from "../types"
import { detectAndValidateFace } from "../detection/faceDetector"

interface CameraViewProps {
  onFaceValidated?: (
    detection: FaceDetection,
    quality: FaceQualityCheck,
    video: HTMLVideoElement
  ) => void
  onFaceStatusChange?: (quality: FaceQualityCheck) => void
  statusMessage?: string
  isCapturing?: boolean
}

export const CameraView: React.FC<CameraViewProps> = ({
  onFaceValidated,
  onFaceStatusChange,
  statusMessage,
  isCapturing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isMountedRef = useRef(true)
  const isProcessingRef = useRef(false)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)

  // Stop camera tracks cleanly
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraReady(false)
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    stopTracks()
    setCameraError(null)

    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setCameraError(
        "Camera access requires a secure HTTPS connection in production."
      )
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera is not supported on this device/browser.")
      return
    }

    try {
      // Check multiple video devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter((d) => d.kind === "videoinput")
      setHasMultipleCameras(videoInputs.length > 1)

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {
          // auto-play catch
        })
        setIsCameraReady(true)
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      console.error("Camera startup error:", err)
      const errorObj = err as { name?: string; message?: string }
      if (
        errorObj.name === "NotAllowedError" ||
        errorObj.name === "PermissionDeniedError"
      ) {
        setCameraError("Camera permission is required to register a face.")
      } else if (
        errorObj.name === "NotFoundError" ||
        errorObj.name === "DevicesNotFoundError"
      ) {
        setCameraError("No camera was found.")
      } else {
        setCameraError(
          errorObj.message || "Failed to access camera. Please check permissions."
        )
      }
    }
  }, [facingMode, stopTracks])

  useEffect(() => {
    isMountedRef.current = true
    startCamera()

    return () => {
      isMountedRef.current = false
      stopTracks()
    }
  }, [startCamera, stopTracks])

  // Controlled inference loop: ~7-10 FPS (120ms interval) to save CPU/battery
  useEffect(() => {
    if (!isCameraReady || cameraError) return

    let intervalId: NodeJS.Timeout | null = null

    const runInferenceCycle = async () => {
      const video = videoRef.current
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.paused ||
        video.ended ||
        isProcessingRef.current
      ) {
        return
      }

      isProcessingRef.current = true

      try {
        const { detections, quality, primaryDetection } =
          await detectAndValidateFace(video)

        if (!isMountedRef.current) return

        onFaceStatusChange?.(quality)

        // Draw HUD overlay on canvas
        const canvas = canvasOverlayRef.current
        if (canvas) {
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw bounding box if face detected
            if (primaryDetection) {
              const { x, y, width, height } = primaryDetection.bbox
              const isGood = quality.passed

              // Smooth rounded box
              ctx.lineWidth = 2.5
              ctx.strokeStyle = isGood ? "#10b981" : "#f59e0b" // emerald / amber
              ctx.fillStyle = isGood
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(245, 158, 11, 0.08)"

              ctx.beginPath()
              ctx.roundRect(x, y, width, height, 12)
              ctx.stroke()
              ctx.fill()

              // Draw subtle landmark points
              primaryDetection.landmarks.forEach((pt, i) => {
                ctx.beginPath()
                ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI)
                ctx.fillStyle = i === 2 ? "#38bdf8" : "#34d399" // nose light-blue, eyes green
                ctx.fill()
              })
            }
          }
        }

        if (quality.passed && primaryDetection && video) {
          onFaceValidated?.(primaryDetection, quality, video)
        }
      } catch (err) {
        console.warn("Face detection cycle error:", err)
      } finally {
        isProcessingRef.current = false
      }
    }

    intervalId = setInterval(runInferenceCycle, 130)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isCameraReady, cameraError, onFaceValidated, onFaceStatusChange])

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950 shadow-2xl border border-slate-800">
      {/* Video & Canvas container */}
      <div className="relative w-full aspect-[4/3] max-h-[380px] bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => {
            videoRef.current?.play().catch(() => {})
            setIsCameraReady(true)
          }}
          onCanPlay={() => setIsCameraReady(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          } ${isCameraReady ? "opacity-100" : "opacity-0"}`}
        />

        {/* Inference overlay canvas */}
        <canvas
          ref={canvasOverlayRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          }`}
        />

        {/* Elegant Face Guide Oval Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`w-[60%] h-[78%] rounded-[50%/60%] border-2 border-dashed transition-all duration-300 flex items-center justify-center ${
              isCapturing
                ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse"
                : "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            }`}
          >
            {/* Crosshairs corner marks */}
            <div className="absolute top-2 w-8 h-[2px] bg-emerald-400/80 rounded" />
            <div className="absolute bottom-2 w-8 h-[2px] bg-emerald-400/80 rounded" />
          </div>
        </div>

        {/* Loading Spinner */}
        {!isCameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 gap-3">
            <div className="w-9 h-9 border-[3px] border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm font-medium tracking-wide">
              Starting camera...
            </span>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-slate-200 p-6 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold">
              !
            </div>
            <p className="text-sm font-semibold text-rose-300">{cameraError}</p>
            <button
              type="button"
              onClick={startCamera}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Camera switch toggle button */}
        {hasMultipleCameras && !cameraError && (
          <button
            type="button"
            onClick={() =>
              setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
            }
            className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-full backdrop-blur-md border border-slate-700/60 shadow-lg text-xs transition"
            title="Switch Camera"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isCapturing
                ? "bg-emerald-400 animate-ping"
                : isCameraReady
                  ? "bg-emerald-500"
                  : "bg-amber-500"
            }`}
          />
          <span className="text-xs font-medium text-slate-300">
            {statusMessage ||
              (isCameraReady ? "Detecting face..." : "Preparing camera...")}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wide uppercase">
          Anjana Connects
        </span>
      </div>
    </div>
  )
}
