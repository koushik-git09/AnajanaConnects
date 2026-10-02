from datetime import datetime, timezone
from typing import Any
from bson import ObjectId


class AttendanceModel:
    """Helper for constructing and formatting attendance documents."""

    @staticmethod
    def normalize_date(date_str: str) -> datetime:
        """
        Normalize a YYYY-MM-DD calendar date string to UTC midnight.
        This guarantees stable date indexing and eliminates timezone drift.
        """
        dt = datetime.strptime(date_str.strip(), "%Y-%m-%d")
        return datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=timezone.utc)

    @staticmethod
    def create_document(
        agency_id: str,
        employee_id: ObjectId,
        date: datetime,
        status: str,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {
            "agency_id": agency_id,
            "employee_id": employee_id,
            "date": date,
            "status": status.lower(),
            "marked_at": now,
            "updated_at": now,
        }
