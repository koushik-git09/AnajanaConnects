import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { Button, Icon, type IconName, Logo, Sheet } from "./ui"
import { useAuth } from "../auth/AuthContext"

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: "home" },
  { to: "/staff", label: "Staff", icon: "staff" },
  { to: "/attendance", label: "Attendance", icon: "attendance" },
  { to: "/salary", label: "Salary", icon: "salary" },
]

export default function Layout() {
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    setProfileOpen(false)
    await logout()
    navigate("/login", { replace: true })
  }

  const userInitials = (user?.name || "Anjana")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      {/* Desktop Sidebar Navigation */}
      <aside className="desktop-sidebar">
        <Logo size="md" />
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            onClick={() => setProfileOpen(true)}
            type="button"
            aria-label="User account profile"
          >
            <span className="owner-avatar">{userInitials}</span>
            <span>
              <strong>{user?.name || "Agency Owner"}</strong>
              <small>{user?.role === "owner" ? "HP Gas Distributor" : "Staff Administrator"}</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile Top Brand Bar */}
      <header className="mobile-brand">
        <Logo size="sm" />
        <button
          className="owner-avatar"
          onClick={() => setProfileOpen(true)}
          type="button"
          aria-label="Open profile settings"
        >
          {userInitials}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="content">
        <Outlet context={{ onProfile: () => setProfileOpen(true) }} />
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile & Agency Drawer */}
      {profileOpen && (
        <Sheet onClose={() => setProfileOpen(false)}>
          <div className="account-head">
            <span className="owner-avatar large">{userInitials}</span>
            <div>
              <h2>{user?.name || "Anjana Gas Agency"}</h2>
              <p>{user?.email || "owner@agency.in"}</p>
            </div>
          </div>
          <div className="account-menu">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false)
                navigate("/reports")
              }}
            >
              <span>
                <Icon name="report" />
              </span>
              <div>
                <strong>Operational Reports</strong>
                <p>Attendance logs, payroll summaries, and registers</p>
              </div>
              <Icon name="chevron" size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false)
                navigate("/settings")
              }}
            >
              <span>
                <Icon name="settings" />
              </span>
              <div>
                <strong>Agency Settings</strong>
                <p>Agency identity, salary rules, and profile</p>
              </div>
              <Icon name="chevron" size={16} />
            </button>
          </div>
          <Button
            variant="ghost"
            block
            icon="logout"
            onClick={handleSignOut}
            style={{ color: "var(--brand-red)", marginTop: "12px" }}
          >
            Sign out of agency portal
          </Button>
        </Sheet>
      )}
    </div>
  )
}
