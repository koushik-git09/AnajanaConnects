from typing import Any
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.schemas.attendance import EmployeeAttendanceHistoryResponse
from app.schemas.reports import AttendanceReportResponse
from app.schemas.salary import SalaryMonthlyResponse
from app.services.reports_service import ReportsService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "/attendance",
    response_model=AttendanceReportResponse,
    summary="Generate attendance compliance report",
)
def get_attendance_report(
    start_date: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    status: str | None = Query(default=None, description="Filter status (present, absent)"),
    employee_id: str | None = Query(default=None, description="Filter specific employee ID"),
    search: str | None = Query(default=None, description="Search employee name or code"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AttendanceReportResponse:
    """Generate agency-scoped historical attendance report with date-range filters."""
    return ReportsService.get_attendance_report(
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        status_filter=status,
        employee_id=employee_id,
        search=search,
    )


@router.get(
    "/employee/{employee_id}",
    response_model=EmployeeAttendanceHistoryResponse,
    summary="Generate individual employee attendance audit report",
)
def get_employee_attendance_report(
    employee_id: str,
    start_date: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeAttendanceHistoryResponse:
    """Generate individual staff member detailed attendance history and rate metrics."""
    return ReportsService.get_employee_attendance_report(
        user=current_user,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/salary",
    response_model=SalaryMonthlyResponse,
    summary="Generate monthly payroll & deduction register report",
)
def get_salary_report(
    year: int | None = Query(default=None, ge=2000, le=2100, description="Calendar year"),
    month: int | None = Query(default=None, ge=1, le=12, description="Calendar month (1-12)"),
    employee_id: str | None = Query(default=None, description="Filter specific employee ID"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SalaryMonthlyResponse:
    """Generate monthly payroll register including base salaries, absence deductions, and net payouts."""
    return ReportsService.get_salary_report(
        user=current_user,
        year=year,
        month=month,
        employee_id=employee_id,
    )
