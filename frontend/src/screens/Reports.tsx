import { useState, useEffect } from "react"
import {
  Button,
  Icon,
  Pill,
  ScreenTitle,
  EmptyState,
} from "../components/ui"
import {
  reportsApi,
  employeesApi,
  type AttendanceReportResponse,
  type SalaryMonthlyResponse,
  type EmployeeAttendanceHistoryResponse,
  type Employee,
} from "../services/api"

type ReportTab = "attendance" | "payroll" | "employee"

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return `"${str}"`
  }

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "—"
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
  } catch {
    return isoStr
  }
}

export default function Reports() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Format today and 30 days ago as YYYY-MM-DD
  const todayStr = now.toISOString().split("T")[0]
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]

  const [activeTab, setActiveTab] = useState<ReportTab>("attendance")

  // Tab 1: Attendance State
  const [attStartDate, setAttStartDate] = useState<string>(thirtyDaysAgoStr)
  const [attEndDate, setAttEndDate] = useState<string>(todayStr)
  const [attStatus, setAttStatus] = useState<string>("All")
  const [attSearch, setAttSearch] = useState<string>("")
  const [attData, setAttData] = useState<AttendanceReportResponse | null>(null)
  const [attLoading, setAttLoading] = useState<boolean>(false)
  const [attError, setAttError] = useState<string | null>(null)

  // Tab 2: Payroll State
  const [payrollYear, setPayrollYear] = useState<number>(currentYear)
  const [payrollMonth, setPayrollMonth] = useState<number>(currentMonth)
  const [payrollData, setPayrollData] = useState<SalaryMonthlyResponse | null>(null)
  const [payrollLoading, setPayrollLoading] = useState<boolean>(false)
  const [payrollError, setPayrollError] = useState<string | null>(null)

  // Tab 3: Staff Audit State
  const [staffList, setStaffList] = useState<Employee[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [staffStartDate, setStaffStartDate] = useState<string>(thirtyDaysAgoStr)
  const [staffEndDate, setStaffEndDate] = useState<string>(todayStr)
  const [staffAuditData, setStaffAuditData] = useState<EmployeeAttendanceHistoryResponse | null>(null)
  const [staffLoading, setStaffLoading] = useState<boolean>(false)
  const [staffError, setStaffError] = useState<string | null>(null)

  // Load staff list for tab 3 on mount
  useEffect(() => {
    employeesApi.list({ limit: 100 }).then((res) => {
      setStaffList(res.items)
      if (res.items.length > 0 && !selectedStaffId) {
        setSelectedStaffId(res.items[0].id)
      }
    }).catch(() => {})
  }, [])

  // Auto-load current tab data
  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendanceReport()
    } else if (activeTab === "payroll") {
      fetchPayrollReport()
    } else if (activeTab === "employee" && selectedStaffId) {
      fetchStaffAuditReport()
    }
  }, [activeTab])

  // When selected staff changes, reload staff audit
  useEffect(() => {
    if (activeTab === "employee" && selectedStaffId) {
      fetchStaffAuditReport()
    }
  }, [selectedStaffId])

  async function fetchAttendanceReport() {
    setAttLoading(true)
    setAttError(null)
    try {
      const res = await reportsApi.getAttendanceReport({
        start_date: attStartDate,
        end_date: attEndDate,
        status: attStatus,
        search: attSearch.trim() || undefined,
      })
      setAttData(res)
    } catch (err: any) {
      setAttError(err.message || "Failed to load attendance compliance report.")
    } finally {
      setAttLoading(false)
    }
  }

  async function fetchPayrollReport() {
    setPayrollLoading(true)
    setPayrollError(null)
    try {
      const res = await reportsApi.getSalaryReport({
        year: payrollYear,
        month: payrollMonth,
      })
      setPayrollData(res)
    } catch (err: any) {
      setPayrollError(err.message || "Failed to load payroll register report.")
    } finally {
      setPayrollLoading(false)
    }
  }

  async function fetchStaffAuditReport() {
    if (!selectedStaffId) return
    setStaffLoading(true)
    setStaffError(null)
    try {
      const res = await reportsApi.getEmployeeAttendanceReport(selectedStaffId, {
        start_date: staffStartDate,
        end_date: staffEndDate,
      })
      setStaffAuditData(res)
    } catch (err: any) {
      setStaffError(err.message || "Failed to load staff biometric audit report.")
    } finally {
      setStaffLoading(false)
    }
  }

  // CSV Export Handlers
  function exportAttendanceCsv() {
    if (!attData || !attData.items || attData.items.length === 0) return
    const headers = [
      "Date",
      "Employee Name",
      "Employee Code",
      "Designation",
      "Status",
      "Marked At",
      "Method",
    ]
    const rows = attData.items.map((item) => [
      item.date,
      item.employee_name,
      item.employee_code,
      item.designation,
      item.status.toUpperCase(),
      item.marked_at ? new Date(item.marked_at).toLocaleString() : "—",
      item.method === "face" ? "Biometric Face Recognition" : item.method,
    ])
    downloadCsv(`attendance_report_${attStartDate}_to_${attEndDate}.csv`, headers, rows)
  }

  function exportPayrollCsv() {
    if (!payrollData || !payrollData.items || payrollData.items.length === 0) return
    const headers = [
      "Employee Name",
      "Employee Code",
      "Designation",
      "Base Salary (INR)",
      "Daily Cutoff (INR)",
      "Cutoff Source",
      "Present Days",
      "Absent Days",
      "Absence Deductions (INR)",
      "Net Payout (INR)",
    ]
    const rows = payrollData.items.map((item) => [
      item.name,
      item.employee_code,
      item.designation,
      item.base_salary,
      item.effective_daily_cutoff ?? 0,
      item.cutoff_source,
      item.present_days,
      item.absent_days,
      item.absence_deduction,
      item.calculated_salary,
    ])
    downloadCsv(`payroll_register_${payrollYear}_${payrollMonth}.csv`, headers, rows)
  }

  function exportStaffAuditCsv() {
    if (!staffAuditData || !staffAuditData.records || staffAuditData.records.length === 0) return
    const emp = staffAuditData.employee
    const headers = [
      "Date",
      "Employee Name",
      "Employee Code",
      "Designation",
      "Status",
      "Marked At",
    ]
    const rows = staffAuditData.records.map((r) => [
      r.date,
      emp.name,
      emp.employee_code,
      emp.designation,
      r.status.toUpperCase(),
      r.marked_at ? new Date(r.marked_at).toLocaleString() : "—",
    ])
    downloadCsv(`staff_audit_${emp.employee_code}_${staffStartDate}_to_${staffEndDate}.csv`, headers, rows)
  }

  return (
    <main className="screen">
      <ScreenTitle eyebrow="Compliance & Financial Audit">Agency Reports</ScreenTitle>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border, #334155)",
          paddingBottom: "12px",
          marginBottom: "20px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "attendance" ? "var(--brand-primary, #123b72)" : "rgba(255, 255, 255, 0.05)",
            color: activeTab === "attendance" ? "#ffffff" : "var(--text-secondary, #94a3b8)",
            fontWeight: activeTab === "attendance" ? 600 : 400,
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="attendance" size={16} />
          Attendance Compliance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payroll")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "payroll" ? "var(--brand-primary, #123b72)" : "rgba(255, 255, 255, 0.05)",
            color: activeTab === "payroll" ? "#ffffff" : "var(--text-secondary, #94a3b8)",
            fontWeight: activeTab === "payroll" ? 600 : 400,
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="salary" size={16} />
          Payroll Register
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("employee")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "employee" ? "var(--brand-primary, #123b72)" : "rgba(255, 255, 255, 0.05)",
            color: activeTab === "employee" ? "#ffffff" : "var(--text-secondary, #94a3b8)",
            fontWeight: activeTab === "employee" ? 600 : 400,
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="staff" size={16} />
          Staff Biometric Audit
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTENDANCE COMPLIANCE REPORT */}
      {/* ========================================================================= */}
      {activeTab === "attendance" && (
        <section>
          {/* Filter Bar */}
          <div
            style={{
              padding: "16px",
              background: "rgba(30, 41, 59, 0.4)",
              borderRadius: "12px",
              border: "1px solid var(--border, #334155)",
              marginBottom: "20px",
              display: "grid",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={attStartDate}
                  onChange={(e) => setAttStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={attEndDate}
                  onChange={(e) => setAttEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Status Filter
                </label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                  <option value="half_day">Half Day Only</option>
                  <option value="leave">On Leave Only</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Search Staff
                </label>
                <input
                  type="text"
                  placeholder="Name or code..."
                  value={attSearch}
                  onChange={(e) => setAttSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchAttendanceReport()}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <Button variant="primary" onClick={fetchAttendanceReport} disabled={attLoading}>
                {attLoading ? "Loading Report..." : "Apply Filters"}
              </Button>

              <Button
                variant="secondary"
                icon="download"
                onClick={exportAttendanceCsv}
                disabled={!attData || !attData.items || attData.items.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {attError && (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", marginBottom: "16px" }}>
              {attError}
            </div>
          )}

          {/* Attendance KPI Cards */}
          {attData && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.5)", border: "1px solid var(--border, #334155)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>Total Records</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px" }}>{attData.summary.total_records}</div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#10b981" }}>Present Marks</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#10b981" }}>{attData.summary.total_present}</div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#ef4444" }}>Absent Marks</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#ef4444" }}>{attData.summary.total_absent}</div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#818cf8" }}>Compliance Rate</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#818cf8" }}>{attData.summary.attendance_percentage}%</div>
              </div>
            </div>
          )}

          {/* Attendance Table */}
          {attLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted, #94a3b8)" }}>
              Fetching attendance compliance records...
            </div>
          ) : !attData || attData.items.length === 0 ? (
            <EmptyState
              title="No Attendance Records Found"
              message="No attendance records match the selected date range and filter criteria."
            />
          ) : (
            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border, #334155)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid var(--border, #334155)" }}>
                    <th style={{ padding: "12px 14px" }}>Date</th>
                    <th style={{ padding: "12px 14px" }}>Employee</th>
                    <th style={{ padding: "12px 14px" }}>Designation</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px" }}>Marked Time</th>
                    <th style={{ padding: "12px 14px" }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {attData.items.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>{row.date}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong>{row.employee_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>{row.employee_code}</div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary, #94a3b8)" }}>{row.designation}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <Pill tone={row.status === "present" ? "success" : row.status === "absent" ? "danger" : "neutral"}>
                          {row.status.toUpperCase()}
                        </Pill>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted, #94a3b8)" }}>
                        {formatDate(row.marked_at)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "0.8rem", color: row.method === "face" ? "#10b981" : "var(--text-muted, #94a3b8)" }}>
                          {row.method === "face" ? "Biometric Face" : "Admin Manual"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY PAYROLL REGISTER REPORT */}
      {/* ========================================================================= */}
      {activeTab === "payroll" && (
        <section>
          {/* Payroll Filter Bar */}
          <div
            style={{
              padding: "16px",
              background: "rgba(30, 41, 59, 0.4)",
              borderRadius: "12px",
              border: "1px solid var(--border, #334155)",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Year
                </label>
                <select
                  value={payrollYear}
                  onChange={(e) => setPayrollYear(parseInt(e.target.value, 10))}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                >
                  <option value={currentYear - 1}>{currentYear - 1}</option>
                  <option value={currentYear}>{currentYear}</option>
                  <option value={currentYear + 1}>{currentYear + 1}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Month
                </label>
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(parseInt(e.target.value, 10))}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ paddingTop: "18px" }}>
                <Button variant="primary" onClick={fetchPayrollReport} disabled={payrollLoading}>
                  {payrollLoading ? "Loading..." : "View Register"}
                </Button>
              </div>
            </div>

            <div>
              <Button
                variant="secondary"
                icon="download"
                onClick={exportPayrollCsv}
                disabled={!payrollData || !payrollData.items || payrollData.items.length === 0}
              >
                Export Payroll CSV
              </Button>
            </div>
          </div>

          {payrollError && (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", marginBottom: "16px" }}>
              {payrollError}
            </div>
          )}

          {/* Payroll KPI Cards */}
          {payrollData && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.5)", border: "1px solid var(--border, #334155)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>Total Employees</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px" }}>{payrollData.total_employees}</div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#818cf8" }}>Total Base Payroll</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#818cf8" }}>
                  ₹{payrollData.total_base_salary.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#ef4444" }}>Total Deductions</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#ef4444" }}>
                  ₹{payrollData.total_deductions.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#10b981" }}>Net Payable Total</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#10b981" }}>
                  ₹{payrollData.total_net_payable.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          )}

          {/* Payroll Table */}
          {payrollLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted, #94a3b8)" }}>
              Calculating live payroll deductions...
            </div>
          ) : !payrollData || payrollData.items.length === 0 ? (
            <EmptyState
              title="No Payroll Records Found"
              message="No active employees or payroll records exist for this period."
            />
          ) : (
            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border, #334155)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid var(--border, #334155)" }}>
                    <th style={{ padding: "12px 14px" }}>Employee</th>
                    <th style={{ padding: "12px 14px" }}>Designation</th>
                    <th style={{ padding: "12px 14px" }}>Base Salary</th>
                    <th style={{ padding: "12px 14px" }}>Cutoff / Day</th>
                    <th style={{ padding: "12px 14px" }}>Present / Absent</th>
                    <th style={{ padding: "12px 14px" }}>Deductions</th>
                    <th style={{ padding: "12px 14px" }}>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.items.map((row) => (
                    <tr key={row.employee_id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <strong>{row.name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>{row.employee_code}</div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary, #94a3b8)" }}>{row.designation}</td>
                      <td style={{ padding: "12px 14px" }}>₹{row.base_salary.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div>₹{row.effective_daily_cutoff ?? 0}</div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted, #94a3b8)" }}>
                          {row.cutoff_source === "individual"
                            ? "Individual"
                            : row.cutoff_source === "agency_default"
                            ? "Agency Default"
                            : "None"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>{row.present_days}P</span>
                        {" / "}
                        <span style={{ color: row.absent_days > 0 ? "#ef4444" : "inherit" }}>{row.absent_days}A</span>
                      </td>
                      <td style={{ padding: "12px 14px", color: row.absence_deduction > 0 ? "#ef4444" : "inherit" }}>
                        -₹{row.absence_deduction.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ color: "#10b981" }}>₹{row.calculated_salary.toLocaleString("en-IN")}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STAFF BIOMETRIC ATTENDANCE AUDIT */}
      {/* ========================================================================= */}
      {activeTab === "employee" && (
        <section>
          {/* Staff Audit Filter Bar */}
          <div
            style={{
              padding: "16px",
              background: "rgba(30, 41, 59, 0.4)",
              borderRadius: "12px",
              border: "1px solid var(--border, #334155)",
              marginBottom: "20px",
              display: "grid",
              gap: "12px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Select Employee
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                >
                  {staffList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code}) — {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={staffStartDate}
                  onChange={(e) => setStaffStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", display: "block", marginBottom: "4px" }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={staffEndDate}
                  onChange={(e) => setStaffEndDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "var(--surface, #1e293b)",
                    border: "1px solid var(--border, #334155)",
                    color: "inherit",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <Button variant="primary" onClick={fetchStaffAuditReport} disabled={staffLoading || !selectedStaffId}>
                {staffLoading ? "Auditing Records..." : "Audit Staff Logs"}
              </Button>

              <Button
                variant="secondary"
                icon="download"
                onClick={exportStaffAuditCsv}
                disabled={!staffAuditData || !staffAuditData.records || staffAuditData.records.length === 0}
              >
                Export CSV Log
              </Button>
            </div>
          </div>

          {staffError && (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", marginBottom: "16px" }}>
              {staffError}
            </div>
          )}

          {/* Selected Staff KPI Cards */}
          {staffAuditData && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.5)", border: "1px solid var(--border, #334155)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>Recorded Days</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px" }}>
                  {staffAuditData.summary.present + staffAuditData.summary.absent}
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#10b981" }}>Days Present</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#10b981" }}>{staffAuditData.summary.present}</div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#ef4444" }}>Days Absent</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#ef4444" }}>{staffAuditData.summary.absent}</div>
              </div>

              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <span style={{ fontSize: "0.8rem", color: "#818cf8" }}>Attendance Rate</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "4px", color: "#818cf8" }}>{staffAuditData.summary.attendance_percentage}%</div>
              </div>
            </div>
          )}

          {/* Staff Daily Log Table */}
          {staffLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted, #94a3b8)" }}>
              Loading biometric attendance audit...
            </div>
          ) : !staffAuditData || staffAuditData.records.length === 0 ? (
            <EmptyState
              title="No Logs in Selected Period"
              message="No attendance records were marked for this staff member in the chosen date range."
            />
          ) : (
            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border, #334155)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(30, 41, 59, 0.8)", borderBottom: "1px solid var(--border, #334155)" }}>
                    <th style={{ padding: "12px 14px" }}>Date</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px" }}>Marked Time</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAuditData.records.map((r, idx) => (
                    <tr key={`${r.date}-${idx}`} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>{r.date}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <Pill tone={r.status === "present" ? "success" : r.status === "absent" ? "danger" : "neutral"}>
                          {r.status.toUpperCase()}
                        </Pill>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted, #94a3b8)" }}>
                        {formatDate(r.marked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
