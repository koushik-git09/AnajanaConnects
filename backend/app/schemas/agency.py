from pydantic import BaseModel, Field


class AgencySalarySettingsRequest(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Agency legal or display name",
    )
    default_daily_cutoff: float | None = Field(
        default=None,
        ge=0,
        description="Agency default daily salary cutoff deduction in rupees",
    )


class AgencySalarySettingsResponse(BaseModel):
    agency_id: str
    name: str
    default_daily_cutoff: float | None = None
    updated_at: str | None = None
