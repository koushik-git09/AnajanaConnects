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
        eyebrow="Payroll"
        action={<IconButton icon="download" label="Download report" />}
      >
        Salary
      </ScreenTitle>
      <button className="month-picker">
        <Icon name="calendar" />
        <span>September 2026</span>
        <Icon name="chevron" size={17} />
      </button>
      <section className="payroll-hero">
        <p>Net payable</p>
        <h2>₹2,22,500</h2>
        <div>
          <span>
            <small>Gross salary</small>
            <strong>₹2,35,000</strong>
          </span>
          <span>
            <small>Deductions</small>
            <strong>₹12,500</strong>
          </span>
        </div>
        <Button variant="secondary" block icon="check">
          Review payroll
        </Button>
      </section>
      <div className="section-heading salary-heading">
        <h2>Employee salaries</h2>
        <Pill tone="neutral">25 employees</Pill>
      </div>
      <section className="salary-list">
        {salaryRecords.map((record) => (
          <button key={record.id} onClick={() => setSelected(record)}>
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
              <small>Net salary</small>
            </span>
            <Icon name="chevron" size={17} />
          </button>
        ))}
      </section>
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
              <p className="eyebrow">September 2026</p>
              <h2>{selected.name}</h2>
              <p>{selected.id}</p>
            </div>
          </div>
          <div className="salary-breakdown">
            <p>
              <span>Base salary</span>
              <strong>{selected.base}</strong>
            </p>
            <hr />
            <p>
              <span>Present days</span>
              <strong>25</strong>
            </p>
            <p>
              <span>Absent days</span>
              <strong>3</strong>
            </p>
            <p>
              <span>Leave days</span>
              <strong>2</strong>
            </p>
            <p>
              <span>Half days</span>
              <strong>0</strong>
            </p>
            <hr />
            <p className="deduction">
              <span>Absence deduction</span>
              <strong>− ₹1,500</strong>
            </p>
            <p>
              <span>Other adjustment</span>
              <strong>₹0</strong>
            </p>
            <div>
              <span>Net salary</span>
              <strong>{selected.net}</strong>
            </div>
          </div>
          <Button block icon="download">
            Download salary slip
          </Button>
          <Button block variant="ghost" icon="attendance">
            View attendance
          </Button>
        </Sheet>
      )}
    </main>
  )
}
