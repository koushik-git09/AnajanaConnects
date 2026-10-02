import { useState } from "react"
import {
  Avatar,
  Button,
  Field,
  Icon,
  IconButton,
  Pill,
  ScreenTitle,
  Sheet,
} from "../components/ui"
import { staff } from "../data"

export default function Staff({
  initialAdd = false,
}: {
  initialAdd?: boolean
}) {
  const [filter, setFilter] = useState("All")
  const [addOpen, setAddOpen] = useState(initialAdd)
  const [selected, setSelected] = useState<typeof staff[number] | null>(null)
  const [saved, setSaved] = useState(false)
  const visible = staff.filter(
    (person) => filter === "All" || person.status === filter,
  )

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Team management"
        action={
          <IconButton
            icon="plus"
            label="Add staff"
            onClick={() => setAddOpen(true)}
          />
        }
      >
        Staff
      </ScreenTitle>
      <div className="searchbox">
        <Icon name="search" size={19} />
        <input
          aria-label="Search staff"
          placeholder="Search by name or employee ID"
        />
      </div>
      <div className="segmented">
        {["All", "Active", "On leave"].map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="list-meta">
        <p>
          <strong>{visible.length}</strong> staff members
        </p>
        <button>
          <Icon name="more" />
        </button>
      </div>
      <section className="people-list">
        {visible.map((person) => (
          <button
            key={person.id}
            className="person-row"
            onClick={() => setSelected(person)}
          >
            <span className={`initial-avatar ${person.color}`}>
              {person.initials}
            </span>
            <span className="person-copy">
              <strong>{person.name}</strong>
              <span>
                {person.id} · {person.role}
              </span>
            </span>
            <Pill tone={person.status === "Active" ? "success" : "warning"}>
              {person.status}
            </Pill>
            <Icon name="chevron" size={17} />
          </button>
        ))}
      </section>

      {addOpen && (
        <Sheet onClose={() => setAddOpen(false)}>
          {!saved ? (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault()
                setSaved(true)
              }}
            >
              <div className="sheet-title">
                <div>
                  <p className="eyebrow">New team member</p>
                  <h2>Add employee</h2>
                </div>
                <IconButton icon="more" label="More options" />
              </div>
              <p className="form-section-title">Personal information</p>
              <Field
                label="Full name"
                placeholder="Enter employee name"
                required
              />
              <div className="form-grid">
                <Field label="Employee ID" defaultValue="EMP006" />
                <Field label="Phone number" placeholder="+91" />
              </div>
              <Field label="Designation" placeholder="Choose designation" />
              <Field label="Joining date" type="date" />
              <p className="form-section-title">Salary information</p>
              <div className="form-grid">
                <Field label="Monthly salary" placeholder="₹ 0" />
                <Field label="Daily cutoff" placeholder="₹ 0" />
              </div>
              <p className="form-section-title">Attendance method</p>
              <div className="choice-row">
                <button type="button">Face</button>
                <button type="button">Manual</button>
                <button type="button" className="selected">
                  Both <Icon name="check" size={15} />
                </button>
              </div>
              <Button block type="submit">
                Save employee
              </Button>
            </form>
          ) : (
            <div className="success-panel">
              <span className="success-mark">
                <Icon name="check" size={28} />
              </span>
              <h2>Employee created</h2>
              <p>
                The employee is ready. Register their face now or do it later
                from their profile.
              </p>
              <Button block icon="camera">
                Register face
              </Button>
              <Button
                block
                variant="ghost"
                onClick={() => {
                  setSaved(false)
                  setAddOpen(false)
                }}
              >
                Done
              </Button>
            </div>
          )}
        </Sheet>
      )}

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          <div className="profile-head">
            <span className={`initial-avatar xl ${selected.color}`}>
              {selected.initials}
            </span>
            <div>
              <Pill tone="success">{selected.status}</Pill>
              <h2>{selected.name}</h2>
              <p>
                {selected.id} · {selected.role}
              </p>
            </div>
          </div>
          <div className="profile-stats">
            <div>
              <p>Monthly salary</p>
              <strong>₹15,000</strong>
            </div>
            <div>
              <p>Daily cutoff</p>
              <strong>₹500</strong>
            </div>
          </div>
          <div className="detail-list">
            <p>
              <span>
                <Icon name="phone" /> Phone
              </span>
              <strong>+91 98765 43210</strong>
            </p>
            <p>
              <span>
                <Icon name="calendar" /> Joined
              </span>
              <strong>12 Jan 2024</strong>
            </p>
            <p>
              <span>
                <Icon name="camera" /> Face registration
              </span>
              <Pill tone="success">Registered</Pill>
            </p>
          </div>
          <Button block variant="secondary" icon="edit">
            Edit employee
          </Button>
          <Button block variant="ghost" icon="camera">
            Update face
          </Button>
        </Sheet>
      )}
    </main>
  )
}
