import { Button, Field, Pill, ScreenTitle } from "../components/ui"
import { useAuth } from "../auth/AuthContext"

export default function Settings() {
  const { user } = useAuth()

  return (
    <main className="screen">
      <ScreenTitle eyebrow="Agency Profile & Rules">Agency Settings</ScreenTitle>

      {/* Account Profile Section */}
      <section className="section">
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
          <div style={{ marginTop: "8px" }}>
            <Button variant="primary">
              Save Agency Parameters
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
