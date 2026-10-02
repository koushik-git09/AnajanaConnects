import { useNavigate, useOutletContext } from "react-router-dom"
import { Button, Icon, IconButton, LivePulse } from "../components/ui"
import { useAuth } from "../auth/AuthContext"

export default function Home({
  onNavigate,
  onProfile,
}: {
  onNavigate?: (page: string) => void
  onProfile?: () => void
} = {}) {
  const navigate = useNavigate()
  const outlet = useOutletContext<{ onProfile?: () => void } | null>()
  const { user } = useAuth()

  const handleNavigate = (actionOrTarget: string) => {
    if (onNavigate) {
      onNavigate(actionOrTarget)
      return
    }
    if (actionOrTarget === "staff" || actionOrTarget === "staff-add") {
      navigate("/staff")
    } else if (actionOrTarget === "attendance" || actionOrTarget === "attendance-manual") {
      navigate("/attendance")
    } else if (actionOrTarget === "salary") {
      navigate("/salary")
    } else {
      navigate(`/${actionOrTarget}`)
    }
  }

  const handleProfile = () => {
    if (onProfile) {
      onProfile()
    } else if (outlet?.onProfile) {
      outlet.onProfile()
    }
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "Owner"
  const initials = (user?.name || "Anjana")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <main className="screen home-screen">
      {/* Top Header Bar */}
      <header className="topbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span className="muted small">{todayFormatted}</span>
            <LivePulse label="Agency Live" />
          </div>
          <p className="greeting">Good morning, {firstName}</p>
        </div>
        <div className="top-actions">
          <IconButton icon="bell" label="Operational Notifications" />
          <button
            className="owner-avatar"
            aria-label="Open profile settings"
            onClick={handleProfile}
            type="button"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Hero Command Center Card */}
      <section className="hero-attendance">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">
              <Icon name="flame" size={14} />
              Today’s Operational Roster
            </p>
            <h2>21 of 25 staff on duty</h2>
          </div>
          <div className="attendance-ring" title="84% attendance rate today">
            <strong>84%</strong>
          </div>
        </div>

        <div className="status-grid">
          <div>
            <span className="status-dot success" />
            <strong>21</strong>
            <p>Present</p>
          </div>
          <div>
            <span className="status-dot danger" />
            <strong>3</strong>
            <p>Absent</p>
          </div>
          <div>
            <span className="status-dot warning" />
            <strong>1</strong>
            <p>On Leave</p>
          </div>
        </div>

        <Button
          block
          icon="attendance"
          onClick={() => handleNavigate("attendance")}
        >
          Open Attendance Register
        </Button>
      </section>

      {/* Quick Actions Hub */}
      <section className="section">
        <div className="section-heading">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-grid">
          <button onClick={() => handleNavigate("staff-add")} type="button">
            <span className="quick-icon">
              <Icon name="plus" />
            </span>
            <span>Add New Staff</span>
            <Icon name="chevron" size={16} />
          </button>
          <button onClick={() => handleNavigate("attendance-manual")} type="button">
            <span className="quick-icon">
              <Icon name="edit" />
            </span>
            <span>Mark Manually</span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </section>

      {/* Current Month Payroll Snapshot */}
      <section className="section month-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current Payroll Cycle</p>
            <h2>September 2026 Overview</h2>
          </div>
          <button className="text-action" onClick={() => handleNavigate("salary")} type="button">
            View full payroll <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="money-row">
          <div>
            <p>Net Salary Payable</p>
            <strong>₹2,22,500</strong>
          </div>
          <div>
            <p>Absence Deductions</p>
            <strong>₹12,500</strong>
          </div>
        </div>
        <div className="progress">
          <span />
        </div>
        <p className="progress-copy">
          <span>Roster attendance verified for payout</span>
          <strong>25 Staff Calculated</strong>
        </p>
      </section>

      {/* Live Operational Activity */}
      <section className="section activity-section">
        <div className="section-heading">
          <h2>Recent Activity</h2>
          <button className="text-action" onClick={() => handleNavigate("reports")} type="button">
            View all logs
          </button>
        </div>
        <div className="activity-list">
          <article>
            <span className="activity-icon success-soft">
              <Icon name="check" size={17} />
            </span>
            <div>
              <strong>Ravi Kumar verified & checked in</strong>
              <p>Biometric face recognition · 09:05 AM</p>
            </div>
          </article>
          <article>
            <span className="activity-icon accent-soft">
              <Icon name="report" size={17} />
            </span>
            <div>
              <strong>Monthly salary register drafted</strong>
              <p>September 2026 payroll · Yesterday at 06:30 PM</p>
            </div>
          </article>
          <article>
            <span className="activity-icon warning-soft">
              <Icon name="edit" size={17} />
            </span>
            <div>
              <strong>Manual attendance adjustment recorded</strong>
              <p>Kumar S marked half-day · 27 September</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
