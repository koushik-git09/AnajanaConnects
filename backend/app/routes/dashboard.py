from typing import Any
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Get aggregated live operational dashboard metrics",
)
def get_dashboard_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> DashboardSummaryResponse:
    """
    Retrieve real-time consolidated dashboard statistics for the authenticated agency:
    - Headcount (active, inactive, total)
    - Today's operational attendance roster & percentage
    - Current month's aggregated attendance
    - Current month's live payroll & deduction overview
    - Recent attendance event logs
    """
    return DashboardService.get_summary(user=current_user)
