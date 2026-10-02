import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
} from "react"

export type IconName =
  | "home"
  | "staff"
  | "attendance"
  | "salary"
  | "plus"
  | "camera"
  | "search"
  | "arrow"
  | "bell"
  | "more"
  | "calendar"
  | "clock"
  | "check"
  | "edit"
  | "download"
  | "report"
  | "settings"
  | "shield"
  | "chevron"
  | "phone"
  | "briefcase"
  | "logout"
  | "flame"

const iconPaths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" />
    </>
  ),
  staff: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4M16 2v4M3 9h18M8 14l2.2 2.2L16 12" />
    </>
  ),
  salary: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M7 10h10M8 15h3M16 14v3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  camera: (
    <>
      <path d="M14.5 5 13 3h-2L9.5 5H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3h-4.5Z" />
      <circle cx="12" cy="12.5" r="4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  edit: (
    <>
      <path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </>
  ),
  report: (
    <>
      <path d="M6 3h9l4 4v14H6zM15 3v5h4M9 13h6M9 17h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  phone: (
    <path d="M5 3h4l2 5-2.5 1.5a15 15 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2C10.2 20.5 3.5 13.8 3 5a2 2 0 0 1 2-2Z" />
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  flame: (
    <>
      <path d="M8.5 14.5A4.5 4.5 0 0 0 13 19a4.5 4.5 0 0 0 4.5-4.5c0-2-1.5-3.5-2.5-4.5-.5-.5-1-1.5-1-2.5 0-.5.2-1 .5-1.5-1.5.5-3 2-3 4 0 .5.2 1 .5 1.5-1 0-3-1-3-3 0-.5.1-1 .3-1.5C7.5 8 6 10 6 12.5c0 .7.1 1.4.5 2z" />
    </>
  ),
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  )
}

export function Logo({
  compact = false,
  size = "md",
}: {
  compact?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const imgSizes = {
    sm: "32px",
    md: "40px",
    lg: "54px",
  }

  return (
    <div className="brand">
      <img
        src="/logo.png"
        alt="Anjana Connects HP Gas Agency"
        className="brand-logo-img"
        style={{ width: imgSizes[size], height: imgSizes[size] }}
      />
      {!compact && (
        <div className="brand-text">
          <span className="brand-name">
            Anjana <span>Connects</span>
          </span>
          <span className="brand-subtitle">HP Gas Agency</span>
        </div>
      )}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "soft"
  icon?: IconName
  block?: boolean
  loading?: boolean
}

export function Button({
  variant = "primary",
  icon,
  block,
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${block ? "btn-block" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: "16px",
            height: "16px",
            border: "2px solid currentColor",
            borderRightColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "shimmer 0.75s infinite linear",
          }}
        />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}
      <span>{children}</span>
    </button>
  )
}

export function IconButton({
  icon,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>
      <Icon name={icon} />
    </button>
  )
}

export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {error && (
        <span style={{ color: "var(--status-absent)", fontSize: "11px", marginTop: "2px" }}>
          {error}
        </span>
      )}
    </label>
  )
}

export function ScreenTitle({
  eyebrow,
  children,
  action,
}: {
  eyebrow?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="screen-title">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h1>{children}</h1>
      </div>
      {action}
    </div>
  )
}

export function Avatar({
  name,
  image,
  size = "md",
}: {
  name: string
  image?: string
  size?: "sm" | "md" | "lg"
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <span className={`avatar avatar-${size}`}>
      {image ? <img src={image} alt={name} /> : initials}
    </span>
  )
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "neutral" | "accent"
  children: ReactNode
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function LivePulse({ label = "Active Operations" }: { label?: string }) {
  return (
    <span className="live-pulse-container">
      <span className="live-pulse-dot" />
      <span>{label}</span>
    </span>
  )
}

export function Sheet({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="sheet-handle" />
        {children}
      </section>
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div
      style={{
        padding: "48px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--brand-blue-soft)",
          color: "var(--brand-blue)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="search" size={24} />
      </div>
      <div>
        <h3 style={{ margin: "0 0 4px", fontSize: "16px", color: "var(--brand-primary)", fontWeight: 700 }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", maxWidth: "320px" }}>
          {message}
        </p>
      </div>
      {action && <div style={{ marginTop: "8px" }}>{action}</div>}
    </div>
  )
}
