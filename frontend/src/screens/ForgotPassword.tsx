import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Button, Field, Icon, Logo } from "../components/ui"
import { authApi } from "../services/api"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError("Please enter your registered email address.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    setLoading(true)
    try {
      await authApi.forgotPassword(trimmedEmail)
      setSubmitted(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Unable to process request. Please try again.")
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
        {!submitted ? (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
            <div>
              <p className="eyebrow">Account Recovery</p>
              <h1>Forgot your password?</h1>
              <p>
                Enter your registered agency email address and we'll send you a secure password reset link.
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

            <Field
              label="Registered Email Address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="owner@agency.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button block type="submit" loading={loading}>
              {loading ? "Sending Reset Link…" : "Send Reset Link"}
            </Button>

            <div style={{ textAlign: "center", marginTop: "4px" }}>
              <Link
                to="/login"
                style={{
                  color: "var(--brand-blue)",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Icon name="arrow" size={14} />
                <span>Back to Login</span>
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
                Email Dispatched
              </p>
              <h1>Check your email</h1>
              <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                If an account exists for <strong>{email}</strong>, we've sent an email with a secure link to reset your password.
              </p>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                The link expires in 15 minutes. Check your spam folder if it doesn't appear shortly.
              </p>
            </div>

            <div style={{ display: "grid", gap: "10px", marginTop: "8px" }}>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button block variant="secondary">
                  Back to Login
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false)
                  setError(null)
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--brand-blue)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Didn't receive? Try another email
              </button>
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
