from pydantic import BaseModel, Field


class AttendanceReportItem(BaseModel):
    id: str
    date: str
    employee_id: str
    employee_code: str
    employee_name: str
    designation: str
    status: str
    marked_at: str | None = None
    method: str = "manual"


class AttendanceReportSummary(BaseModel):
    start_date: str
    end_date: str
    total_records: int = Field(..., ge=0)
    total_present: int = Field(..., ge=0)
    total_absent: int = Field(..., ge=0)
    attendance_percentage: float = Field(..., ge=0.0, le=100.0)


class AttendanceReportResponse(BaseModel):
    summary: AttendanceReportSummary
    items: list[AttendanceReportItem]
