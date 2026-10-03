import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISS_KEY = "anjana_pwa_dismissed_at"
const DISMISS_DURATION_DAYS = 3

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://")

    if (isStandalone) {
      return
    }

    // 2. Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        return
      }
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleIos = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIos(isAppleIos)

    // 4. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // If on iOS and not standalone, show prompt after a short delay
    if (isAppleIos) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 2500)
      return () => {
        clearTimeout(timer)
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true)
      return
    }

    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setShowPrompt(false)
      }
    } catch {
      // Prompt error ignored
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setShowPrompt(false)
    setShowIosModal(false)
  }

  if (!showPrompt) return null

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <aside
        aria-label="Install mobile application"
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          right: "16px",
          maxWidth: "420px",
          margin: "0 auto",
          zIndex: 9999,
          animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "#ffffff",
            padding: "12px 14px",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 14px 40px rgba(18, 59, 114, 0.18), 0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          {/* App Icon */}
          <div
            style={{
              width: "44px",
              height: "44px",
              flexShrink: 0,
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #f1f5f9",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/logo.png"
              alt="Anjana Connects"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Text Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Install Anjana Connects
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                lineHeight: 1.3,
                marginTop: "2px",
              }}
            >
              {isIos
                ? "Add to home screen for faster biometric check-in"
                : "Install app for 1-tap staff & attendance access"}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#123B72",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                padding: "8px 12px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(18, 59, 114, 0.25)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install</span>
            </button>

            <button
              onClick={handleDismiss}
              title="Dismiss"
              aria-label="Dismiss installation prompt"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                padding: "6px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Safari Step-by-Step Modal */}
      {showIosModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "380px",
              background: "#ffffff",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              border: "1px solid #f1f5f9",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "12px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src="/logo.png"
                  alt="Logo"
                  style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "8px" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                    Install on iPhone / iPad
                  </div>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>
                    2 quick steps in Safari
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.4 }}>
                  <strong style={{ color: "#111827" }}>Step 1:</strong> Tap the{" "}
                  <strong style={{ color: "#2563eb" }}>Share</strong> button in the Safari toolbar at the bottom.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "#dcfce7",
                    color: "#15803d",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.4 }}>
                  <strong style={{ color: "#111827" }}>Step 2:</strong> Scroll down and tap{" "}
                  <strong style={{ color: "#16a34a" }}>&ldquo;Add to Home Screen&rdquo;</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              style={{
                width: "100%",
                background: "#123B72",
                color: "#ffffff",
                padding: "11px",
                borderRadius: "12px",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
