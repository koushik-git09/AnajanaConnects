import math
import re
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database.mongodb import employees_collection
from app.models.employee import EmployeeModel
from app.schemas.employee import (
    EmployeeCreateRequest,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeUpdateRequest,
)
from app.services.agency_service import AgencyService


class EmployeeService:
    @staticmethod
    def _get_agency_id(user: dict) -> str:
        """Derive the tenant agency_id strictly from the authenticated user."""
        return user.get("agency_id") or "anjana_gas_agency"

    @staticmethod
    def _format_employee(doc: dict, agency_default_cutoff: float | None = None) -> EmployeeResponse:
        created_at = doc.get("created_at")
        updated_at = doc.get("updated_at")

        raw_cutoff = doc.get("daily_cutoff")
        daily_cutoff = float(raw_cutoff) if raw_cutoff is not None else None

        if daily_cutoff is not None:
            effective_daily_cutoff = daily_cutoff
            cutoff_source = "individual"
        elif agency_default_cutoff is not None:
            effective_daily_cutoff = agency_default_cutoff
            cutoff_source = "agency_default"
        else:
            effective_daily_cutoff = None
            cutoff_source = "not_set"

        return EmployeeResponse(
            id=str(doc["_id"]),
            agency_id=doc.get("agency_id", "anjana_gas_agency"),
            employee_code=doc.get("employee_code", ""),
            name=doc.get("name", ""),
            phone=doc.get("phone"),
            email=doc.get("email"),
            designation=doc.get("designation", "Staff"),
            salary=float(doc.get("salary", 0.0)),
            joining_date=doc.get("joining_date", ""),
            status=doc.get("status", "active"),
            address=doc.get("address"),
            daily_cutoff=daily_cutoff,
            effective_daily_cutoff=effective_daily_cutoff,
            cutoff_source=cutoff_source,
            created_at=created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            updated_at=updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at),
        )

    @classmethod
    def list_employees(
        cls,
        user: dict,
        search: str | None = None,
        status_filter: str | None = None,
        designation: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> EmployeeListResponse:
        agency_id = cls._get_agency_id(user)
        query: dict = {"agency_id": agency_id}

        if status_filter and status_filter.lower() != "all":
            query["status"] = status_filter.lower()

        if designation and designation.lower() != "all":
            query["designation"] = {"$regex": f"^{re.escape(designation)}$", "$options": "i"}

        if search and search.strip():
            escaped = re.escape(search.strip())
            query["$or"] = [
                {"name": {"$regex": escaped, "$options": "i"}},
                {"employee_code": {"$regex": escaped, "$options": "i"}},
                {"phone": {"$regex": escaped, "$options": "i"}},
                {"email": {"$regex": escaped, "$options": "i"}},
            ]

        safe_page = max(1, page)
        safe_limit = max(1, min(limit, 100))
        skip = (safe_page - 1) * safe_limit

        total = employees_collection.count_documents(query)
        cursor = employees_collection.find(query).sort("created_at", -1).skip(skip).limit(safe_limit)
        agency_default_cutoff = AgencyService.get_default_daily_cutoff(agency_id)
        items = [cls._format_employee(doc, agency_default_cutoff) for doc in cursor]

        total_pages = math.ceil(total / safe_limit) if total > 0 else 1

        return EmployeeListResponse(
            items=items,
            total=total,
            page=safe_page,
            limit=safe_limit,
            total_pages=total_pages,
        )

    @classmethod
    def get_employee(cls, user: dict, employee_id: str) -> EmployeeResponse:
        agency_id = cls._get_agency_id(user)
        try:
            oid = ObjectId(employee_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        doc = employees_collection.find_one({"_id": oid, "agency_id": agency_id})
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        agency_default_cutoff = AgencyService.get_default_daily_cutoff(agency_id)
        return cls._format_employee(doc, agency_default_cutoff)

    @classmethod
    def create_employee(cls, user: dict, req: EmployeeCreateRequest) -> EmployeeResponse:
        agency_id = cls._get_agency_id(user)
        code = req.employee_code.strip().upper()

        # Prevent duplicate employee code in agency
        existing = employees_collection.find_one({"agency_id": agency_id, "employee_code": code})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee code '{code}' is already registered for this agency.",
            )

        doc = EmployeeModel.create_document(
            agency_id=agency_id,
            employee_code=code,
            name=req.name,
            designation=req.designation,
            salary=req.salary,
            joining_date=req.joining_date,
            phone=req.phone,
            email=req.email,
            address=req.address,
            status="active",
            daily_cutoff=req.daily_cutoff,
        )

        try:
            result = employees_collection.insert_one(doc)
            doc["_id"] = result.inserted_id
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee code '{code}' already exists.",
            )

        agency_default_cutoff = AgencyService.get_default_daily_cutoff(agency_id)
        return cls._format_employee(doc, agency_default_cutoff)

    @classmethod
    def update_employee(cls, user: dict, employee_id: str, req: EmployeeUpdateRequest) -> EmployeeResponse:
        agency_id = cls._get_agency_id(user)
        try:
            oid = ObjectId(employee_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        current = employees_collection.find_one({"_id": oid, "agency_id": agency_id})
        if not current:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        update_fields: dict = {}
        if req.name is not None:
            update_fields["name"] = req.name.strip()
        if req.designation is not None:
            update_fields["designation"] = req.designation.strip()
        if req.salary is not None:
            update_fields["salary"] = float(req.salary)
        if req.joining_date is not None:
            update_fields["joining_date"] = req.joining_date.strip()
        if req.phone is not None:
            update_fields["phone"] = req.phone.strip() if req.phone else None
        if req.email is not None:
            update_fields["email"] = req.email.strip().lower() if req.email else None
        if req.address is not None:
            update_fields["address"] = req.address.strip() if req.address else None
        if "daily_cutoff" in req.model_fields_set:
            update_fields["daily_cutoff"] = float(req.daily_cutoff) if req.daily_cutoff is not None else None

        if req.employee_code is not None:
            new_code = req.employee_code.strip().upper()
            if new_code != current.get("employee_code"):
                conflict = employees_collection.find_one({
                    "agency_id": agency_id,
                    "employee_code": new_code,
                    "_id": {"$ne": oid},
                })
                if conflict:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Employee code '{new_code}' is already assigned to another staff member.",
                    )
                update_fields["employee_code"] = new_code

        if update_fields:
            update_fields["updated_at"] = datetime.now(timezone.utc)
            employees_collection.update_one({"_id": oid}, {"$set": update_fields})

        updated_doc = employees_collection.find_one({"_id": oid})
        agency_default_cutoff = AgencyService.get_default_daily_cutoff(agency_id)
        return cls._format_employee(updated_doc, agency_default_cutoff)

    @classmethod
    def update_status(cls, user: dict, employee_id: str, new_status: str) -> EmployeeResponse:
        agency_id = cls._get_agency_id(user)
        try:
            oid = ObjectId(employee_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        current = employees_collection.find_one({"_id": oid, "agency_id": agency_id})
        if not current:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        employees_collection.update_one(
            {"_id": oid},
            {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}},
        )

        updated_doc = employees_collection.find_one({"_id": oid})
        agency_default_cutoff = AgencyService.get_default_daily_cutoff(agency_id)
        return cls._format_employee(updated_doc, agency_default_cutoff)

    @classmethod
    def delete_employee(cls, user: dict, employee_id: str) -> dict:
        agency_id = cls._get_agency_id(user)
        try:
            oid = ObjectId(employee_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        current = employees_collection.find_one({"_id": oid, "agency_id": agency_id})
        if not current:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found.",
            )

        employees_collection.delete_one({"_id": oid})
        return {"message": "Employee deleted successfully."}
