import { useState, useEffect } from "react"
import { Button, Field, Pill, ScreenTitle, Icon } from "../components/ui"
import { useAuth } from "../auth/AuthContext"
import { agencyApi } from "../services/api"

export default function Settings() {
  const { user } = useAuth()
  const [agencyName, setAgencyName] = useState<string>("")
  const [defaultCutoff, setDefaultCutoff] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadAgencySettings()
  }, [])

  async function loadAgencySettings() {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await agencyApi.getSettings()
      if (data.name) {
        setAgencyName(data.name)
      } else if (user?.agency_id) {
        setAgencyName(user.agency_id)
      }

      if (data.default_daily_cutoff !== null && data.default_daily_cutoff !== undefined) {
        setDefaultCutoff(data.default_daily_cutoff.toString())
      } else {
        setDefaultCutoff("")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load agency settings")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSaveSuccess(false)

    const trimmedName = agencyName.trim()
    if (!trimmedName) {
      setErrorMessage("Agency name cannot be empty.")
      return
    }

    let cutoffValue: number | null = null
    if (defaultCutoff.trim() !== "") {
      const num = parseFloat(defaultCutoff)
      if (isNaN(num) || num < 0) {
        setErrorMessage("Please enter a valid daily cutoff amount (₹ 0 or greater).")
        return
      }
      cutoffValue = num
    }

    setIsSaving(true)
    try {
      const updated = await agencyApi.updateSettings({
        name: trimmedName,
        default_daily_cutoff: cutoffValue,
      })
      if (updated.name) setAgencyName(updated.name)
      setDefaultCutoff(
        updated.default_daily_cutoff !== null && updated.default_daily_cutoff !== undefined
          ? updated.default_daily_cutoff.toString()
          : ""
      )
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save agency settings.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="screen">
      <ScreenTitle eyebrow="Agency Profile & Rules">Agency Settings</ScreenTitle>

      {/* Agency Identity & Payroll Rules Section */}
      <section
        className="section"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "22px",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--brand-primary)" }}>
              Agency Identity & Payroll Configuration
            </h2>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Configure your organization name and the agency-wide daily absence deduction cutoff.
            </p>
          </div>
          <Pill tone="accent">Tenant Settings</Pill>
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              background: "var(--status-absent-soft, #fceded)",
              border: "1px solid rgba(194, 65, 65, 0.25)",
              borderRadius: "var(--radius-sm, 8px)",
              color: "var(--status-absent, #c24141)",
              fontSize: "0.88rem",
            }}
          >
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              background: "var(--status-present-soft, #eaf4ed)",
              border: "1px solid rgba(63, 125, 88, 0.25)",
              borderRadius: "var(--radius-sm, 8px)",
              color: "var(--status-present, #3f7d58)",
              fontSize: "0.88rem",
              fontWeight: 500,
            }}
          >
            ✓ Agency settings updated and saved to database successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} style={{ marginTop: "20px", display: "grid", gap: "18px" }}>
          <div style={{ maxWidth: "520px" }}>
            <Field
              label="Agency Display Name"
              placeholder="e.g. Anjana Gas Agency"
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              disabled={isLoading || isSaving}
              required
            />
            <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              The legal or public operating name of this gas agency.
            </span>
          </div>

          <div style={{ maxWidth: "520px" }}>
            <Field
              label="Agency Default Daily Salary Cutoff (₹)"
              placeholder="e.g. 100 or 150 (Leave blank for ₹0)"
              type="number"
              min="0"
              step="any"
              value={defaultCutoff}
              onChange={(e) => setDefaultCutoff(e.target.value)}
              disabled={isLoading || isSaving}
            />
            <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Applied as the standard daily deduction for any employee who does not have an individual cutoff set.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Button variant="primary" type="submit" disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            {defaultCutoff !== "" && (
              <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                Active agency default: <strong style={{ color: "var(--brand-primary)" }}>₹{defaultCutoff} / absent day</strong>
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Cutoff Inheritance & Salary Calculation Hierarchy */}
      <section
        className="section"
        style={{
          marginTop: "20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "22px",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div className="section-heading" style={{ marginBottom: "10px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--brand-primary)" }}>
            Salary Cutoff Inheritance Hierarchy
          </h2>
          <Pill tone="neutral">Payroll Rules</Pill>
        </div>
        <p style={{ margin: "0 0 16px 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
          Deductions are calculated per absent day in the current month using the following strict priority:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md, 10px)",
              background: "var(--surface-muted, #f8fafc)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span
                style={{
                  background: "var(--brand-blue, #1976d2)",
                  color: "#fff",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <strong style={{ fontSize: "0.92rem", color: "var(--brand-primary)" }}>Individual Override</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              If an employee profile has an explicit daily cutoff (e.g. ₹200), that exact amount is deducted for each absent day.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md, 10px)",
              background: "var(--surface-muted, #f8fafc)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span
                style={{
                  background: "var(--status-present, #3f7d58)",
                  color: "#fff",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                2
              </span>
              <strong style={{ fontSize: "0.92rem", color: "var(--brand-primary)" }}>Agency Default</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              If an employee has no individual cutoff (value is null), the agency default cutoff ({defaultCutoff ? `₹${defaultCutoff}` : "₹0"}) applies automatically.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md, 10px)",
              background: "var(--surface-muted, #f8fafc)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span
                style={{
                  background: "var(--status-leave, #b7791f)",
                  color: "#fff",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                3
              </span>
              <strong style={{ fontSize: "0.92rem", color: "var(--brand-primary)" }}>Unmarked Days Rule</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              Unmarked days are never treated as absences and never incur salary deductions. Deductions only apply to explicitly recorded absences.
            </p>
          </div>
        </div>
      </section>

      {/* Account Profile Section */}
      <section
        className="section"
        style={{
          marginTop: "20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "22px",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div className="section-heading">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--brand-primary)" }}>
            Administrative Account
          </h2>
          <Pill tone="accent">Authenticated User</Pill>
        </div>
        <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          <Field label="Administrator Name" value={user?.name || "—"} readOnly />
          <Field label="Administrator Email" value={user?.email || "—"} readOnly />
          <div className="form-grid">
            <Field label="Agency Identifier" value={user?.agency_id || "—"} readOnly />
            <Field label="System Access Role" value={user?.role === "owner" ? "Agency Owner (Full Privileges)" : "Staff Manager"} readOnly />
          </div>
        </div>
      </section>

      {/* Biometric & System Verification Standard */}
      <section
        className="section"
        style={{
          marginTop: "20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "22px",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div className="section-heading">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--brand-primary)" }}>
            Biometric & Anti-Spoofing Policy
          </h2>
          <Pill tone="neutral">Production Standard</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "14px" }}>
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md, 10px)",
              background: "var(--surface-muted, #f8fafc)",
              border: "1px solid var(--border)",
            }}
          >
            <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", color: "var(--brand-primary)" }}>
              <Icon name="shield" size={17} /> YuNet + SFace Biometric Pipeline
            </strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              5-point facial landmark normalization with 128-dimensional embedding vectors matched via cosine similarity (threshold 0.363).
            </p>
          </div>
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-md, 10px)",
              background: "var(--surface-muted, #f8fafc)",
              border: "1px solid var(--border)",
            }}
          >
            <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", color: "var(--brand-primary)" }}>
              <Icon name="check" size={17} /> Multi-Cue Liveness Protection
            </strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              Active detection of printed photos and screen replays using multi-frame micro-motion, temporal blink tracking, and texture variance.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
