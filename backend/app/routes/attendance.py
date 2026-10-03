from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import APIRouter, Depends, Query, status

IST = timezone(timedelta(hours=5, minutes=30))

from app.core.dependencies import get_current_user
from app.schemas.attendance import (
    AttendanceDailyResponse,
    AttendanceMarkRequest,
    AttendanceRecordResponse,
    AttendanceSummaryResponse,
    AttendanceUpdateRequest,
    EmployeeAttendanceHistoryResponse,
    MonthlyAttendanceSummaryResponse,
)
from app.schemas.face_attendance import (
    FaceAttendanceMarkRequest,
    FaceAttendanceMarkResponse,
    FaceRecognitionSessionResponse,
)
from app.services.attendance_service import AttendanceService

router = APIRouter()


@router.get(
    "",
    response_model=AttendanceDailyResponse,
    summary="Get daily agency attendance register",
)
async def get_daily_attendance(
    date: str | None = Query(
        default=None,
        description="Attendance calendar date in YYYY-MM-DD format (defaults to current Indian Standard Time date)",
    ),
    search: str | None = Query(
        default=None,
        description="Filter active employees by name, employee_code, or phone",
    ),
    status: str | None = Query(
        default=None,
        description="Filter by attendance status ('present', 'absent', or 'unmarked')",
    ),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AttendanceDailyResponse:
    """
    Fetch all active agency employees with their attendance status for the target date.
    Employees without an attendance record return status 'unmarked'.
    """
    target_date = date or datetime.now(IST).strftime("%Y-%m-%d")
    return AttendanceService.get_daily_attendance(
        user=current_user,
        date_str=target_date,
        search=search,
        status_filter=status,
    )


@router.get(
    "/summary",
    response_model=AttendanceSummaryResponse,
    summary="Get daily attendance summary statistics",
)
async def get_daily_attendance_summary(
    date: str | None = Query(
        default=None,
        description="Attendance calendar date in YYYY-MM-DD format (defaults to current Indian Standard Time date)",
    ),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AttendanceSummaryResponse:
    """Fetch daily attendance summary statistics for active agency employees."""
    target_date = date or datetime.now(IST).strftime("%Y-%m-%d")
    return AttendanceService.get_daily_summary(
        user=current_user,
        date_str=target_date,
    )


@router.get(
    "/monthly-summary",
    response_model=MonthlyAttendanceSummaryResponse,
    summary="Get monthly attendance summary and day-by-day records",
)
async def get_monthly_attendance_summary(
    year: int = Query(default=..., ge=2000, le=2100, description="Four-digit year (e.g. 2026)"),
    month: int = Query(default=..., ge=1, le=12, description="Month number (1-12)"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MonthlyAttendanceSummaryResponse:
    """Fetch aggregated monthly attendance metrics and daily breakdown for active employees."""
    return AttendanceService.get_monthly_summary(
        user=current_user,
        year=year,
        month=month,
    )


@router.post(
    "",
    response_model=AttendanceRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Mark or upsert employee attendance",
)
async def mark_attendance(
    req: AttendanceMarkRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AttendanceRecordResponse:
    """Record an employee as present or absent for a specific date."""
    return AttendanceService.mark_or_update_attendance(user=current_user, req=req)


@router.put(
    "",
    response_model=AttendanceRecordResponse,
    summary="Upsert employee attendance record",
)
async def upsert_attendance(
    req: AttendanceMarkRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AttendanceRecordResponse:
    """Convenience endpoint to upsert attendance using employee_id and date."""
    return AttendanceService.mark_or_update_attendance(user=current_user, req=req)


@router.post(
    "/face/session",
    response_model=FaceRecognitionSessionResponse,
    summary="Create face recognition session for attendance scanning",
)
async def create_face_recognition_session(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> FaceRecognitionSessionResponse:
    """Create a short-lived (5 min) agency-scoped face recognition session containing active employee templates."""
    return AttendanceService.create_face_recognition_session(user=current_user)


@router.post(
    "/face/mark",
    response_model=FaceAttendanceMarkResponse,
    summary="Mark attendance via face recognition",
)
async def mark_face_attendance(
    req: FaceAttendanceMarkRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> FaceAttendanceMarkResponse:
    """Record today's attendance for an identified active employee with duplicate and conflict protections."""
    return AttendanceService.mark_face_attendance(user=current_user, req=req)


@router.put(
    "/{attendance_id}",
    response_model=AttendanceRecordResponse,
    summary="Update existing attendance record status",
)
async def update_attendance_status(
    attendance_id: str,
    req: AttendanceUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AttendanceRecordResponse:
    """Modify attendance status (present <-> absent) for an existing attendance document."""
    return AttendanceService.update_attendance_by_id(
        user=current_user,
        attendance_id=attendance_id,
        req=req,
    )


@router.get(
    "/employee/{employee_id}",
    response_model=EmployeeAttendanceHistoryResponse,
    summary="Fetch employee attendance history and summary",
)
async def get_employee_attendance_history(
    employee_id: str,
    start_date: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeAttendanceHistoryResponse:
    """Retrieve full chronological attendance history and summary metrics for an employee."""
    return AttendanceService.get_employee_attendance_history(
        user=current_user,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
    )

