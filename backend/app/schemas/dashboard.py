from pydantic import BaseModel, Field


class DashboardEmployeesSummary(BaseModel):
    active: int = Field(..., ge=0)
    inactive: int = Field(..., ge=0)
    total: int = Field(..., ge=0)


class DashboardTodayAttendance(BaseModel):
    date: str
    total_employees: int = Field(..., ge=0)
    present: int = Field(..., ge=0)
    absent: int = Field(..., ge=0)
    unmarked: int = Field(..., ge=0)
    attendance_percentage: float = Field(..., ge=0.0, le=100.0)


class DashboardMonthAttendance(BaseModel):
    year: int
    month: int
    month_name: str
    total_active_employees: int = Field(..., ge=0)
    overall_present: int = Field(..., ge=0)
    overall_absent: int = Field(..., ge=0)
    overall_attendance_percentage: float = Field(..., ge=0.0, le=100.0)


class DashboardPayrollSummary(BaseModel):
    year: int
    month: int
    month_name: str
    total_employees: int = Field(..., ge=0)
    total_base_salary: float = Field(..., ge=0.0)
    total_absence_deduction: float = Field(..., ge=0.0)
    total_net_payable: float = Field(..., ge=0.0)
    agency_default_daily_cutoff: float | None = None


class DashboardActivityItem(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    employee_code: str
    status: str
    date: str
    marked_at: str | None = None
    method: str = "manual"


class DashboardSummaryResponse(BaseModel):
    agency_id: str
    agency_name: str
    employees: DashboardEmployeesSummary
    today_attendance: DashboardTodayAttendance
    month_attendance: DashboardMonthAttendance
    payroll: DashboardPayrollSummary
    recent_activity: list[DashboardActivityItem]
