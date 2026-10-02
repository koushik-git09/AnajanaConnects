import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button, Field, Logo } from "../components/ui"
import { useAuth } from "../auth/AuthContext"
import { authApi } from "../services/api"

export default function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    authApi
      .getStatus()
      .then((status) => {
        if (!status.registration_allowed) {
          setIsLocked(true)
        }
      })
      .catch(() => {
        // Backend offline handled on submit
      })
      .finally(() => {
        setCheckingStatus(false)
      })
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Please enter the owner's full name.")
      return
    }

    if (!email.trim()) {
      setError("Please enter a valid email address.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate("/dashboard", { replace: true })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Registration could not be completed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <main className="login-screen" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p className="muted small">Checking setup status…</p>
      </main>
    )
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

      {isLocked ? (
        <div className="login-form">
          <div>
            <p className="eyebrow">Setup Protected</p>
            <h1>Owner Account Initialized</h1>
            <p>
              An agency owner account has already been registered for Anjana Connects.
              To protect agency data, public registration is locked.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              background: "var(--brand-blue-soft)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13.5px",
              color: "var(--text-primary)",
              lineHeight: 1.5,
            }}
          >
            Please sign in with the registered owner credentials to manage staff, view attendance, and execute payroll.
          </div>

          <Link to="/login" style={{ textDecoration: "none" }}>
            <Button block type="button">
              Return to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Initial Setup</p>
            <h1>Register Agency Owner</h1>
            <p>Create the primary administrative account to manage your HP gas agency.</p>
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
            label="Full Name"
            placeholder="e.g. Anjana Devi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Field
            label="Email Address"
            type="email"
            placeholder="owner@agency.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Field
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Field
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button block type="submit" loading={loading}>
            {loading ? "Creating Owner Profile…" : "Register Owner Account"}
          </Button>

          <p className="secure-note" style={{ textAlign: "center" }}>
            Already have an owner account?{" "}
            <Link to="/login" style={{ color: "var(--brand-blue)", fontWeight: 700 }}>
              Sign In
            </Link>
          </p>
        </form>
      )}
    </main>
  )
}
