import { Button, Icon, IconButton, ScreenTitle } from "../components/ui"

export default function Home({
  onNavigate,
  onProfile,
}: {
  onNavigate: (page: string) => void
  onProfile: () => void
}) {
  return (
    <main className="screen home-screen">
      <header className="topbar">
        <div>
          <p className="muted small">Monday, 28 September</p>
          <p className="greeting">Good morning, Anjana</p>
        </div>
        <div className="top-actions">
          <IconButton icon="bell" label="Notifications" />
          <button
            className="owner-avatar"
            aria-label="Open profile"
            onClick={onProfile}
          >
            AN
          </button>
        </div>
      </header>

      <section className="hero-attendance">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">Today’s attendance</p>
            <h2>21 of 25 staff are in</h2>
          </div>
          <span className="attendance-ring">
            <strong>84%</strong>
          </span>
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
            <p>On leave</p>
          </div>
        </div>
        <Button block icon="camera" onClick={() => onNavigate("attendance")}>
          Take attendance
        </Button>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Quick actions</h2>
        </div>
        <div className="quick-grid">
          <button onClick={() => onNavigate("staff-add")}>
            <span className="quick-icon">
              <Icon name="plus" />
            </span>
            <span>Add staff</span>
            <Icon name="chevron" size={16} />
          </button>
          <button onClick={() => onNavigate("attendance-manual")}>
            <span className="quick-icon">
              <Icon name="edit" />
            </span>
            <span>Mark manually</span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </section>

      <section className="section month-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">September 2026</p>
            <h2>This month</h2>
          </div>
          <button className="text-action" onClick={() => onNavigate("salary")}>
            View salary <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="money-row">
          <div>
            <p>Salary payable</p>
            <strong>₹2,22,500</strong>
          </div>
          <div>
            <p>Deductions</p>
            <strong>₹12,500</strong>
          </div>
        </div>
        <div className="progress">
          <span />
        </div>
        <p className="progress-copy">
          <span>Payroll ready to review</span>
          <strong>25 employees</strong>
        </p>
      </section>

      <section className="section activity-section">
        <div className="section-heading">
          <h2>Recent activity</h2>
          <button className="text-action">View all</button>
        </div>
        <div className="activity-list">
          <article>
            <span className="activity-icon success-soft">
              <Icon name="check" size={17} />
            </span>
            <div>
              <strong>Ravi Kumar checked in</strong>
              <p>Face attendance · 09:05 AM</p>
            </div>
          </article>
          <article>
            <span className="activity-icon accent-soft">
              <Icon name="report" size={17} />
            </span>
            <div>
              <strong>Salary report generated</strong>
              <p>September 2026 · Yesterday</p>
            </div>
          </article>
          <article>
            <span className="activity-icon warning-soft">
              <Icon name="edit" size={17} />
            </span>
            <div>
              <strong>Attendance was corrected</strong>
              <p>Kumar S · 27 September</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
