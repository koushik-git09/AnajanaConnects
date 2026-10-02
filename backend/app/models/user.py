from datetime import datetime, timezone
from typing import Any


class UserModel:
    """Helper for constructing and formatting user documents."""

    @staticmethod
    def create_document(
        name: str,
        email: str,
        password_hash: str,
        role: str = "owner",
        agency_id: str = "anjana_agency_main",
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        return {
            "name": name.strip(),
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "role": role,
            "agency_id": agency_id,
            "created_at": now,
            "updated_at": now,
        }
