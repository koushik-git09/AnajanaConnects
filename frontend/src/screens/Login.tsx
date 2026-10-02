import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button, Field, Logo } from "../components/ui"
import { useAuth } from "../auth/AuthContext"
import { authApi } from "../services/api"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard"

  useEffect(() => {
    authApi
      .getStatus()
      .then((status) => {
        if (status.registration_allowed) {
          setNeedsSetup(true)
        }
      })
      .catch(() => {
        // Backend offline handling on submit
      })
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    if (!password) {
      setError("Please enter your password.")
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Invalid email or password. Please try again.")
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

      <form className="login-form" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">HP Gas Distributor Portal</p>
          <h1>Agency Sign In</h1>
          <p>Access your staff roster, daily attendance, and salary registers.</p>
        </div>

        {needsSetup && (
          <div
            style={{
              padding: "14px 16px",
              background: "var(--status-leave-soft)",
              border: "1px solid var(--status-leave)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              color: "var(--status-leave)",
              lineHeight: 1.45,
            }}
          >
            <strong>Initial setup required:</strong> No owner account exists yet.{" "}
            <Link
              to="/register"
              style={{
                color: "var(--brand-primary)",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Register initial owner
            </Link>
          </div>
        )}

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
          label="Email Address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="owner@agency.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/forgot-password" className="forgot">
            Forgot password?
          </Link>
          {needsSetup && (
            <Link to="/register" className="forgot" style={{ color: "var(--brand-blue)", fontWeight: 600 }}>
              First time? Register
            </Link>
          )}
        </div>

        <Button block type="submit" loading={loading}>
          {loading ? "Verifying Credentials…" : "Sign In Securely"}
        </Button>

        <p className="secure-note">
          Protected by agency biometric encryption and access audit logs.
        </p>
      </form>
    </main>
  )
}
