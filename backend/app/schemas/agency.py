from pydantic import BaseModel, Field


class AgencySalarySettingsRequest(BaseModel):
    default_daily_cutoff: float = Field(
        ...,
        ge=0,
        description="Agency default daily salary cutoff deduction in rupees",
    )


class AgencySalarySettingsResponse(BaseModel):
    agency_id: str
    name: str
    default_daily_cutoff: float | None = None
    updated_at: str | None = None
