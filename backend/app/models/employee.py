from datetime import datetime, timezone
from typing import Any


class EmployeeModel:
    """Helper for constructing and formatting employee documents."""

    @staticmethod
    def create_document(
        agency_id: str,
        employee_code: str,
        name: str,
        designation: str,
        salary: float,
        joining_date: str,
        phone: str | None = None,
        email: str | None = None,
        address: str | None = None,
        status: str = "active",
        daily_cutoff: float | None = None,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {
            "agency_id": agency_id,
            "employee_code": employee_code.strip().upper(),
            "name": name.strip(),
            "phone": phone.strip() if phone else None,
            "email": email.strip().lower() if email else None,
            "designation": designation.strip(),
            "salary": float(salary),
            "joining_date": joining_date.strip(),
            "status": status,
            "address": address.strip() if address else None,
            "daily_cutoff": float(daily_cutoff) if daily_cutoff is not None else None,
            "created_at": now,
            "updated_at": now,
        }

