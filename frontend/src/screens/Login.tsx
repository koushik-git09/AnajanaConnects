import { useState } from "react"
import { Button, Field, Logo } from "../components/ui"

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <main className="login-screen">
      <div className="login-art">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <div className="login-brand">
          <Logo />
          <p>Smart staff & salary management</p>
        </div>
      </div>
      <form
        className="login-form"
        onSubmit={(event) => {
          event.preventDefault()
          setLoading(true)
          window.setTimeout(onLogin, 500)
        }}
      >
        <div>
          <p className="eyebrow">Anjana Gas Agency</p>
          <h1>Welcome back</h1>
          <p>Sign in to manage your team for today.</p>
        </div>
        <Field label="Email or phone" defaultValue="anjana@agency.in" />
        <Field label="Password" type="password" defaultValue="password" />
        <button className="forgot" type="button">
          Forgot password?
        </button>
        <Button block type="submit">
          {loading ? "Signing in…" : "Login securely"}
        </Button>
        <p className="secure-note">
          Your agency information stays private and secure.
        </p>
      </form>
    </main>
  )
}
