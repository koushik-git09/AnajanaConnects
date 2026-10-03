from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status

from pymongo import ReturnDocument
from app.database.mongodb import employees_collection, face_templates_collection
from app.schemas.face import (
    FaceDeleteResponse,
    FaceRegistrationRequest,
    FaceRegistrationStatusResponse,
)


class FaceService:
    @staticmethod
    def _get_agency_id(user: dict) -> str:
        """Derive the tenant agency_id strictly from the authenticated user."""
        return user.get("agency_id") or "anjana_gas_agency"

    @classmethod
    def _verify_employee(cls, user: dict, employee_id: str, require_active: bool = False) -> dict:
        agency_id = cls._get_agency_id(user)
        try:
            oid = ObjectId(employee_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or does not belong to your agency.",
            )

        employee = employees_collection.find_one({"_id": oid, "agency_id": agency_id})
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or does not belong to your agency.",
            )

        if require_active and employee.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face registration is only permitted for active employees.",
            )

        return employee

    @classmethod
    def register_face(
        cls,
        user: dict,
        employee_id: str,
        req: FaceRegistrationRequest,
    ) -> FaceRegistrationStatusResponse:
        agency_id = cls._get_agency_id(user)
        employee = cls._verify_employee(user, employee_id, require_active=True)

        # Verify each embedding matches declared dimension
        for i, vec in enumerate(req.embeddings):
            if len(vec) != req.embedding_dimension:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Sample {i+1} has length {len(vec)}, expected declared dimension {req.embedding_dimension}.",
                )

        now = datetime.now(timezone.utc)
        result = face_templates_collection.find_one_and_update(
            {
                "agency_id": agency_id,
                "employee_id": employee["_id"],
            },
            {
                "$set": {
                    "embeddings": req.embeddings,
                    "model_name": req.model_name.strip(),
                    "model_version": req.model_version.strip(),
                    "embedding_dimension": int(req.embedding_dimension),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "agency_id": agency_id,
                    "employee_id": employee["_id"],
                    "created_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        created_at = result.get("created_at")
        updated_at = result.get("updated_at")

        return FaceRegistrationStatusResponse(
            registered=True,
            model_name=result.get("model_name"),
            model_version=result.get("model_version"),
            embedding_dimension=result.get("embedding_dimension"),
            sample_count=len(result.get("embeddings", [])),
            created_at=created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            updated_at=updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at),
        )

    @classmethod
    def get_face_status(cls, user: dict, employee_id: str) -> FaceRegistrationStatusResponse:
        agency_id = cls._get_agency_id(user)
        employee = cls._verify_employee(user, employee_id, require_active=False)

        doc = face_templates_collection.find_one({
            "agency_id": agency_id,
            "employee_id": employee["_id"],
        })

        if not doc or not doc.get("embeddings"):
            return FaceRegistrationStatusResponse(
                registered=False,
                sample_count=0,
            )

        created_at = doc.get("created_at")
        updated_at = doc.get("updated_at")

        return FaceRegistrationStatusResponse(
            registered=True,
            model_name=doc.get("model_name"),
            model_version=doc.get("model_version"),
            embedding_dimension=doc.get("embedding_dimension"),
            sample_count=len(doc.get("embeddings", [])),
            created_at=created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            updated_at=updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at),
        )

    @classmethod
    def delete_face(cls, user: dict, employee_id: str) -> FaceDeleteResponse:
        agency_id = cls._get_agency_id(user)
        employee = cls._verify_employee(user, employee_id, require_active=False)

        face_templates_collection.delete_one({
            "agency_id": agency_id,
            "employee_id": employee["_id"],
        })

        return FaceDeleteResponse(
            message=f"Face template for {employee.get('name', 'employee')} removed successfully.",
            employee_id=str(employee["_id"]),
        )
