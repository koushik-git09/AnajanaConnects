function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").trim().replace(/\/+$/, "")
  return envUrl.endsWith("/api") ? envUrl : `${envUrl}/api`
}

const API_BASE_URL = getApiBaseUrl()

export const TOKEN_STORAGE_KEY = "anjana_connects_access_token"

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  agency_id: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface RegistrationStatus {
  registration_allowed: boolean
  total_users: number
}

export interface Employee {
  id: string
  agency_id: string
  employee_code: string
  name: string
  phone?: string | null
  email?: string | null
  designation: string
  salary: number
  joining_date: string
  status: "active" | "inactive"
  address?: string | null
  daily_cutoff?: number | null
  effective_daily_cutoff?: number | null
  cutoff_source?: "agency_default" | "individual" | "not_set"
  created_at: string
  updated_at: string
}

export interface EmployeeCreateData {
  name: string
  employee_code: string
  designation: string
  salary: number
  joining_date: string
  phone?: string | null
  email?: string | null
  address?: string | null
  daily_cutoff?: number | null
}

export interface EmployeeUpdateData {
  name?: string
  employee_code?: string
  designation?: string
  salary?: number
  joining_date?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  daily_cutoff?: number | null
}

export interface EmployeeListResponse {
  items: Employee[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getStoredToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      0,
      "Unable to connect to the server. Please check your network connection.",
    )
  }

  if (!response.ok) {
    let detail = "An unexpected error occurred. Please try again."
    try {
      const errorData = await response.json()
      if (errorData && typeof errorData.detail === "string") {
        detail = errorData.detail
      } else if (errorData && Array.isArray(errorData.detail)) {
        detail = errorData.detail.map((e: { msg?: string }) => e.msg || "").join(", ")
      }
    } catch {
      // Use fallback error message
    }

    if (response.status === 401) {
      removeStoredToken()
    }

    throw new ApiError(response.status, detail)
  }

  return response.json() as Promise<T>
}

export const authApi = {
  async getStatus(): Promise<RegistrationStatus> {
    return apiFetch<RegistrationStatus>("/auth/status")
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  async resetPassword(token: string, new_password: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    })
  },

  async getMe(): Promise<User> {
    return apiFetch<User>("/auth/me")
  },

  async logout(): Promise<{ message: string }> {
    try {
      return await apiFetch<{ message: string }>("/auth/logout", {
        method: "POST",
      })
    } catch {
      return { message: "Logged out locally" }
    } finally {
      removeStoredToken()
    }
  },
}

