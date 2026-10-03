from datetime import datetime, timezone
from typing import Any

from app.database.mongodb import agencies_collection
from app.schemas.agency import AgencySalarySettingsResponse


class AgencyService:
    @staticmethod
    def get_agency_id(user: dict) -> str:
        """Derive tenant agency_id strictly from the authenticated user."""
        return user.get("agency_id") or "anjana_gas_agency"

    @classmethod
    def get_settings(cls, agency_id: str) -> dict[str, Any]:
        """Fetch agency settings, or return defaults if not yet saved in DB."""
        doc = agencies_collection.find_one({"agency_id": agency_id})
        if not doc:
            return {
                "agency_id": agency_id,
                "name": agency_id,
                "default_daily_cutoff": None,
                "updated_at": None,
            }
        return doc

    @classmethod
    def get_default_daily_cutoff(cls, agency_id: str) -> float | None:
        """Helper to get only the numeric default daily cutoff (or None)."""
        settings_doc = cls.get_settings(agency_id)
        cutoff = settings_doc.get("default_daily_cutoff")
        return float(cutoff) if cutoff is not None else None

    @classmethod
    def update_settings(
        cls,
        agency_id: str,
        default_daily_cutoff: float | None = None,
        name: str | None = None,
    ) -> AgencySalarySettingsResponse:
        """Upsert the agency settings document with the specified daily cutoff and optional name."""
        now = datetime.now(timezone.utc)
        update_fields: dict[str, Any] = {
            "updated_at": now,
        }
        if default_daily_cutoff is not None:
            update_fields["default_daily_cutoff"] = float(default_daily_cutoff)
        if name and name.strip():
            update_fields["name"] = name.strip()

        result = agencies_collection.find_one_and_update(
            {"agency_id": agency_id},
            {
                "$set": update_fields,
                "$setOnInsert": {
                    "agency_id": agency_id,
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=True,
        )

        updated_at = result.get("updated_at")
        return AgencySalarySettingsResponse(
            agency_id=result.get("agency_id", agency_id),
            name=result.get("name", agency_id),
            default_daily_cutoff=result.get("default_daily_cutoff"),
            updated_at=updated_at.isoformat() if hasattr(updated_at, "isoformat") else (str(updated_at) if updated_at else None),
        )
