import { useEffect, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { Button, Icon, IconButton, LivePulse } from "../components/ui"
import { useAuth } from "../auth/AuthContext"
import { type DashboardSummaryResponse, dashboardApi } from "../services/api"

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

  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await dashboardApi.getSummary()
      setDashboard(data)
    } catch (err: any) {
      setError(err?.message || "Failed to load real-time dashboard data.")
    } finally {
      setLoading(false)
    }
  }

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
    } else if (actionOrTarget === "reports") {
      navigate("/reports")
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

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })

  const formatActivityTime = (isoString?: string | null, fallbackDate?: string): string => {
    if (!isoString) return fallbackDate || "Today"
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
    } catch {
      return fallbackDate || "Today"
    }
  }

  return (
    <main className="screen home-screen">
      {/* Top Header Bar */}
      <header className="topbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span className="muted small">{todayFormatted}</span>
            <LivePulse label="Agency Live" />
          </div>
          <p className="greeting">
            Good morning, {firstName}
            {dashboard?.agency_name && dashboard.agency_name !== user?.agency_id && (
              <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "8px" }}>
                · {dashboard.agency_name}
              </span>
            )}
          </p>
        </div>
        <div className="top-actions">
          <IconButton
            icon="download"
            label="Refresh Dashboard"
            onClick={loadDashboard}
          />
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

      {/* Error alert with retry */}
      {error && (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid #ef4444",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ef4444",
            fontSize: "0.9rem",
          }}
        >
          <span>{error}</span>
          <Button variant="secondary" onClick={loadDashboard}>
            Retry
          </Button>
        </div>
      )}

      {/* Hero Command Center Card */}
      <section className="hero-attendance">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">
              <Icon name="flame" size={14} />
              Today’s Operational Roster
            </p>
            <h2>
              {loading
                ? "Loading staff roster..."
                : dashboard
                  ? `${dashboard.today_attendance.present} of ${dashboard.today_attendance.total_employees} staff on duty`
                  : "Operational Roster"}
            </h2>
          </div>
          <div
            className="attendance-ring"
            title={
              dashboard
                ? `${dashboard.today_attendance.attendance_percentage}% attendance rate today`
                : "Today's attendance"
            }
          >
            <strong>
              {loading
                ? "—"
                : dashboard
                  ? `${Math.round(dashboard.today_attendance.attendance_percentage)}%`
                  : "0%"}
            </strong>
          </div>
        </div>

        <div className="status-grid">
          <div>
            <span className="status-dot success" />
            <strong>{loading ? "—" : dashboard?.today_attendance.present ?? 0}</strong>
            <p>Present</p>
          </div>
          <div>
            <span className="status-dot danger" />
            <strong>{loading ? "—" : dashboard?.today_attendance.absent ?? 0}</strong>
            <p>Absent</p>
          </div>
          <div>
            <span className="status-dot neutral" style={{ background: "var(--text-muted)" }} />
            <strong>{loading ? "—" : dashboard?.today_attendance.unmarked ?? 0}</strong>
            <p>Unmarked</p>
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
          <button onClick={() => handleNavigate("reports")} type="button">
            <span className="quick-icon">
              <Icon name="report" />
            </span>
            <span>Compliance Reports</span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </section>

      {/* Current Month Payroll Snapshot — Zero Mock Data */}
      <section className="section month-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current Payroll Cycle</p>
            <h2>
              {loading
                ? "Loading cycle overview..."
                : dashboard
                  ? `${dashboard.payroll.month_name} ${dashboard.payroll.year} Overview`
                  : "Payroll Overview"}
            </h2>
          </div>
          <button className="text-action" onClick={() => handleNavigate("salary")} type="button">
            View full payroll <Icon name="arrow" size={15} />
          </button>
        </div>

        <div className="money-row">
          <div>
            <p>Net Salary Payable</p>
            <strong>
              {loading
                ? "—"
                : `₹${(dashboard?.payroll.total_net_payable ?? 0).toLocaleString("en-IN")}`}
            </strong>
          </div>
          <div>
            <p>Absence Deductions</p>
            <strong style={{ color: "var(--status-absent, #ef4444)" }}>
              {loading
                ? "—"
                : `₹${(dashboard?.payroll.total_absence_deduction ?? 0).toLocaleString("en-IN")}`}
            </strong>
          </div>
        </div>

        <div className="progress">
          <span
            style={{
              width: `${Math.min(100, Math.max(0, dashboard?.month_attendance.overall_attendance_percentage ?? 0))}%`,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        <p className="progress-copy">
          <span>
            {loading
              ? "Calculating month-to-date attendance..."
              : `${dashboard?.month_attendance.overall_attendance_percentage ?? 0}% verified monthly attendance rate`}
          </span>
          <strong>
            {loading
              ? "—"
              : `${dashboard?.payroll.total_employees ?? 0} Staff Calculated`}
          </strong>
        </p>
      </section>

      {/* Live Operational Activity — Real MongoDB Data */}
      <section className="section activity-section">
        <div className="section-heading">
          <h2>Recent Activity</h2>
          <button className="text-action" onClick={() => handleNavigate("reports")} type="button">
            View all logs
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading recent operational logs...
          </div>
        ) : dashboard && dashboard.recent_activity.length > 0 ? (
          <div className="activity-list">
            {dashboard.recent_activity.map((item) => {
              const isPresent = item.status === "present"
              return (
                <article key={item.id}>
                  <span
                    className={`activity-icon ${
                      isPresent ? "success-soft" : "warning-soft"
                    }`}
                  >
                    <Icon name={isPresent ? "check" : "edit"} size={17} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>
                      {item.employee_name} ({item.employee_code})
                    </strong>
                    <p>
                      {item.method === "face"
                        ? "Biometric face recognition check-in"
                        : `Attendance marked ${item.status}`}
                      {" · "}
                      {formatActivityTime(item.marked_at, item.date)}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              background: "var(--surface-subtle, rgba(255,255,255,0.03))",
              borderRadius: "12px",
              color: "var(--text-muted)",
              fontSize: "0.88rem",
            }}
          >
            No attendance records logged yet for this period. Mark attendance via the Camera or Attendance Register to see live activity.
          </div>
        )}
      </section>
    </main>
  )
}
