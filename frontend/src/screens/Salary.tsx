import { useEffect, useState } from "react"
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
import { salaryApi, type SalaryMonthlyResponse, type SalaryEmployeeItem } from "../services/api"

const AVATAR_COLORS = ["clay", "sage", "blue", "gold", "plum"]

function getAvatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function Salary({
  onNavigateToSettings,
}: {
  onNavigateToSettings?: () => void
}) {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState<number>(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [payroll, setPayroll] = useState<SalaryMonthlyResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SalaryEmployeeItem | null>(null)

  useEffect(() => {
    loadPayroll(year, month)
  }, [year, month])

  async function loadPayroll(y: number, m: number) {
    setLoading(true)
    setError(null)
    try {
      const data = await salaryApi.getMonthly({ year: y, month: m })
      setPayroll(data)
    } catch (err: any) {
      setError(err.message || "Failed to load live payroll data.")
    } finally {
      setLoading(false)
    }
  }

  function handlePrevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Financial Operations & Payroll"
        action={
          <IconButton
            icon="download"
            label="Refresh Payroll"
            onClick={() => loadPayroll(year, month)}
          />
        }
      >
        Agency Payroll
      </ScreenTitle>

      {/* Month Navigation Control */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "8px",
        }}
      >
        <button
          className="month-picker"
          type="button"
          onClick={handlePrevMonth}
          style={{ padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
            <Icon name="chevron" size={16} />
          </span>
          <span>Previous</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon name="calendar" size={18} />
          <strong style={{ fontSize: "1.05rem" }}>
            {payroll?.month_name || new Date(year, month - 1, 1).toLocaleString("default", { month: "long" })} {year}
          </strong>
        </div>

        <button
          className="month-picker"
          type="button"
          onClick={handleNextMonth}
          style={{ padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span>Next</span>
          <Icon name="chevron" size={16} />
        </button>
      </div>

      {/* Agency Default Cutoff Status Notice */}
      {payroll && payroll.agency_default_daily_cutoff === null && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid #f59e0b",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <strong style={{ color: "#d97706" }}>Agency Default Cutoff Not Set</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Employees without an individual cutoff will not have absence deductions until defined in Settings.
            </p>
          </div>
          <Button variant="secondary" onClick={() => (onNavigateToSettings ? onNavigateToSettings() : navigate("/settings"))}>
            Configure in Settings
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: "grid", gap: "14px" }}>
          <div className="skeleton" style={{ height: "180px", borderRadius: "14px" }} />
          <div className="skeleton" style={{ height: "70px", borderRadius: "10px" }} />
          <div className="skeleton" style={{ height: "70px", borderRadius: "10px" }} />
        </div>
      ) : error ? (
        <EmptyState
          title="Error loading payroll"
          message={error}
          action={
            <Button onClick={() => loadPayroll(year, month)}>
              Retry
            </Button>
          }
        />
      ) : payroll ? (
        <>
          {/* Hero Net Salary Command Card */}
          <section className="payroll-hero">
            <p>Total Net Salary Payable ({payroll.month_name} {payroll.year})</p>
            <h2>₹{payroll.total_net_payable.toLocaleString("en-IN")}</h2>
            <div>
              <span>
                <small>Total Gross Base</small>
                <strong>₹{payroll.total_base_salary.toLocaleString("en-IN")}</strong>
              </span>
              <span>
                <small>Absence Deductions</small>
                <strong style={{ color: payroll.total_deductions > 0 ? "var(--status-absent)" : "inherit" }}>
                  − ₹{payroll.total_deductions.toLocaleString("en-IN")}
                </strong>
              </span>
            </div>
            {payroll.agency_default_daily_cutoff !== null && (
              <div style={{ marginTop: "12px", fontSize: "0.82rem", opacity: 0.85 }}>
                Agency Default Daily Cutoff: <strong>₹{payroll.agency_default_daily_cutoff} / day</strong>
              </div>
            )}
          </section>

          {/* Staff Payroll Register */}
          <div className="section-heading salary-heading" style={{ marginTop: "20px" }}>
            <h2>Employee Salaries</h2>
            <Pill tone="neutral">{payroll.total_employees} Staff Members</Pill>
          </div>

          {payroll.items.length === 0 ? (
            <EmptyState
              title="No employees found"
              message="No staff members are registered in the agency system for this month."
            />
          ) : (
            <section className="salary-list">
              {payroll.items.map((record) => {
                const avatarColor = getAvatarColor(record.employee_code || record.name)
                const initials = getInitials(record.name)
                return (
                  <button
                    key={record.employee_id}
                    onClick={() => setSelected(record)}
                    type="button"
                    style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
                  >
                    <span className={`initial-avatar ${avatarColor}`}>
                      {initials}
                    </span>
                    <span className="person-copy">
                      <strong>{record.name}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                        <span>{record.employee_code} · {record.designation}</span>
                        {record.absent_days > 0 ? (
                          <span style={{ color: "var(--status-absent)", fontWeight: 500 }}>
                            · {record.absent_days}d absent
                          </span>
                        ) : (
                          <span style={{ color: "var(--status-present)", fontWeight: 500 }}>
                            · 0d absent
                          </span>
                        )}
                        {record.effective_daily_cutoff !== null && record.effective_daily_cutoff !== undefined ? (
                          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            (₹{record.effective_daily_cutoff}/d · {record.cutoff_source === "individual" ? "Individual" : "Agency"})
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.78rem", color: "#f59e0b" }}>
                            (No cutoff set)
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="salary-amount">
                      <strong>₹{record.calculated_salary.toLocaleString("en-IN")}</strong>
                      <small>
                        {record.absence_deduction > 0
                          ? `−₹${record.absence_deduction.toLocaleString("en-IN")} ded.`
                          : "Net Payable"}
                      </small>
                    </span>
                    <Icon name="chevron" size={17} />
                  </button>
                )
              })}
            </section>
          )}
        </>
      ) : null}

      {/* Itemized Payslip Sheet / Modal */}
      {selected && payroll && (
        <Sheet onClose={() => setSelected(null)}>
          <div className="salary-detail-head">
            <span className={`initial-avatar xl ${getAvatarColor(selected.employee_code || selected.name)}`}>
              {getInitials(selected.name)}
            </span>
            <div>
              <p className="eyebrow">Itemized Payroll · {payroll.month_name} {payroll.year}</p>
              <h2>{selected.name}</h2>
              <p>{selected.employee_code} · {selected.designation}</p>
            </div>
          </div>

          <div className="salary-breakdown">
            <p>
              <span>Base Monthly Salary</span>
              <strong>₹{selected.base_salary.toLocaleString("en-IN")}</strong>
            </p>
            <hr />
            <p>
              <span>Total Days in Month</span>
              <strong>{selected.total_days_in_month} Days</strong>
            </p>
            <p>
              <span>Eligible Working Days</span>
              <strong>{selected.eligible_days} Days</strong>
            </p>
            <p>
              <span>Days Present</span>
              <strong style={{ color: "var(--status-present)" }}>{selected.present_days} Days</strong>
            </p>
            <p>
              <span>Days Marked Absent</span>
              <strong style={{ color: selected.absent_days > 0 ? "var(--status-absent)" : "inherit" }}>
                {selected.absent_days} Days
              </strong>
            </p>
            <p>
              <span>Half Days</span>
              <strong>{selected.half_days} Days</strong>
            </p>
            <p>
              <span>Unmarked Days (Not Deducted)</span>
              <strong>{selected.unmarked_days} Days</strong>
            </p>
            <hr />
            <p>
              <span>Daily Salary Cutoff Rate</span>
              <strong>
                {selected.effective_daily_cutoff !== null && selected.effective_daily_cutoff !== undefined
                  ? `₹${selected.effective_daily_cutoff} / day`
                  : "Not configured (₹0)"}
              </strong>
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "-4px 0 6px 0" }}>
              Cutoff Source:{" "}
              <strong>
                {selected.cutoff_source === "individual"
                  ? "Individual Employee Override"
                  : selected.cutoff_source === "agency_default"
                  ? "Agency Default Cutoff"
                  : "Not Set"}
              </strong>
            </p>
            <p className="deduction">
              <span>Attendance Deduction ({selected.absent_days} absent days)</span>
              <strong style={{ color: "var(--status-absent)" }}>
                − ₹{selected.absence_deduction.toLocaleString("en-IN")}
              </strong>
            </p>
            <hr />
            <div>
              <span>Net Salary Payable</span>
              <strong style={{ fontSize: "1.2rem", color: "var(--brand-primary, #10b981)" }}>
                ₹{selected.calculated_salary.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
            <Button
              block
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Close Payslip Breakdown
            </Button>
          </div>
        </Sheet>
      )}
    </main>
  )
}
