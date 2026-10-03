import { useState, useEffect } from "react"
import { Button, Field, Pill, ScreenTitle } from "../components/ui"
import { useAuth } from "../auth/AuthContext"
import { agencyApi } from "../services/api"

export default function Settings() {
  const { user } = useAuth()
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

  async function handleSaveCutoff(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSaveSuccess(false)

    const num = parseFloat(defaultCutoff)
    if (isNaN(num) || num < 0) {
      setErrorMessage("Please enter a valid daily cutoff amount (₹ 0 or greater).")
      return
    }

    setIsSaving(true)
    try {
      const updated = await agencyApi.updateSettings(num)
      setDefaultCutoff(updated.default_daily_cutoff !== null && updated.default_daily_cutoff !== undefined ? updated.default_daily_cutoff.toString() : "")
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save daily cutoff setting.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="screen">
      <ScreenTitle eyebrow="Agency Profile & Rules">Agency Settings</ScreenTitle>

      {/* Salary & Payroll Configuration Section */}
      <section className="section" style={{ border: "1px solid var(--primary-color, #10b981)", borderRadius: "12px", padding: "20px" }}>
        <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Agency Salary & Payroll Rules</h2>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted, #94a3b8)", fontSize: "0.88rem" }}>
              Configure agency-wide daily salary cutoffs used for live payroll calculations.
            </p>
          </div>
          <Pill tone="accent">Phase 7 Rule</Pill>
        </div>

        {errorMessage && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", fontSize: "0.88rem" }}>
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", borderRadius: "8px", color: "#10b981", fontSize: "0.88rem" }}>
            ✓ Agency default daily cutoff updated successfully!
          </div>
        )}

        <form onSubmit={handleSaveCutoff} style={{ marginTop: "16px" }}>
          <div style={{ maxWidth: "400px" }}>
            <Field
              label="Agency Default Daily Salary Cutoff (₹)"
              placeholder="e.g. 100 or 150"
              type="number"
              min="0"
              step="any"
              value={defaultCutoff}
              onChange={(e) => setDefaultCutoff(e.target.value)}
              disabled={isLoading || isSaving}
              required
            />
            <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", marginTop: "6px" }}>
              Applied as the daily absence deduction for all staff members who do NOT have an individual cutoff override.
            </span>
          </div>

          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Button variant="primary" type="submit" disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Default Cutoff"}
            </Button>
            {defaultCutoff !== "" && (
              <span style={{ fontSize: "0.88rem", color: "var(--text-muted, #94a3b8)" }}>
                Current effective default: <strong>₹{defaultCutoff} / day</strong>
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Account Profile Section */}
      <section className="section" style={{ marginTop: "28px" }}>
        <div className="section-heading">
          <h2>Administrative Account</h2>
          <Pill tone="accent">Verified Owner</Pill>
        </div>
        <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          <Field label="Owner Full Name" defaultValue={user?.name || "Anjana Devi"} readOnly />
          <Field label="Owner Email Address" defaultValue={user?.email || "owner@agency.in"} readOnly />
          <div className="form-grid">
            <Field label="Agency Identifier" defaultValue={user?.agency_id || "anjana_gas_agency"} readOnly />
            <Field label="System Access Role" defaultValue={user?.role === "owner" ? "Agency Owner (Full Privileges)" : "Staff Manager"} readOnly />
          </div>
        </div>
      </section>

      {/* HP Gas Agency Parameters */}
      <section className="section" style={{ marginTop: "28px" }}>
        <div className="section-heading">
          <h2>HP Gas Operations Parameters</h2>
        </div>
        <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
          <div className="form-grid">
            <Field label="HP Gas Distributor Code" defaultValue="HP-GAS-AGENCY-8812" />
            <Field label="Operating Shift Hours" defaultValue="09:00 AM - 06:00 PM" />
          </div>
          <div className="form-grid">
            <Field label="Grace Period for Late Check-in" defaultValue="15 Minutes" />
            <Field label="Half-day Threshold" defaultValue="After 01:30 PM" />
          </div>
        </div>
      </section>
    </main>
  )
}
