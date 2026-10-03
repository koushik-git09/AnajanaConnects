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
      <section className="section" style={{ border: "1px solid var(--border, #334155)", borderRadius: "12px", padding: "20px" }}>
        <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Agency Identity & Payroll Configuration</h2>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted, #94a3b8)", fontSize: "0.88rem" }}>
              Configure your organization name and the agency-wide daily absence deduction cutoff.
            </p>
          </div>
          <Pill tone="accent">Tenant Settings</Pill>
        </div>

        {errorMessage && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", fontSize: "0.88rem" }}>
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "8px", color: "#10b981", fontSize: "0.88rem" }}>
            ✓ Agency settings updated and saved to database successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} style={{ marginTop: "18px", display: "grid", gap: "18px" }}>
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
            <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", marginTop: "4px" }}>
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
            <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", marginTop: "4px" }}>
              Applied as the standard daily deduction for any employee who does not have an individual cutoff set.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Button variant="primary" type="submit" disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            {defaultCutoff !== "" && (
              <span style={{ fontSize: "0.88rem", color: "var(--text-muted, #94a3b8)" }}>
                Active agency default: <strong>₹{defaultCutoff} / absent day</strong>
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Cutoff Inheritance & Salary Calculation Hierarchy */}
      <section className="section" style={{ marginTop: "24px", background: "rgba(30, 41, 59, 0.4)", borderRadius: "12px", padding: "20px" }}>
        <div className="section-heading" style={{ marginBottom: "12px" }}>
          <h2>Salary Cutoff Inheritance Hierarchy</h2>
          <Pill tone="neutral">Payroll Rules</Pill>
        </div>
        <p style={{ margin: "0 0 16px 0", color: "var(--text-muted, #94a3b8)", fontSize: "0.88rem" }}>
          Deductions are calculated per absent day in the current month using the following strict priority:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border, #334155)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ background: "#6366f1", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>1</span>
              <strong style={{ fontSize: "0.92rem" }}>Individual Override</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted, #94a3b8)" }}>
              If an employee profile has an explicit daily cutoff (e.g. ₹200), that exact amount is deducted for each absent day.
            </p>
          </div>

          <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border, #334155)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ background: "#10b981", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>2</span>
              <strong style={{ fontSize: "0.92rem" }}>Agency Default</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted, #94a3b8)" }}>
              If an employee has no individual cutoff (value is null), the agency default cutoff ({defaultCutoff ? `₹${defaultCutoff}` : "₹0"}) applies automatically.
            </p>
          </div>

          <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border, #334155)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ background: "#f59e0b", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>3</span>
              <strong style={{ fontSize: "0.92rem" }}>Unmarked Days Rule</strong>
            </div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted, #94a3b8)" }}>
              Unmarked days are never treated as absences and never incur salary deductions. Deductions only apply to explicitly recorded absences.
            </p>
          </div>
        </div>
      </section>

      {/* Account Profile Section */}
      <section className="section" style={{ marginTop: "24px" }}>
        <div className="section-heading">
          <h2>Administrative Account</h2>
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
      <section className="section" style={{ marginTop: "24px" }}>
        <div className="section-heading">
          <h2>Biometric & Anti-Spoofing Policy</h2>
          <Pill tone="neutral">Production Standard</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", marginTop: "14px" }}>
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border, #334155)" }}>
            <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", color: "var(--text, #f8fafc)" }}>
              <Icon name="shield" size={16} /> YuNet + SFace Biometric Pipeline
            </strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted, #94a3b8)" }}>
              5-point facial landmark normalization with 128-dimensional embedding vectors matched via cosine similarity (threshold 0.363).
            </p>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border, #334155)" }}>
            <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", color: "var(--text, #f8fafc)" }}>
              <Icon name="check" size={16} /> Multi-Cue Liveness Protection
            </strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted, #94a3b8)" }}>
              Active detection of printed photos and screen replays using multi-frame micro-motion, temporal blink tracking, and texture variance.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
