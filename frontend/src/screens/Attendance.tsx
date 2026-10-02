import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Pill,
  ScreenTitle,
} from "../components/ui"
import {
  type AttendanceEmployee,
  type AttendanceResponse,
  type AttendanceStatus,
  attendanceApi,
} from "../services/api"

const AVATAR_COLORS = ["clay", "sage", "blue", "gold", "plum"]

function getAvatarColor(identifier: string): string {
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) || "ST").toUpperCase()
}

function getTodayIST(): string {
  // Returns calendar date in YYYY-MM-DD for Indian Standard Time (Asia/Kolkata)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number)
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2])
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(dateObj)
  } catch {
    return dateStr
  }
}

function formatMarkedTime(isoString: string | null): string | null {
  if (!isoString) return null
  try {
    // If backend sent naive ISO string without timezone indicator, treat as UTC by appending Z
    const hasTz =
      isoString.endsWith("Z") ||
      isoString.includes("+") ||
      /-\d{2}:\d{2}$/.test(isoString)
    const normalizedIso = hasTz ? isoString : `${isoString}Z`
    const date = new Date(normalizedIso)
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(date)
  } catch {
    return null
  }
}

export default function Attendance() {
  const navigate = useNavigate()

  // Selected date initialized to current Indian Standard Time (IST) calendar date
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIST())


  // API Data State
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  // Action State (prevent double submissions)
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Fetch Attendance Records
  const loadAttendance = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceApi.get({ date })
      setAttendanceData(response)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load attendance."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAttendance(selectedDate)
  }, [selectedDate, loadAttendance])

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMessage])

  // Date Navigation Handlers
  const handleShiftDate = (days: number) => {
    const parts = selectedDate.split("-").map(Number)
    const current = new Date(parts[0], parts[1] - 1, parts[2])
    current.setDate(current.getDate() + days)
    setSelectedDate(formatDateISO(current))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedDate(e.target.value)
    }
  }

  const handleGoToToday = () => {
    setSelectedDate(getTodayIST())
  }

  // Attendance Marking Handler
  const handleMark = async (
    employee: AttendanceEmployee,
    targetStatus: "present" | "absent",
  ) => {
    // If already in target status, avoid redundant requests
    if (employee.status === targetStatus) return

    setSavingEmployeeId(employee.employee_id)
    try {
      const result = await attendanceApi.mark({
        employee_id: employee.employee_id,
        date: selectedDate,
        status: targetStatus,
      })

      // Update in-memory state smoothly
      setAttendanceData((prev) => {
        if (!prev) return prev

        let presentDelta = 0
        let absentDelta = 0
        let unmarkedDelta = 0

        const updatedEmployees = prev.employees.map((emp) => {
          if (emp.employee_id === employee.employee_id) {
            // Adjust metric counts
            if (emp.status === "present") presentDelta -= 1
            else if (emp.status === "absent") absentDelta -= 1
            else if (emp.status === "unmarked") unmarkedDelta -= 1

            if (targetStatus === "present") presentDelta += 1
            else if (targetStatus === "absent") absentDelta += 1

            return {
              ...emp,
              status: targetStatus as AttendanceStatus,
              marked_at: result.marked_at,
              attendance_id: result.id,
            }
          }
          return emp
        })

        return {
          ...prev,
          employees: updatedEmployees,
          total_present: Math.max(0, prev.total_present + presentDelta),
          total_absent: Math.max(0, prev.total_absent + absentDelta),
          total_unmarked: Math.max(0, prev.total_unmarked + unmarkedDelta),
        }
      })

      setFeedbackMessage(
        `${employee.name} marked as ${targetStatus === "present" ? "Present" : "Absent"}.`,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record attendance."
      alert(msg)
    } finally {
      setSavingEmployeeId(null)
    }
  }

  // Client-side search and filtering
  const filteredEmployees = useMemo(() => {
    if (!attendanceData) return []
    let list = attendanceData.employees

    // Status Filter
    if (statusFilter !== "All") {
      list = list.filter((emp) => emp.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.employee_code.toLowerCase().includes(q) ||
          emp.designation.toLowerCase().includes(q),
      )
    }

    return list
  }, [attendanceData, statusFilter, searchQuery])

  // Status Tone Helper
  const getStatusTone = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "success"
      case "absent":
        return "danger"
      default:
        return "neutral"
    }
  }

  const isToday = selectedDate === getTodayIST()

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Daily Operations"
        action={
          !isToday ? (
            <Button
              variant="secondary"
              onClick={handleGoToToday}
              style={{ fontSize: "12px", height: "34px", padding: "0 12px" }}
            >
              Back to Today
            </Button>
          ) : undefined
        }
      >
        Manual Attendance
      </ScreenTitle>

      {/* Date Navigation Bar */}
      <section className="date-navigator">
        <button
          className="date-nav-btn"
          type="button"
          onClick={() => handleShiftDate(-1)}
          title="Previous day"
          aria-label="Previous day"
        >
          <Icon name="arrow" size={16} />
        </button>

        <div className="date-navigator-center">
          <strong>{formatDisplayDate(selectedDate)}</strong>
          <label className="date-picker-trigger" title="Select date">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              aria-label="Change attendance calendar date"
            />
          </label>
        </div>

        <button
          className="date-nav-btn"
          type="button"
          onClick={() => handleShiftDate(1)}
          title="Next day"
          aria-label="Next day"
          style={{ transform: "rotate(180deg)" }}
        >
          <Icon name="arrow" size={16} />
        </button>
      </section>

      {/* Dynamic Operational Attendance Metrics */}
      <section className="attendance-summary">
        <div>
          <span className="status-dot success" />
          <strong>{attendanceData ? attendanceData.total_present : "—"}</strong>
          <p>Present</p>
        </div>
        <div>
          <span className="status-dot danger" />
          <strong>{attendanceData ? attendanceData.total_absent : "—"}</strong>
          <p>Absent</p>
        </div>
        <div>
          <span className="status-dot neutral" style={{ background: "var(--text-muted)" }} />
          <strong>{attendanceData ? attendanceData.total_unmarked : "—"}</strong>
          <p>Unmarked</p>
        </div>
      </section>

      {/* Save / Update Feedback Notification */}
      {feedbackMessage && (
        <aside className="feedback-banner" role="status">
          <Icon name="check" size={18} />
          <span>{feedbackMessage}</span>
        </aside>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <aside className="error-banner" role="alert">
          <div>
            <strong>Unable to load attendance</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.9 }}>{error}</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => loadAttendance(selectedDate)}
            style={{ fontSize: "12px", height: "32px", padding: "0 10px" }}
          >
            Retry
          </Button>
        </aside>
      )}

      {/* Search Input Box */}
      <div className="searchbox" style={{ marginTop: "18px" }}>
        <Icon name="search" size={18} />
        <input
          type="text"
          placeholder="Search staff by name or employee code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <IconButton
            icon="more"
            label="Clear search"
            onClick={() => setSearchQuery("")}
            style={{ transform: "rotate(45deg)" }}
          />
        )}
      </div>

      {/* Filter Segmented Controls */}
      <div className="segmented">
        {(["All", "Present", "Absent", "Unmarked"] as const).map((filter) => {
          const count =
            attendanceData && filter === "Present"
              ? attendanceData.total_present
              : attendanceData && filter === "Absent"
                ? attendanceData.total_absent
                : attendanceData && filter === "Unmarked"
                  ? attendanceData.total_unmarked
                  : attendanceData?.employees.length

          return (
            <button
              key={filter}
              type="button"
              className={statusFilter === filter ? "active" : ""}
              onClick={() => setStatusFilter(filter)}
            >
              {filter} {count !== undefined ? `(${count})` : ""}
            </button>
          )
        })}
      </div>

      {/* Attendance Roster Register */}
      <section className="section record-section" style={{ marginTop: "8px" }}>
        <div className="section-heading">
          <h2>Active Staff Roster</h2>
          <Pill tone="neutral">
            {filteredEmployees.length}{" "}
            {filteredEmployees.length === 1 ? "Employee" : "Employees"}
          </Pill>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ display: "grid", gap: "10px", padding: "12px 0" }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="skeleton"
                style={{ height: "64px", width: "100%", borderRadius: "10px" }}
              />
            ))}
          </div>
        )}

        {/* Empty State: No active employees exist in MongoDB */}
        {!loading && !error && attendanceData && attendanceData.employees.length === 0 && (
          <EmptyState
            title="No Active Staff Members"
            message="Add staff members to your agency roster to begin recording daily attendance."
            action={
              <Button
                variant="primary"
                icon="plus"
                onClick={() => navigate("/staff")}
              >
                Go to Staff Directory
              </Button>
            }
          />
        )}

        {/* Empty State: Search or filter matches 0 */}
        {!loading &&
          !error &&
          attendanceData &&
          attendanceData.employees.length > 0 &&
          filteredEmployees.length === 0 && (
            <EmptyState
              title="No Staff Matching Criteria"
              message={`No active staff found matching "${searchQuery || statusFilter}".`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("All")
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          )}

        {/* Employee Roster List */}
        {!loading &&
          !error &&
          filteredEmployees.map((person) => {
            const avatarColor = getAvatarColor(person.employee_code || person.name)
            const initials = getInitials(person.name)
            const isSaving = savingEmployeeId === person.employee_id
            const formattedTime = formatMarkedTime(person.marked_at)

            return (
              <article className="attendance-row" key={person.employee_id}>
                <span className={`initial-avatar ${avatarColor}`}>{initials}</span>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{person.name}</strong>
                  <p>
                    {person.employee_code} · {person.designation}
                    {formattedTime && (
                      <span style={{ color: "var(--brand-blue)", marginLeft: "6px" }}>
                        · Marked at {formattedTime}
                      </span>
                    )}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Pill tone={getStatusTone(person.status)}>
                    {person.status === "present"
                      ? "Present"
                      : person.status === "absent"
                        ? "Absent"
                        : "Unmarked"}
                  </Pill>

                  <div className="att-actions">
                    <button
                      type="button"
                      className={`att-btn att-btn-present ${
                        person.status === "present" ? "active" : ""
                      }`}
                      disabled={isSaving}
                      onClick={() => handleMark(person, "present")}
                      title="Mark Present"
                      aria-label={`Mark ${person.name} present`}
                    >
                      {isSaving && person.status !== "present" ? (
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            border: "2px solid currentColor",
                            borderRightColor: "transparent",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "shimmer 0.75s infinite linear",
                          }}
                        />
                      ) : (
                        <Icon name="check" size={14} />
                      )}
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      className={`att-btn att-btn-absent ${
                        person.status === "absent" ? "active" : ""
                      }`}
                      disabled={isSaving}
                      onClick={() => handleMark(person, "absent")}
                      title="Mark Absent"
                      aria-label={`Mark ${person.name} absent`}
                    >
                      {isSaving && person.status !== "absent" ? (
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            border: "2px solid currentColor",
                            borderRightColor: "transparent",
                            borderRadius: "50%",
                            display: "inline-block",
                            animation: "shimmer 0.75s infinite linear",
                          }}
                        />
                      ) : null}
                      <span>Absent</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
      </section>
    </main>
  )
}
