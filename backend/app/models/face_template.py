from datetime import datetime, timezone
from typing import Any
from bson import ObjectId


class FaceTemplateModel:
    """Helper for constructing and formatting face template documents."""

    @staticmethod
    def create_document(
        agency_id: str,
        employee_id: ObjectId,
        embeddings: list[list[float]],
        model_name: str,
        model_version: str,
        embedding_dimension: int,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        return {
            "agency_id": agency_id,
            "employee_id": employee_id,
            "embeddings": embeddings,
            "model_name": model_name.strip(),
            "model_version": model_version.strip(),
            "embedding_dimension": int(embedding_dimension),
            "created_at": now,
            "updated_at": now,
        }