export const employeesApi = {
  async list(params?: {
    search?: string
    status?: string
    designation?: string
    page?: number
    limit?: number
  }): Promise<EmployeeListResponse> {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.status && params.status !== "All") query.set("status", params.status.toLowerCase())
    if (params?.designation && params.designation !== "All") query.set("designation", params.designation)
    if (params?.page) query.set("page", params.page.toString())
    if (params?.limit) query.set("limit", params.limit.toString())

    const qs = query.toString()
    return apiFetch<EmployeeListResponse>(`/employees${qs ? `?${qs}` : ""}`)
  },

  async get(employeeId: string): Promise<Employee> {
    return apiFetch<Employee>(`/employees/${employeeId}`)
  },

  async create(data: EmployeeCreateData): Promise<Employee> {
    return apiFetch<Employee>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async update(employeeId: string, data: EmployeeUpdateData): Promise<Employee> {
    return apiFetch<Employee>(`/employees/${employeeId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  async updateStatus(employeeId: string, status: "active" | "inactive"): Promise<Employee> {
    return apiFetch<Employee>(`/employees/${employeeId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  },

  async delete(employeeId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/employees/${employeeId}`, {
      method: "DELETE",
    })
  },
}

export type AttendanceStatus = "present" | "absent" | "unmarked"

export interface AttendanceEmployee {
  employee_id: string
  employee_code: string
  name: string
  designation: string
  status: AttendanceStatus
  marked_at: string | null
  attendance_id?: string | null
}

export interface AttendanceResponse {
  date: string
  employees: AttendanceEmployee[]
  total_present: number
  total_absent: number
  total_unmarked: number
}

export interface AttendanceRecord {
  id: string
  agency_id: string
  employee_id: string
  date: string
  status: "present" | "absent"
  marked_at: string
  updated_at: string
}

export interface AttendanceHistoryRecord {
  date: string
  status: "present" | "absent"
  marked_at: string
}

export interface AttendanceSummary {
  date: string
  total_employees: number
  present: number
  absent: number
  unmarked: number
  attendance_percentage: number
}

export interface MonthlyAttendanceDaySummary {
  date: string
  total_employees: number
  present: number
  absent: number
  unmarked: number
  attendance_percentage: number
}

export interface MonthlyAttendanceSummary {
  year: number
  month: number
  total_active_employees: number
  overall_present: number
  overall_absent: number
  overall_attendance_percentage: number
  days: MonthlyAttendanceDaySummary[]
}

export interface EmployeeProfileShort {
  id: string
  employee_code: string
  name: string
  designation: string
  status: string
}

export interface EmployeeHistorySummary {
  present: number
  absent: number
  unmarked: number
  attendance_percentage: number
}

export interface EmployeeAttendanceHistoryResponse {
  employee: EmployeeProfileShort
  summary: EmployeeHistorySummary
  records: AttendanceHistoryRecord[]
}

export const attendanceApi = {
  async get(params?: {
    date?: string
    search?: string
    status?: string
  }): Promise<AttendanceResponse> {
    const query = new URLSearchParams()
    if (params?.date) query.set("date", params.date)
    if (params?.search) query.set("search", params.search)
    if (params?.status && params.status !== "All") query.set("status", params.status.toLowerCase())

    const qs = query.toString()
    return apiFetch<AttendanceResponse>(`/attendance${qs ? `?${qs}` : ""}`)
  },

  async getDailySummary(date?: string): Promise<AttendanceSummary> {
    const query = new URLSearchParams()
    if (date) query.set("date", date)
    const qs = query.toString()
    return apiFetch<AttendanceSummary>(`/attendance/summary${qs ? `?${qs}` : ""}`)
  },

  async getMonthlySummary(
    year: number,
    month: number,
  ): Promise<MonthlyAttendanceSummary> {
    return apiFetch<MonthlyAttendanceSummary>(
      `/attendance/monthly-summary?year=${year}&month=${month}`,
    )
  },

  async mark(data: {
    employee_id: string
    date: string
    status: "present" | "absent"
  }): Promise<AttendanceRecord> {
    return apiFetch<AttendanceRecord>("/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async update(
    attendanceId: string,
    status: "present" | "absent",
  ): Promise<AttendanceRecord> {
    return apiFetch<AttendanceRecord>(`/attendance/${attendanceId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  },

  async getEmployeeHistory(
    employeeId: string,
    params?: { start_date?: string; end_date?: string },
  ): Promise<EmployeeAttendanceHistoryResponse> {
    const query = new URLSearchParams()
    if (params?.start_date) query.set("start_date", params.start_date)
    if (params?.end_date) query.set("end_date", params.end_date)

    const qs = query.toString()
    return apiFetch<EmployeeAttendanceHistoryResponse>(
      `/attendance/employee/${employeeId}${qs ? `?${qs}` : ""}`,
    )
  },
}

export interface AgencySalarySettings {
  agency_id: string
  name: string
  default_daily_cutoff?: number | null
  updated_at?: string | null
}

export const agencyApi = {
  async getSettings(): Promise<AgencySalarySettings> {
    return apiFetch<AgencySalarySettings>("/agency/settings")
  },

  async updateSettings(
    payload: number | { default_daily_cutoff?: number | null; name?: string }
  ): Promise<AgencySalarySettings> {
    const body =
      typeof payload === "number"
        ? { default_daily_cutoff: payload }
        : payload
    return apiFetch<AgencySalarySettings>("/agency/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  },
}

export interface SalaryEmployeeItem {
  employee_id: string
  employee_code: string
  name: string
  designation: string
  status: string
  joining_date: string
  base_salary: number
  effective_daily_cutoff?: number | null
  cutoff_source: "agency_default" | "individual" | "not_set"
  total_days_in_month: number
  eligible_days: number
  present_days: number
  half_days: number
  absent_days: number
  unmarked_days: number
  absence_deduction: number
  calculated_salary: number
}

export interface SalaryMonthlyResponse {
  year: number
  month: number
  month_name: string
  agency_id: string
  agency_default_daily_cutoff?: number | null
  total_employees: number
  total_base_salary: number
  total_deductions: number
  total_net_payable: number
  items: SalaryEmployeeItem[]
}

export const salaryApi = {
  async getMonthly(params?: {
    year?: number
    month?: number
  }): Promise<SalaryMonthlyResponse> {
    const query = new URLSearchParams()
    if (params?.year) query.set("year", params.year.toString())
    if (params?.month) query.set("month", params.month.toString())
    const qs = query.toString()
    return apiFetch<SalaryMonthlyResponse>(`/salary/monthly${qs ? `?${qs}` : ""}`)
  },
}

export interface FaceRegistrationStatus {
  registered: boolean
  model_name?: string
  model_version?: string
  embedding_dimension?: number
  sample_count?: number
  created_at?: string
  updated_at?: string
}

export interface FaceRegistrationPayload {
  embeddings: number[][]
  model_name: string
  model_version: string
  embedding_dimension: number
}

export interface FaceDeleteResponse {
  message: string
  employee_id: string
}

export const faceApi = {
  async register(
    employeeId: string,
    data: FaceRegistrationPayload
  ): Promise<FaceRegistrationStatus> {
    return apiFetch<FaceRegistrationStatus>(`/employees/${employeeId}/face`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async getStatus(employeeId: string): Promise<FaceRegistrationStatus> {
    return apiFetch<FaceRegistrationStatus>(`/employees/${employeeId}/face`, {
      method: "GET",
    })
  },

  async delete(employeeId: string): Promise<FaceDeleteResponse> {
    return apiFetch<FaceDeleteResponse>(`/employees/${employeeId}/face`, {
      method: "DELETE",
    })
  },

  async createRecognitionSession(): Promise<FaceRecognitionSessionResponse> {
    return apiFetch<FaceRecognitionSessionResponse>("/attendance/face/session", {
      method: "POST",
    })
  },

  async markFaceAttendance(
    data: FaceAttendanceMarkRequest
  ): Promise<FaceAttendanceMarkResponse> {
    return apiFetch<FaceAttendanceMarkResponse>("/attendance/face/mark", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}

export interface FaceRecognitionEmployee {
  employee_id: string
  employee_code: string
  name: string
  embeddings: number[][]
}

export interface FaceRecognitionSessionResponse {
  session_id: string
  expires_at: string
  model_name: string
  model_version: string
  embedding_dimension: number
  employees: FaceRecognitionEmployee[]
}

export interface FaceAttendanceMarkRequest {
  recognition_session_id: string
  employee_id: string
}

export interface FaceAttendanceMarkResponse {
  status: "marked" | "already_marked" | "already_marked_absent"
  message: string
  employee_id: string
  employee_code?: string | null
  employee_name?: string | null
  date: string
  marked_at?: string | null
  attendance_status?: string | null
}

export interface DashboardEmployeesSummary {
  active: number
  inactive: number
  total: number
}

export interface DashboardTodayAttendance {
  date: string
  total_employees: number
  present: number
  absent: number
  unmarked: number
  attendance_percentage: number
}

export interface DashboardMonthAttendance {
  year: number
  month: number
  month_name: string
  total_active_employees: number
  overall_present: number
  overall_absent: number
  overall_attendance_percentage: number
}

export interface DashboardPayrollSummary {
  year: number
  month: number
  month_name: string
  total_employees: number
  total_base_salary: number
  total_absence_deduction: number
  total_net_payable: number
  agency_default_daily_cutoff?: number | null
}

export interface DashboardActivityItem {
  id: string
  employee_id: string
  employee_name: string
  employee_code: string
  status: string
  date: string
  marked_at?: string | null
  method: string
}

export interface DashboardSummaryResponse {
  agency_id: string
  agency_name: string
  employees: DashboardEmployeesSummary
  today_attendance: DashboardTodayAttendance
  month_attendance: DashboardMonthAttendance
  payroll: DashboardPayrollSummary
  recent_activity: DashboardActivityItem[]
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummaryResponse> {
    return apiFetch<DashboardSummaryResponse>("/dashboard/summary")
  },
}

export interface AttendanceReportItem {
  id: string
  date: string
  employee_id: string
  employee_code: string
  employee_name: string
  designation: string
  status: string
  marked_at?: string | null
  method: string
}

export interface AttendanceReportSummary {
  start_date: string
  end_date: string
  total_records: number
  total_present: number
  total_absent: number
  attendance_percentage: number
}

export interface AttendanceReportResponse {
  summary: AttendanceReportSummary
  items: AttendanceReportItem[]
}

export const reportsApi = {
  async getAttendanceReport(params?: {
    start_date?: string
    end_date?: string
    status?: string
    employee_id?: string
    search?: string
  }): Promise<AttendanceReportResponse> {
    const query = new URLSearchParams()
    if (params?.start_date) query.set("start_date", params.start_date)
    if (params?.end_date) query.set("end_date", params.end_date)
    if (params?.status && params.status !== "All") query.set("status", params.status.toLowerCase())
    if (params?.employee_id) query.set("employee_id", params.employee_id)
    if (params?.search) query.set("search", params.search)
    const qs = query.toString()
    return apiFetch<AttendanceReportResponse>(`/reports/attendance${qs ? `?${qs}` : ""}`)
  },

  async getEmployeeAttendanceReport(
    employeeId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<EmployeeAttendanceHistoryResponse> {
    const query = new URLSearchParams()
    if (params?.start_date) query.set("start_date", params.start_date)
    if (params?.end_date) query.set("end_date", params.end_date)
    const qs = query.toString()
    return apiFetch<EmployeeAttendanceHistoryResponse>(
      `/reports/employee/${employeeId}${qs ? `?${qs}` : ""}`
    )
  },

  async getSalaryReport(params?: {
    year?: number
    month?: number
    employee_id?: string
  }): Promise<SalaryMonthlyResponse> {
    const query = new URLSearchParams()
    if (params?.year) query.set("year", params.year.toString())
    if (params?.month) query.set("month", params.month.toString())
    if (params?.employee_id) query.set("employee_id", params.employee_id)
    const qs = query.toString()
    return apiFetch<SalaryMonthlyResponse>(`/reports/salary${qs ? `?${qs}` : ""}`)
  },
}

