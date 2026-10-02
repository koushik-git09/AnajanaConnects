import { useEffect, useState, type FormEvent } from "react"
import {
  Button,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Pill,
  ScreenTitle,
  Sheet,
} from "../components/ui"
import { employeesApi, type Employee } from "../services/api"

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

export default function Staff({
  initialAdd = false,
}: {
  initialAdd?: boolean
}) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All")
  const [searchQuery, setSearchQuery] = useState("")

  // Modal & Sheet States
  const [addOpen, setAddOpen] = useState(initialAdd)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Add Employee Form States
  const [addName, setAddName] = useState("")
  const [addCode, setAddCode] = useState("")
  const [addDesignation, setAddDesignation] = useState("Delivery Staff")
  const [addSalary, setAddSalary] = useState("")
  const [addJoiningDate, setAddJoiningDate] = useState(
    new Date().toISOString().split("T")[0],
  )
  const [addPhone, setAddPhone] = useState("")
  const [addEmail, setAddEmail] = useState("")
  const [addAddress, setAddAddress] = useState("")
  const [addSuccess, setAddSuccess] = useState(false)

  // Edit Employee Form States
  const [editName, setEditName] = useState("")
  const [editCode, setEditCode] = useState("")
  const [editDesignation, setEditDesignation] = useState("Delivery Staff")
  const [editSalary, setEditSalary] = useState("")
  const [editJoiningDate, setEditJoiningDate] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editAddress, setEditAddress] = useState("")

  // Fetch employees from MongoDB API
  const loadEmployees = async (search = searchQuery, statusFilter = filter) => {
    setLoading(true)
    setError(null)
    try {
      const res = await employeesApi.list({
        search: search.trim() || undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
      })
      setEmployees(res.items)
      setTotalCount(res.total)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to load staff roster. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Load on mount and on filter changes
  useEffect(() => {
    loadEmployees(searchQuery, filter)
  }, [filter])

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmployees(searchQuery, filter)
    }, 280)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset Add Form
  const resetAddForm = () => {
    setAddName("")
    setAddCode(`EMP00${employees.length + 1}`)
    setAddDesignation("Delivery Staff")
    setAddSalary("")
    setAddJoiningDate(new Date().toISOString().split("T")[0])
    setAddPhone("")
    setAddEmail("")
    setAddAddress("")
    setFormError(null)
    setAddSuccess(false)
  }

  // Start Edit Mode
  const startEdit = (emp: Employee) => {
    setEditName(emp.name)
    setEditCode(emp.employee_code)
    setEditDesignation(emp.designation)
    setEditSalary(emp.salary.toString())
    setEditJoiningDate(emp.joining_date)
    setEditPhone(emp.phone || "")
    setEditEmail(emp.email || "")
    setEditAddress(emp.address || "")
    setFormError(null)
    setIsEditing(true)
  }

  // Handle Add Form Submission
  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!addName.trim()) {
      setFormError("Employee name is required.")
      return
    }
    if (!addCode.trim()) {
      setFormError("Employee code is required.")
      return
    }
    const salaryNum = parseFloat(addSalary)
    if (isNaN(salaryNum) || salaryNum < 0) {
      setFormError("Please enter a valid monthly salary (minimum 0).")
      return
    }

    setActionLoading(true)
    try {
      const created = await employeesApi.create({
        name: addName.trim(),
        employee_code: addCode.trim().toUpperCase(),
        designation: addDesignation,
        salary: salaryNum,
        joining_date: addJoiningDate,
        phone: addPhone.trim() || undefined,
        email: addEmail.trim() || undefined,
        address: addAddress.trim() || undefined,
      })
      setAddSuccess(true)
      // Append to list or reload
      setEmployees((prev) => [created, ...prev])
      setTotalCount((c) => c + 1)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError("Failed to register employee.")
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Edit Form Submission
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setFormError(null)

    const salaryNum = parseFloat(editSalary)
    if (isNaN(salaryNum) || salaryNum < 0) {
      setFormError("Please enter a valid monthly salary.")
      return
    }

    setActionLoading(true)
    try {
      const updated = await employeesApi.update(selected.id, {
        name: editName.trim(),
        employee_code: editCode.trim().toUpperCase(),
        designation: editDesignation,
        salary: salaryNum,
        joining_date: editJoiningDate,
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
      })

      // Update state
      setSelected(updated)
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === updated.id ? updated : emp)),
      )
      setIsEditing(false)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError("Failed to update employee details.")
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle Employee Status
  const handleToggleStatus = async (emp: Employee) => {
    const nextStatus = emp.status === "active" ? "inactive" : "active"
    const confirmMessage =
      nextStatus === "inactive"
        ? `Are you sure you want to deactivate ${emp.name}? They will be marked inactive but historical records will be preserved.`
        : `Reactivate ${emp.name} as active agency staff?`

    if (!window.confirm(confirmMessage)) return

    setActionLoading(true)
    try {
      const updated = await employeesApi.updateStatus(emp.id, nextStatus)
      setSelected(updated)
      setEmployees((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e)),
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to change status.")
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Employee
  const handleDelete = async (emp: Employee) => {
    if (
      !window.confirm(
        `Permanently remove ${emp.name} (${emp.employee_code}) from the agency roster?`,
      )
    ) {
      return
    }

    setActionLoading(true)
    try {
      await employeesApi.delete(emp.id)
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id))
      setTotalCount((c) => Math.max(0, c - 1))
      setSelected(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete employee.")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <main className="screen">
      <ScreenTitle
        eyebrow="Staff Directory"
        action={
          <IconButton
            icon="plus"
            label="Add new staff member"
            onClick={() => {
              resetAddForm()
              setAddOpen(true)
            }}
          />
        }
      >
        Agency Staff
      </ScreenTitle>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            background: "var(--status-absent-soft)",
            border: "1px solid var(--status-absent)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            color: "var(--status-absent)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <Button variant="ghost" onClick={() => loadEmployees()}>
            Retry
          </Button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="searchbox">
        <Icon name="search" size={19} />
        <input
          aria-label="Search staff by name or code"
          placeholder="Search by name, role, code (e.g. EMP001), or phone"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              border: 0,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
            }}
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      {/* Segmented Filter Pills */}
      <div className="segmented">
        {(["All", "Active", "Inactive"] as const).map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item} {filter === item ? `(${totalCount})` : ""}
          </button>
        ))}
      </div>

      {/* List Metadata Header */}
      <div className="list-meta">
        <p>
          Showing <strong>{employees.length}</strong> of {totalCount} registered staff
        </p>
        {(searchQuery || filter !== "All") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("")
              setFilter("All")
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: "68px",
                borderRadius: "var(--radius-sm)",
              }}
            />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <section className="people-list">
          {searchQuery || filter !== "All" ? (
            <EmptyState
              title="No matching staff members"
              message={`No personnel matched your filter or search query "${searchQuery}".`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("")
                    setFilter("All")
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No staff members registered yet"
              message="Add your first employee to start managing agency operations, attendance, and payroll."
              action={
                <Button
                  icon="plus"
                  onClick={() => {
                    resetAddForm()
                    setAddOpen(true)
                  }}
                >
                  Add First Employee
                </Button>
              }
            />
          )}
        </section>
      ) : (
        /* Real MongoDB Staff List */
        <section className="people-list">
          {employees.map((person) => {
            const avatarColor = getAvatarColor(person.employee_code || person.name)
            const initials = getInitials(person.name)
            return (
              <button
                key={person.id}
                className="person-row"
                onClick={() => {
                  setIsEditing(false)
                  setSelected(person)
                }}
                type="button"
              >
                <span className={`initial-avatar ${avatarColor}`}>
                  {initials}
                </span>
                <span className="person-copy">
                  <strong>{person.name}</strong>
                  <span>
                    {person.employee_code} · {person.designation} · ₹
                    {person.salary.toLocaleString("en-IN")}/mo
                  </span>
                </span>
                <Pill tone={person.status === "active" ? "success" : "neutral"}>
                  {person.status === "active" ? "Active" : "Inactive"}
                </Pill>
                <Icon name="chevron" size={17} />
              </button>
            )
          })}
        </section>
      )}

      {/* Add Staff Sheet / Modal */}
      {addOpen && (
        <Sheet onClose={() => setAddOpen(false)}>
          {!addSuccess ? (
            <form className="form" onSubmit={handleAddSubmit}>
              <div className="sheet-title">
                <div>
                  <p className="eyebrow">Personnel Registration</p>
                  <h2>Add New Staff</h2>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 14px",
                    background: "var(--status-absent-soft)",
                    border: "1px solid var(--status-absent)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    color: "var(--status-absent)",
                  }}
                >
                  {formError}
                </div>
              )}

              <p className="form-section-title">Personal Details</p>
              <div className="form-grid">
                <Field
                  label="Full Name *"
                  placeholder="e.g. Ramesh Chandra"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
                <Field
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                />
              </div>

              <Field
                label="Email Address"
                type="email"
                placeholder="ramesh@agency.in"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />

              <p className="form-section-title">Designation & Role</p>
              <div className="choice-row">
                {["Delivery Staff", "Driver", "Accounts", "Office Assistant"].map(
                  (role) => (
                    <button
                      key={role}
                      type="button"
                      className={addDesignation === role ? "selected" : ""}
                      onClick={() => setAddDesignation(role)}
                    >
                      {addDesignation === role && <Icon name="check" size={14} />}
                      {role}
                    </button>
                  ),
                )}
              </div>

              <p className="form-section-title">Terms & Identification</p>
              <div className="form-grid">
                <Field
                  label="Employee Code *"
                  placeholder="EMP001"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  required
                />
                <Field
                  label="Monthly Base Salary (₹) *"
                  type="number"
                  placeholder="15000"
                  value={addSalary}
                  onChange={(e) => setAddSalary(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid">
                <Field
                  label="Joining Date *"
                  type="date"
                  value={addJoiningDate}
                  onChange={(e) => setAddJoiningDate(e.target.value)}
                  required
                />
                <Field
                  label="Residential Address"
                  placeholder="Street / Area / Ward"
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                />
              </div>

              <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
                <Button block type="submit" loading={actionLoading}>
                  {actionLoading ? "Registering Employee…" : "Save Staff Member"}
                </Button>
                <Button
                  block
                  variant="ghost"
                  type="button"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="success-panel">
              <span className="success-mark">
                <Icon name="check" size={32} />
              </span>
              <h2>Staff Added Successfully</h2>
              <p>
                <strong>{addName}</strong> ({addCode}) has been registered in the agency staff database.
              </p>
              <Button block onClick={() => setAddOpen(false)}>
                Return to Staff List
              </Button>
            </div>
          )}
        </Sheet>
      )}

      {/* Staff Profile & Edit Sheet */}
      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          {!isEditing ? (
            /* View Employee Profile Mode */
            <>
              <div className="profile-head">
                <span
                  className={`initial-avatar xl ${getAvatarColor(
                    selected.employee_code || selected.name,
                  )}`}
                >
                  {getInitials(selected.name)}
                </span>
                <div>
                  <p className="eyebrow">{selected.employee_code}</p>
                  <h2>{selected.name}</h2>
                  <p>{selected.designation}</p>
                </div>
              </div>

              <div className="profile-stats">
                <div>
                  <p>Monthly Base Salary</p>
                  <strong>₹{selected.salary.toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <p>Staff Status</p>
                  <strong
                    style={{
                      color:
                        selected.status === "active"
                          ? "var(--status-present)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {selected.status === "active" ? "Active" : "Inactive"}
                  </strong>
                </div>
              </div>

              <div className="detail-list">
                <p>
                  <span>
                    <Icon name="phone" size={16} /> Contact Phone
                  </span>
                  <strong>{selected.phone || "Not specified"}</strong>
                </p>
                <p>
                  <span>
                    <Icon name="briefcase" size={16} /> Contact Email
                  </span>
                  <strong>{selected.email || "Not specified"}</strong>
                </p>
                <p>
                  <span>
                    <Icon name="calendar" size={16} /> Joining Date
                  </span>
                  <strong>{selected.joining_date}</strong>
                </p>
                {selected.address && (
                  <p>
                    <span>
                      <Icon name="home" size={16} /> Address
                    </span>
                    <strong>{selected.address}</strong>
                  </p>
                )}
                <p>
                  <span>
                    <Icon name="shield" size={16} /> Biometric Roster Status
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--brand-blue)" }}>
                    Ready for Face Enrollment (Phase 8)
                  </span>
                </p>
              </div>

              <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                <Button
                  block
                  variant="secondary"
                  icon="edit"
                  onClick={() => startEdit(selected)}
                >
                  Edit Profile
                </Button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <Button
                    variant={selected.status === "active" ? "ghost" : "soft"}
                    onClick={() => handleToggleStatus(selected)}
                    loading={actionLoading}
                    style={{
                      color:
                        selected.status === "active"
                          ? "var(--status-leave)"
                          : "var(--status-present)",
                    }}
                  >
                    {selected.status === "active" ? "Deactivate" : "Reactivate"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(selected)}
                    loading={actionLoading}
                    style={{ color: "var(--status-absent)" }}
                  >
                    Delete Staff
                  </Button>
                </div>

                <Button
                  block
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
              </div>
            </>
          ) : (
            /* Edit Employee Mode */
            <form className="form" onSubmit={handleEditSubmit}>
              <div className="sheet-title">
                <div>
                  <p className="eyebrow">Editing Staff Profile</p>
                  <h2>Update Details</h2>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 14px",
                    background: "var(--status-absent-soft)",
                    border: "1px solid var(--status-absent)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    color: "var(--status-absent)",
                  }}
                >
                  {formError}
                </div>
              )}

              <div className="form-grid">
                <Field
                  label="Full Name *"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
                <Field
                  label="Employee Code *"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid">
                <Field
                  label="Phone Number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
                <Field
                  label="Email Address"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <p className="form-section-title">Designation & Role</p>
              <div className="choice-row">
                {["Delivery Staff", "Driver", "Accounts", "Office Assistant"].map(
                  (role) => (
                    <button
                      key={role}
                      type="button"
                      className={editDesignation === role ? "selected" : ""}
                      onClick={() => setEditDesignation(role)}
                    >
                      {editDesignation === role && <Icon name="check" size={14} />}
                      {role}
                    </button>
                  ),
                )}
              </div>

              <div className="form-grid">
                <Field
                  label="Monthly Base Salary (₹) *"
                  type="number"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  required
                />
                <Field
                  label="Joining Date"
                  type="date"
                  value={editJoiningDate}
                  onChange={(e) => setEditJoiningDate(e.target.value)}
                />
              </div>

              <Field
                label="Residential Address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />

              <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
                <Button block type="submit" loading={actionLoading}>
                  {actionLoading ? "Saving Changes…" : "Update Employee"}
                </Button>
                <Button
                  block
                  variant="ghost"
                  type="button"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel Edit
                </Button>
              </div>
            </form>
          )}
        </Sheet>
      )}
    </main>
  )
}
