import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Button, Field, Icon, Logo } from "../components/ui"
import { authApi } from "../services/api"

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isTokenInvalid, setIsTokenInvalid] = useState(!token.trim())

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!token.trim()) {
      setIsTokenInvalid(true)
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token.trim(), newPassword)
      setSuccess(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
        // If the server rejected token validity, flag it for the user
        if (
          err.message.toLowerCase().includes("invalid") ||
          err.message.toLowerCase().includes("expired")
        ) {
          setIsTokenInvalid(true)
        }
      } else {
        setError("Unable to reset password. The link may be expired.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-art">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <div className="login-brand">
          <Logo size="lg" />
          <p>Staff, Attendance & Payroll Management Portal</p>
        </div>
      </div>

      <div className="login-form">
        {isTokenInvalid && !success ? (
          <div style={{ display: "grid", gap: "20px", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto",
                borderRadius: "50%",
                background: "var(--status-absent-soft)",
                color: "var(--status-absent)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="shield" size={26} />
            </div>
            <div>
              <p className="eyebrow" style={{ color: "var(--status-absent)" }}>
                Security Verification
              </p>
              <h1>Reset Link Invalid or Expired</h1>
              <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {error || "This password reset link is invalid, has expired, or has already been used."}
              </p>
            </div>

            <div style={{ display: "grid", gap: "10px", marginTop: "8px" }}>
              <Link to="/forgot-password" style={{ textDecoration: "none" }}>
                <Button block>
                  Request a New Reset Link
                </Button>
              </Link>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button block variant="secondary">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : !success ? (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
            <div>
              <p className="eyebrow">Credentials Update</p>
              <h1>Create a new password</h1>
              <p>
                Enter a strong password for your agency owner account.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: "12px 16px",
                  background: "var(--status-absent-soft)",
                  border: "1px solid var(--status-absent)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "13px",
                  color: "var(--status-absent)",
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ position: "relative" }}>
              <Field
                label="New Password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "33px",
                  border: 0,
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <Field
              label="Confirm New Password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div
              style={{
                padding: "12px 14px",
                background: "var(--surface-muted)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "grid",
                gap: "4px",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Password Guidelines:</span>
              <span style={{ color: newPassword.length >= 8 ? "var(--status-present)" : "inherit" }}>
                • At least 8 characters long {newPassword.length >= 8 && "✓"}
              </span>
              <span style={{ color: confirmPassword && newPassword === confirmPassword ? "var(--status-present)" : "inherit" }}>
                • Passwords match {confirmPassword && newPassword === confirmPassword && "✓"}
              </span>
            </div>

            <Button block type="submit" loading={loading}>
              {loading ? "Resetting Password…" : "Reset Password"}
            </Button>

            <div style={{ textAlign: "center", marginTop: "4px" }}>
              <Link
                to="/login"
                style={{
                  color: "var(--brand-blue)",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Cancel & Return to Login
              </Link>
            </div>
          </form>
        ) : (
          <div style={{ display: "grid", gap: "20px", textAlign: "center" }}>
            <span className="success-mark">
              <Icon name="check" size={32} />
            </span>
            <div>
              <p className="eyebrow" style={{ color: "var(--status-present)" }}>
                Security Updated
              </p>
              <h1>Password Updated Successfully</h1>
              <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                Your account password has been securely updated. You can now sign in with your new credentials.
              </p>
            </div>

            <div style={{ marginTop: "8px" }}>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button block>
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        <p className="secure-note">
          Protected by Anjana Connects security verification.
        </p>
      </div>
    </main>
  )
}
