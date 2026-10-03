import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Pill,
  ScreenTitle,
  Sheet,
} from "../components/ui"
import { FaceAttendanceView } from "../features/face"
import {
  type AttendanceEmployee,
  type AttendanceResponse,
  type AttendanceStatus,
  type EmployeeAttendanceHistoryResponse,
  type MonthlyAttendanceSummary,
  type FaceAttendanceMarkResponse,
  attendanceApi,
} from "../services/api"

const AVATAR_COLORS = ["clay", "sage", "blue", "gold", "plum"]
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

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

type ViewMode = "daily" | "monthly" | "face"

export default function Attendance() {
  const navigate = useNavigate()

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>("daily")

  // Selected Daily Date in IST (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIST())

  // Daily API Data State
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null)
  const [loadingDaily, setLoadingDaily] = useState<boolean>(true)
  const [errorDaily, setErrorDaily] = useState<string | null>(null)

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  // Action State (prevent double submissions)
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Monthly History State
  const todayDateObj = useMemo(() => new Date(), [])
  const [historyYear, setHistoryYear] = useState<number>(() => todayDateObj.getFullYear())
  const [historyMonth, setHistoryMonth] = useState<number>(() => todayDateObj.getMonth() + 1)
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceSummary | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false)
  const [errorMonthly, setErrorMonthly] = useState<string | null>(null)

  // Employee History Drawer State
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] =
    useState<AttendanceEmployee | null>(null)
  const [empHistoryData, setEmpHistoryData] =
    useState<EmployeeAttendanceHistoryResponse | null>(null)
  const [loadingEmpHistory, setLoadingEmpHistory] = useState<boolean>(false)
  const [errorEmpHistory, setErrorEmpHistory] = useState<string | null>(null)
  const [empHistoryMonth, setEmpHistoryMonth] = useState<number>(() => todayDateObj.getMonth() + 1)
  const [empHistoryYear, setEmpHistoryYear] = useState<number>(() => todayDateObj.getFullYear())

  // Fetch Daily Attendance
  const loadDailyAttendance = useCallback(async (date: string) => {
    setLoadingDaily(true)
    setErrorDaily(null)
    try {
      const response = await attendanceApi.get({ date })
      setAttendanceData(response)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load attendance."
      setErrorDaily(msg)
    } finally {
      setLoadingDaily(false)
    }
  }, [])

  useEffect(() => {
    loadDailyAttendance(selectedDate)
  }, [selectedDate, loadDailyAttendance])

  // Fetch Monthly History
  const loadMonthlyHistory = useCallback(async (year: number, month: number) => {
    setLoadingMonthly(true)
    setErrorMonthly(null)
    try {
      const response = await attendanceApi.getMonthlySummary(year, month)
      setMonthlyData(response)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load monthly summary."
      setErrorMonthly(msg)
    } finally {
      setLoadingMonthly(false)
    }
  }, [])

  useEffect(() => {
    if (viewMode === "monthly") {
      loadMonthlyHistory(historyYear, historyMonth)
    }
  }, [viewMode, historyYear, historyMonth, loadMonthlyHistory])

  // Fetch Employee Attendance History Drawer
  const loadEmployeeHistory = useCallback(
    async (employeeId: string, year: number, month: number) => {
      setLoadingEmpHistory(true)
      setErrorEmpHistory(null)
      try {
        const lastDay = new Date(year, month, 0).getDate()
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

        const response = await attendanceApi.getEmployeeHistory(employeeId, {
          start_date: startDate,
          end_date: endDate,
        })
        setEmpHistoryData(response)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unable to load employee history."
        setErrorEmpHistory(msg)
      } finally {
        setLoadingEmpHistory(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (selectedEmployeeForHistory) {
      loadEmployeeHistory(
        selectedEmployeeForHistory.employee_id,
        empHistoryYear,
        empHistoryMonth,
      )
    }
  }, [selectedEmployeeForHistory, empHistoryYear, empHistoryMonth, loadEmployeeHistory])

  // Clear feedback message after 3 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMessage])

  // Daily Date Navigation
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

  // Monthly Navigation
  const handleShiftMonth = (delta: number) => {
    let nextMonth = historyMonth + delta
    let nextYear = historyYear
    if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    } else if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    setHistoryMonth(nextMonth)
    setHistoryYear(nextYear)
  }

  // Mark Attendance Handler
  const handleMark = async (
    employee: AttendanceEmployee,
    targetStatus: "present" | "absent",
  ) => {
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

  // Handle Face Attendance Recorded (Phase 9)
  const handleFaceAttendanceRecorded = useCallback(
    (record: FaceAttendanceMarkResponse) => {
      // If today is currently viewed, update in-memory daily roster immediately
      if (selectedDate === getTodayIST() && record.status === "marked") {
        setAttendanceData((prev) => {
          if (!prev) return prev
          let presentDelta = 0
          let absentDelta = 0
          let unmarkedDelta = 0

          const updated = prev.employees.map((emp) => {
            if (emp.employee_id === record.employee_id) {
              if (emp.status === "present") presentDelta -= 1
              else if (emp.status === "absent") absentDelta -= 1
              else if (emp.status === "unmarked") unmarkedDelta -= 1

              presentDelta += 1
              return {
                ...emp,
                status: "present" as AttendanceStatus,
                marked_at: record.marked_at || null,
              }
            }
            return emp
          })

          return {
            ...prev,
            employees: updated,
            total_present: Math.max(0, prev.total_present + presentDelta),
            total_absent: Math.max(0, prev.total_absent + absentDelta),
            total_unmarked: Math.max(0, prev.total_unmarked + unmarkedDelta),
          }
        })
      }
    },
    [selectedDate]
  )

  // Filtered employees for Daily Register
  const filteredEmployees = useMemo(() => {
    if (!attendanceData) return []
    let list = attendanceData.employees

    if (statusFilter !== "All") {
      list = list.filter((emp) => emp.status.toLowerCase() === statusFilter.toLowerCase())
    }

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

  // Calculated daily attendance rate
  const dailyAttendanceRate = useMemo(() => {
    if (!attendanceData) return 0
    const marked = attendanceData.total_present + attendanceData.total_absent
    if (marked === 0) return 0
    return Math.round((attendanceData.total_present / marked) * 1000) / 10
  }, [attendanceData])

  const isToday = selectedDate === getTodayIST()

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Operations & Reporting"
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {viewMode === "daily" && !isToday && (
              <Button
                variant="secondary"
                onClick={handleGoToToday}
                style={{ fontSize: "12px", height: "34px", padding: "0 12px" }}
              >
                Back to Today
              </Button>
            )}
            {viewMode !== "face" && (
              <Button
                variant="primary"
                icon="camera"
                onClick={() => setViewMode("face")}
                style={{ fontSize: "12px", height: "34px", padding: "0 12px" }}
              >
                Face Attendance
              </Button>
            )}
          </div>
        }
      >
        Staff Attendance
      </ScreenTitle>

      {/* Mode Switcher Tabs */}
      <nav className="view-tabs" aria-label="Attendance view modes">
        <button
          type="button"
          className={`view-tab-btn ${viewMode === "daily" ? "active" : ""}`}
          onClick={() => setViewMode("daily")}
        >
          <Icon name="attendance" size={16} />
          <span>Daily Register</span>
        </button>
        <button
          type="button"
          className={`view-tab-btn ${viewMode === "monthly" ? "active" : ""}`}
          onClick={() => setViewMode("monthly")}
        >
          <Icon name="calendar" size={16} />
          <span>Monthly History</span>
        </button>
        <button
          type="button"
          className={`view-tab-btn ${viewMode === "face" ? "active" : ""}`}
          onClick={() => setViewMode("face")}
        >
          <Icon name="camera" size={16} />
          <span>Face Attendance</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* MODE 1: DAILY REGISTER                                   */}
      {/* ========================================================= */}
      {viewMode === "daily" && (
        <>
          {/* Date Navigator Bar */}
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

          {/* 4-Card Operational Summary Grid */}
          <section className="att-metric-grid">
            <div className="att-metric-card">
              <span className="label">
                <span className="status-dot success" />
                Present
              </span>
              <strong>{attendanceData ? attendanceData.total_present : "—"}</strong>
            </div>

            <div className="att-metric-card">
              <span className="label">
                <span className="status-dot danger" />
                Absent
              </span>
              <strong>{attendanceData ? attendanceData.total_absent : "—"}</strong>
            </div>

            <div className="att-metric-card">
              <span className="label">
                <span className="status-dot neutral" style={{ background: "var(--text-muted)" }} />
                Unmarked
              </span>
              <strong>{attendanceData ? attendanceData.total_unmarked : "—"}</strong>
            </div>

            <div className="att-metric-card">
              <span className="label">
                <Icon name="shield" size={13} />
                Attendance %
              </span>
              <strong style={{ color: "var(--brand-blue)" }}>
                {attendanceData ? `${dailyAttendanceRate}%` : "—"}
              </strong>
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
          {errorDaily && (
            <aside className="error-banner" role="alert">
              <div>
                <strong>Unable to load attendance</strong>
                <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.9 }}>{errorDaily}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => loadDailyAttendance(selectedDate)}
                style={{ fontSize: "12px", height: "32px", padding: "0 10px" }}
              >
                Retry
              </Button>
            </aside>
          )}

          {/* Search Input Box */}
          <div className="searchbox" style={{ marginTop: "14px" }}>
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
            {loadingDaily && (
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
            {!loadingDaily && !errorDaily && attendanceData && attendanceData.employees.length === 0 && (
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

            {/* Empty State: Filter/search yielded 0 matches */}
            {!loadingDaily &&
              !errorDaily &&
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
            {!loadingDaily &&
              !errorDaily &&
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

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <Pill
                        tone={
                          person.status === "present"
                            ? "success"
                            : person.status === "absent"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {person.status === "present"
                          ? "Present"
                          : person.status === "absent"
                            ? "Absent"
                            : "Unmarked"}
                      </Pill>

                      <button
                        type="button"
                        className="att-history-btn"
                        onClick={() => setSelectedEmployeeForHistory(person)}
                        title={`View ${person.name}'s attendance history`}
                      >
                        <Icon name="clock" size={13} />
                        <span>History</span>
                      </button>

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
        </>
      )}

      {/* ========================================================= */}
      {/* MODE 2: MONTHLY ATTENDANCE HISTORY                       */}
      {/* ========================================================= */}
      {viewMode === "monthly" && (
        <>
          {/* Month Selector Bar */}
          <section className="month-navigator">
            <button
              className="date-nav-btn"
              type="button"
              onClick={() => handleShiftMonth(-1)}
              title="Previous month"
              aria-label="Previous month"
            >
              <Icon name="arrow" size={16} />
            </button>

            <div className="month-selectors">
              <select
                value={historyMonth}
                onChange={(e) => setHistoryMonth(Number(e.target.value))}
                aria-label="Select history month"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={historyYear}
                onChange={(e) => setHistoryYear(Number(e.target.value))}
                aria-label="Select history year"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="date-nav-btn"
              type="button"
              onClick={() => handleShiftMonth(1)}
              title="Next month"
              aria-label="Next month"
              style={{ transform: "rotate(180deg)" }}
            >
              <Icon name="arrow" size={16} />
            </button>
          </section>

          {/* Monthly KPI Overview Grid */}
          <section className="att-metric-grid">
            <div className="att-metric-card">
              <span className="label">Active Staff</span>
              <strong>{monthlyData ? monthlyData.total_active_employees : "—"}</strong>
            </div>

            <div className="att-metric-card">
              <span className="label">
                <span className="status-dot success" />
                Present Logs
              </span>
              <strong>{monthlyData ? monthlyData.overall_present : "—"}</strong>
            </div>

            <div className="att-metric-card">
              <span className="label">
                <span className="status-dot danger" />
                Absent Logs
              </span>
              <strong>{monthlyData ? monthlyData.overall_absent : "—"}</strong>
            </div>

            <div className="att-metric-card">
              <span className="label">
                <Icon name="shield" size={13} />
                Monthly Rate
              </span>
              <strong style={{ color: "var(--brand-blue)" }}>
                {monthlyData ? `${monthlyData.overall_attendance_percentage}%` : "—"}
              </strong>
            </div>
          </section>

          {/* Error Banner with Retry */}
          {errorMonthly && (
            <aside className="error-banner" role="alert">
              <div>
                <strong>Unable to load monthly attendance</strong>
                <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.9 }}>{errorMonthly}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => loadMonthlyHistory(historyYear, historyMonth)}
                style={{ fontSize: "12px", height: "32px", padding: "0 10px" }}
              >
                Retry
              </Button>
            </aside>
          )}

          {/* Monthly History Cards List */}
          <section className="section record-section" style={{ marginTop: "12px" }}>
            <div className="section-heading">
              <h2>Daily Attendance Breakdown</h2>
              <Pill tone="neutral">
                {monthlyData ? monthlyData.days.length : 0}{" "}
                {monthlyData?.days.length === 1 ? "Day" : "Days"} Recorded
              </Pill>
            </div>

            {loadingMonthly && (
              <div style={{ display: "grid", gap: "10px", padding: "12px 0" }}>
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="skeleton"
                    style={{ height: "56px", width: "100%", borderRadius: "10px" }}
                  />
                ))}
              </div>
            )}

            {!loadingMonthly && !errorMonthly && monthlyData && monthlyData.days.length === 0 && (
              <EmptyState
                title="No Records in Selected Month"
                message={`No attendance logs recorded for ${MONTH_NAMES[historyMonth - 1]} ${historyYear}.`}
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSelectedDate(getTodayIST())
                      setViewMode("daily")
                    }}
                  >
                    Go to Today's Register
                  </Button>
                }
              />
            )}

            {!loadingMonthly && !errorMonthly && monthlyData && monthlyData.days.length > 0 && (
              <div className="history-card-list">
                {monthlyData.days.map((day) => (
                  <article className="history-card" key={day.date}>
                    <div className="history-date">
                      <strong>{formatDisplayDate(day.date)}</strong>
                      <span>{day.total_employees} Active Staff</span>
                    </div>

                    <div className="history-stats-pills">
                      <span className="stat-chip p" title="Present">
                        <span className="status-dot success" />
                        {day.present} Present
                      </span>
                      <span className="stat-chip a" title="Absent">
                        <span className="status-dot danger" />
                        {day.absent} Absent
                      </span>
                      <span className="stat-chip u" title="Unmarked">
                        {day.unmarked} Unmarked
                      </span>
                    </div>

                    <div className="history-actions">
                      <Pill
                        tone={
                          day.attendance_percentage >= 85
                            ? "success"
                            : day.attendance_percentage >= 70
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {day.attendance_percentage}%
                      </Pill>

                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedDate(day.date)
                          setViewMode("daily")
                        }}
                        style={{ fontSize: "11.5px", height: "30px", padding: "0 10px" }}
                      >
                        View Day
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ========================================================= */}
      {/* MODE 3: FACE RECOGNITION ATTENDANCE (PHASE 9)             */}
      {/* ========================================================= */}
      {viewMode === "face" && (
        <section style={{ marginTop: "16px" }}>
          <FaceAttendanceView
            onClose={() => setViewMode("daily")}
            onAttendanceRecorded={handleFaceAttendanceRecorded}
          />
        </section>
      )}

      {/* ========================================================= */}
      {/* DRAWER: INDIVIDUAL EMPLOYEE ATTENDANCE HISTORY            */}
      {/* ========================================================= */}
      {selectedEmployeeForHistory && (
        <Sheet onClose={() => setSelectedEmployeeForHistory(null)}>
          <div className="sheet-title">
            <div>
              <p className="eyebrow">Employee Roster History</p>
              <h2>{selectedEmployeeForHistory.name}</h2>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                {selectedEmployeeForHistory.employee_code} · {selectedEmployeeForHistory.designation}
              </p>
            </div>
            <Pill tone="neutral">
              {MONTH_NAMES[empHistoryMonth - 1]} {empHistoryYear}
            </Pill>
          </div>

          {/* Month Selector for History */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div className="month-selectors">
              <select
                value={empHistoryMonth}
                onChange={(e) => setEmpHistoryMonth(Number(e.target.value))}
                aria-label="Filter employee history by month"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={empHistoryYear}
                onChange={(e) => setEmpHistoryYear(Number(e.target.value))}
                aria-label="Filter employee history by year"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              onClick={() =>
                loadEmployeeHistory(
                  selectedEmployeeForHistory.employee_id,
                  empHistoryYear,
                  empHistoryMonth,
                )
              }
              style={{ fontSize: "11px", height: "28px", padding: "0 8px" }}
            >
              Refresh
            </Button>
          </div>

          {/* Employee KPI Chips */}
          {empHistoryData && (
            <div className="emp-history-kpis">
              <div className="emp-history-kpi">
                <span>Present</span>
                <strong style={{ color: "var(--status-present)" }}>
                  {empHistoryData.summary.present}
                </strong>
              </div>
              <div className="emp-history-kpi">
                <span>Absent</span>
                <strong style={{ color: "var(--status-absent)" }}>
                  {empHistoryData.summary.absent}
                </strong>
              </div>
              <div className="emp-history-kpi">
                <span>Unmarked</span>
                <strong>{empHistoryData.summary.unmarked}</strong>
              </div>
              <div className="emp-history-kpi">
                <span>Attendance %</span>
                <strong style={{ color: "var(--brand-blue)" }}>
                  {empHistoryData.summary.attendance_percentage}%
                </strong>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorEmpHistory && (
            <aside className="error-banner" role="alert" style={{ marginBottom: "12px" }}>
              <span>{errorEmpHistory}</span>
            </aside>
          )}

          {/* History Timeline */}
          {loadingEmpHistory ? (
            <div style={{ display: "grid", gap: "8px" }}>
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="skeleton"
                  style={{ height: "42px", borderRadius: "8px" }}
                />
              ))}
            </div>
          ) : empHistoryData && empHistoryData.records.length > 0 ? (
            <div className="history-timeline">
              {empHistoryData.records.map((rec) => (
                <div className="history-timeline-item" key={rec.date}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                      {formatDisplayDate(rec.date)}
                    </strong>
                    {rec.marked_at && (
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>
                        {formatMarkedTime(rec.marked_at)}
                      </p>
                    )}
                  </div>
                  <Pill tone={rec.status === "present" ? "success" : "danger"}>
                    {rec.status === "present" ? "Present" : "Absent"}
                  </Pill>
                </div>
              ))}
            </div>
          ) : (
            <p
              style={{
                textAlign: "center",
                padding: "24px 0",
                fontSize: "13px",
                color: "var(--text-secondary)",
              }}
            >
              No attendance records found for this employee in {MONTH_NAMES[empHistoryMonth - 1]}{" "}
              {empHistoryYear}.
            </p>
          )}

          <Button
            block
            variant="secondary"
            style={{ marginTop: "18px" }}
            onClick={() => setSelectedEmployeeForHistory(null)}
          >
            Close History
          </Button>
        </Sheet>
      )}
    </main>
  )
}
