import { useState } from "react"
import { Button, Icon, IconName, Logo, Sheet } from "./components/ui"
import Attendance from "./screens/Attendance"
import Home from "./screens/Home"
import Login from "./screens/Login"
import Salary from "./screens/Salary"
import Staff from "./screens/Staff"

type Page = "home" | "staff" | "attendance" | "salary" | "staff-add" | "attendance-manual"

const nav: { id: Page; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "staff", label: "Staff", icon: "staff" },
  { id: "attendance", label: "Attendance", icon: "attendance" },
  { id: "salary", label: "Salary", icon: "salary" },
]

export default function App() {
  const [loggedIn, setLoggedIn] = useState(true)
  const [page, setPage] = useState<Page>("home")
  const [profile, setProfile] = useState(false)
  const activePage =
    page === "staff-add"
      ? "staff"
      : page === "attendance-manual"
        ? "attendance"
        : page

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Logo />
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? "active" : ""}
              onClick={() => setPage(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setProfile(true)}>
            <span className="owner-avatar">AN</span>
            <span>
              <strong>Anjana</strong>
              <small>Agency owner</small>
            </span>
            <Icon name="more" />
          </button>
        </div>
      </aside>
      <div className="mobile-brand">
        <Logo />
        <button className="owner-avatar" onClick={() => setProfile(true)}>
          AN
        </button>
      </div>
      <div className="content">
        {page === "home" && (
          <Home
            onNavigate={(next) => setPage(next as Page)}
            onProfile={() => setProfile(true)}
          />
        )}
        {(page === "staff" || page === "staff-add") && (
          <Staff key={page} initialAdd={page === "staff-add"} />
        )}
        {(page === "attendance" || page === "attendance-manual") && (
          <Attendance key={page} initialManual={page === "attendance-manual"} />
        )}
        {page === "salary" && <Salary />}
      </div>
      <nav className="bottom-nav">
        {nav.map((item) => (
          <button
            key={item.id}
            className={activePage === item.id ? "active" : ""}
            onClick={() => setPage(item.id)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {profile && (
        <Sheet onClose={() => setProfile(false)}>
          <div className="account-head">
            <span className="owner-avatar large">AN</span>
            <div>
              <h2>Anjana Gas Agency</h2>
              <p>Owner account</p>
            </div>
          </div>
          <div className="account-menu">
            <button>
              <span>
                <Icon name="report" />
              </span>
              <div>
                <strong>Reports</strong>
                <p>Attendance, salary and employee reports</p>
              </div>
              <Icon name="chevron" />
            </button>
            <button>
              <span>
                <Icon name="settings" />
              </span>
              <div>
                <strong>Agency settings</strong>
                <p>Rules, profile and admin account</p>
              </div>
              <Icon name="chevron" />
            </button>
            <button>
              <span>
                <Icon name="shield" />
              </span>
              <div>
                <strong>Security & audit log</strong>
                <p>Review important record changes</p>
              </div>
              <Icon name="chevron" />
            </button>
          </div>
          <Button
            variant="ghost"
            block
            icon="logout"
            onClick={() => {
              setProfile(false)
              setLoggedIn(false)
            }}
          >
            Sign out
          </Button>
        </Sheet>
      )}
    </div>
  )
}
