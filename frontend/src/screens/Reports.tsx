import { Button, Icon, IconButton, Pill, ScreenTitle } from "../components/ui"

export default function Reports() {
  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Compliance & Analytics"
        action={<IconButton icon="download" label="Export all reports (ZIP)" />}
      >
        Agency Reports
      </ScreenTitle>

      <section className="section">
        <div className="section-heading">
          <h2>Operational & Financial Reports</h2>
          <Pill tone="neutral">September 2026</Pill>
        </div>
        <div className="activity-list">
          <article style={{ padding: "16px 4px" }}>
            <span className="activity-icon accent-soft">
              <Icon name="attendance" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <strong>Monthly Attendance Summary</strong>
              <p>Detailed daily check-in logs, biometric face verifications, and overtime reports.</p>
            </div>
            <Button variant="secondary" icon="download">
              Download CSV
            </Button>
          </article>

          <article style={{ padding: "16px 4px" }}>
            <span className="activity-icon success-soft">
              <Icon name="salary" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <strong>Payroll & Salary Register</strong>
              <p>Gross salary, attendance deductions, net payout totals, and bank transfer list.</p>
            </div>
            <Button variant="secondary" icon="download">
              Export PDF
            </Button>
          </article>

          <article style={{ padding: "16px 4px" }}>
            <span className="activity-icon warning-soft">
              <Icon name="shield" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <strong>Biometric Security & Access Audit</strong>
              <p>Owner login timestamps, IP verification events, and device session history.</p>
            </div>
            <Button variant="secondary" icon="download">
              Download Log
            </Button>
          </article>
        </div>
      </section>
    </main>
  )
}
