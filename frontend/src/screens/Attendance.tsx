import { useState } from "react"
import {
  Button,
  Icon,
  IconButton,
  Pill,
  ScreenTitle,
  Sheet,
} from "../components/ui"
import { staff } from "../data"

type Status = "Present" | "Absent" | "Leave" | "Half day"

export default function Attendance({
  initialManual = false,
}: {
  initialManual?: boolean
}) {
  const [camera, setCamera] = useState(false)
  const [recognized, setRecognized] = useState(false)
  const [manual, setManual] = useState(initialManual)
  const [saved, setSaved] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, Status>>({
    EMP001: "Present",
    EMP002: "Present",
    EMP003: "Absent",
    EMP004: "Leave",
    EMP005: "Present",
  })

  const statusTone = (status: Status) =>
    status === "Present"
      ? "success"
      : status === "Absent"
        ? "danger"
        : "warning"

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Monday, 28 September"
        action={<IconButton icon="calendar" label="Choose date" />}
      >
        Attendance
      </ScreenTitle>
      <section className="attendance-summary">
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
          <p>Leave</p>
        </div>
      </section>
      <section className="action-panel">
        <button
          className="attendance-action primary-action"
          onClick={() => {
            setCamera(true)
            setRecognized(false)
          }}
        >
          <span>
            <Icon name="camera" size={25} />
          </span>
          <div>
            <strong>Face attendance</strong>
            <p>Fast camera check-in</p>
          </div>
          <Icon name="chevron" />
        </button>
        <button className="attendance-action" onClick={() => setManual(true)}>
          <span>
            <Icon name="edit" size={24} />
          </span>
          <div>
            <strong>Manual attendance</strong>
            <p>Mark or correct status</p>
          </div>
          <Icon name="chevron" />
        </button>
      </section>
      <section className="section record-section">
        <div className="section-heading">
          <h2>Today’s records</h2>
          <button className="text-action">View all</button>
        </div>
        {staff.slice(0, 4).map((person, index) => (
          <article className="attendance-row" key={person.id}>
            <span className={`initial-avatar ${person.color}`}>
              {person.initials}
            </span>
            <div>
              <strong>{person.name}</strong>
              <p>
                {index === 3
                  ? "No check-in"
                  : `Checked in · 0${9 + index}:0${index + 2} AM`}
              </p>
            </div>
            <Pill tone={index === 3 ? "warning" : "success"}>
              {index === 3 ? "Leave" : "Present"}
            </Pill>
          </article>
        ))}
      </section>

      {camera && (
        <div className="camera-layer">
          <header>
            <IconButton
              icon="chevron"
              label="Close camera"
              onClick={() => setCamera(false)}
            />
            <div>
              <p>Face attendance</p>
              <span>Secure check-in</span>
            </div>
            <span />
          </header>
          {!recognized ? (
            <div className="scanner">
              <div className="scan-frame">
                <span />
                <span />
                <span />
                <span />
                <div className="scan-line" />
                <div className="face-guide">
                  <div />
                  <span />
                </div>
              </div>
              <div className="scan-copy">
                <span className="live-dot" />
                <h2>Looking for your face…</h2>
                <p>Hold still and look directly at the camera.</p>
              </div>
              <Button onClick={() => setRecognized(true)}>
                Simulate recognition
              </Button>
            </div>
          ) : (
            <div className="recognition-success">
              <span className="success-mark">
                <Icon name="check" size={30} />
              </span>
              <p className="eyebrow">Attendance marked</p>
              <h2>Ravi Kumar</h2>
              <p>EMP001 · Delivery Staff</p>
              <div className="checkin-card">
                <span>
                  <Icon name="clock" />
                </span>
                <div>
                  <p>Check-in</p>
                  <strong>09:05 AM</strong>
                </div>
                <Pill tone="success">On time</Pill>
              </div>
              <Button block onClick={() => setCamera(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}

      {manual && (
        <Sheet onClose={() => setManual(false)}>
          <div className="sheet-title">
            <div>
              <p className="eyebrow">28 September 2026</p>
              <h2>Manual attendance</h2>
            </div>
            <Pill tone="neutral">5 staff</Pill>
          </div>
          <div className="searchbox">
            <Icon name="search" size={19} />
            <input
              aria-label="Search employees"
              placeholder="Search employee"
            />
          </div>
          <div className="manual-list">
            {staff.map((person) => (
              <article key={person.id}>
                <span className={`initial-avatar ${person.color}`}>
                  {person.initials}
                </span>
                <div>
                  <strong>{person.name}</strong>
                  <p>{person.role}</p>
                </div>
                <select
                  aria-label={`${person.name} status`}
                  className={`status-select ${statusTone(statuses[person.id])}`}
                  value={statuses[person.id]}
                  onChange={(event) =>
                    setStatuses({
                      ...statuses,
                      [person.id]: event.target.value as Status,
                    })
                  }
                >
                  <option>Present</option>
                  <option>Absent</option>
                  <option>Leave</option>
                  <option>Half day</option>
                </select>
              </article>
            ))}
          </div>
          <Button block onClick={() => setSaved(true)}>
            {saved ? "Attendance saved" : "Save attendance"}
          </Button>
          {saved && (
            <p className="inline-success">
              <Icon name="check" size={16} /> 5 attendance records updated
              successfully.
            </p>
          )}
        </Sheet>
      )}
    </main>
  )
}
