from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.schemas.salary import SalaryMonthlyResponse
from app.services.salary_service import SalaryService

router = APIRouter(prefix="/salary", tags=["Salary"])

IST_TZ = ZoneInfo("Asia/Kolkata")


@router.get("/monthly", response_model=SalaryMonthlyResponse)
def get_monthly_salary(
    year: int | None = Query(default=None, ge=2000, le=2100, description="Calendar year"),
    month: int | None = Query(default=None, ge=1, le=12, description="Calendar month (1-12)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get dynamic monthly salary calculations for all agency employees based on
    attendance deductions, base salary, and effective cutoff rules.
    """
    now_ist = datetime.now(IST_TZ)
    target_year = year if year is not None else now_ist.year
    target_month = month if month is not None else now_ist.month

    return SalaryService.get_monthly_payroll(
        user=current_user,
        year=target_year,
        month=target_month,
    )
