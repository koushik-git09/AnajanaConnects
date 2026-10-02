import re
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class AttendanceMarkRequest(BaseModel):
    employee_id: str = Field(..., description="Target employee ObjectId as string")
    date: str = Field(..., description="Calendar date in YYYY-MM-DD format")
    status: Literal["present", "absent"] = Field(..., description="Attendance status: 'present' or 'absent'")

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Date must be in YYYY-MM-DD format")
        return v


class AttendanceUpdateRequest(BaseModel):
    status: Literal["present", "absent"] = Field(..., description="Updated attendance status: 'present' or 'absent'")


class AttendanceEmployeeItem(BaseModel):
    employee_id: str
    employee_code: str
    name: str
    designation: str
    status: Literal["present", "absent", "unmarked"]
    marked_at: str | None = None
    attendance_id: str | None = None


class AttendanceDailyResponse(BaseModel):
    date: str
    employees: list[AttendanceEmployeeItem]
    total_present: int = 0
    total_absent: int = 0
    total_unmarked: int = 0


class AttendanceRecordResponse(BaseModel):
    id: str
    agency_id: str
    employee_id: str
    date: str
    status: Literal["present", "absent"]
    marked_at: str
    updated_at: str


class EmployeeAttendanceHistoryItem(BaseModel):
    date: str
    status: Literal["present", "absent"]
    marked_at: str
