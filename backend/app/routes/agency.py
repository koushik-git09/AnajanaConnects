from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.agency import AgencySalarySettingsRequest, AgencySalarySettingsResponse
from app.services.agency_service import AgencyService

router = APIRouter(prefix="/agency", tags=["Agency"])


@router.get("/settings", response_model=AgencySalarySettingsResponse)
def get_agency_settings(current_user: dict = Depends(get_current_user)):
    """Retrieve the current agency configuration including default daily cutoff."""
    agency_id = AgencyService.get_agency_id(current_user)
    settings_doc = AgencyService.get_settings(agency_id)
    updated_at = settings_doc.get("updated_at")
    return AgencySalarySettingsResponse(
        agency_id=settings_doc.get("agency_id", agency_id),
        name=settings_doc.get("name", agency_id),
        default_daily_cutoff=settings_doc.get("default_daily_cutoff"),
        updated_at=updated_at.isoformat() if hasattr(updated_at, "isoformat") else (str(updated_at) if updated_at else None),
    )


@router.put("/settings", response_model=AgencySalarySettingsResponse)
def update_agency_settings(
    req: AgencySalarySettingsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update agency salary settings such as default daily salary cutoff."""
    agency_id = AgencyService.get_agency_id(current_user)
    return AgencyService.update_settings(agency_id, req.default_daily_cutoff)
