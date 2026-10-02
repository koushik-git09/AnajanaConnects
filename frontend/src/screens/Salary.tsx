import { useState } from "react"
import {
  Button,
  Icon,
  IconButton,
  Pill,
  ScreenTitle,
  Sheet,
} from "../components/ui"
import { salaryRecords } from "../data"

export default function Salary() {
  const [selected, setSelected] = useState<typeof salaryRecords[number] | null>(
    null,
  )

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Financial Operations"
        action={<IconButton icon="download" label="Export payroll register (PDF/CSV)" />}
      >
        Agency Payroll
      </ScreenTitle>

      {/* Month Selector */}
      <button className="month-picker" type="button" aria-label="Select payroll month">
        <Icon name="calendar" size={18} />
        <span>September 2026</span>
        <Icon name="chevron" size={17} />
      </button>

      {/* Hero Net Salary Command Card */}
      <section className="payroll-hero">
        <p>Total Net Payable</p>
        <h2>₹2,22,500</h2>
        <div>
          <span>
            <small>Gross Salary</small>
            <strong>₹2,35,000</strong>
          </span>
          <span>
            <small>Absence Deductions</small>
            <strong>₹12,500</strong>
          </span>
        </div>
        <Button
          variant="secondary"
          block
          icon="check"
        >
          Verify & Approve Payroll
        </Button>
      </section>

      {/* Staff Payroll Register */}
      <div className="section-heading salary-heading">
        <h2>Employee Salaries</h2>
        <Pill tone="neutral">25 Staff Members</Pill>
      </div>

      <section className="salary-list">
        {salaryRecords.map((record) => (
          <button
            key={record.id}
            onClick={() => setSelected(record)}
            type="button"
          >
            <span className={`initial-avatar ${record.color}`}>
              {record.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="person-copy">
              <strong>{record.name}</strong>
              <span>{record.detail}</span>
            </span>
            <span className="salary-amount">
              <strong>{record.net}</strong>
              <small>Net Payable</small>
            </span>
            <Icon name="chevron" size={17} />
          </button>
        ))}
      </section>

      {/* Itemized Payslip Sheet / Modal */}
      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <div className="salary-detail-head">
            <span className={`initial-avatar xl ${selected.color}`}>
              {selected.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <p className="eyebrow">Salary Slip · September 2026</p>
              <h2>{selected.name}</h2>
              <p>{selected.id} · HP Gas Staff</p>
            </div>
          </div>

          <div className="salary-breakdown">
            <p>
              <span>Base Monthly Salary</span>
              <strong>{selected.base}</strong>
            </p>
            <hr />
            <p>
              <span>Days Present</span>
              <strong>25 Days</strong>
            </p>
            <p>
              <span>Days Absent</span>
              <strong>3 Days</strong>
            </p>
            <p>
              <span>Approved Leave</span>
              <strong>2 Days</strong>
            </p>
            <p>
              <span>Half Days</span>
              <strong>0 Days</strong>
            </p>
            <hr />
            <p className="deduction">
              <span>Attendance Deduction (3 days)</span>
              <strong>− ₹1,500</strong>
            </p>
            <p>
              <span>EPF / ESI Deductions</span>
              <strong>₹0</strong>
            </p>
            <p>
              <span>Incentives & Allowances</span>
              <strong>₹0</strong>
            </p>
            <div>
              <span>Net Salary Payable</span>
              <strong>{selected.net}</strong>
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <Button block icon="download">
              Download Official Pay Slip
            </Button>
            <Button
              block
              variant="secondary"
              icon="attendance"
              onClick={() => setSelected(null)}
            >
              Inspect Attendance Log
            </Button>
          </div>
        </Sheet>
      )}
    </main>
  )
}
