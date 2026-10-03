from datetime import datetime, timezone
from typing import Any


class AgencyModel:
    """Helper for constructing and formatting agency configuration documents."""

    @staticmethod
    def create_document(
        agency_id: str,
        name: str | None = None,
        default_daily_cutoff: float | None = None,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {
            "agency_id": agency_id,
            "name": name.strip() if name else agency_id,
            "default_daily_cutoff": float(default_daily_cutoff) if default_daily_cutoff is not None else None,
            "created_at": now,
            "updated_at": now,
        }
