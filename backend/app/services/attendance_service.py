from datetime import datetime, timezone
import re
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.database.mongodb import attendance_collection, employees_collection
from app.models.attendance import AttendanceModel
from app.schemas.attendance import (
    AttendanceDailyResponse,
    AttendanceEmployeeItem,
    AttendanceMarkRequest,
    AttendanceRecordResponse,
    AttendanceUpdateRequest,
    EmployeeAttendanceHistoryItem,
)


class AttendanceService:
    @staticmethod
    def _get_agency_id(user: dict) -> str:
        """Derive the tenant agency_id strictly from the authenticated user."""
        return user.get("agency_id") or "anjana_gas_agency"

    @staticmethod
    def _format_datetime(dt: datetime | None) -> str | None:
        """Format datetime to ISO string with explicit UTC timezone."""
        if dt is None:
            return None
        if hasattr(dt, "tzinfo") and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    @classmethod
    def get_daily_attendance(
        cls,
        user: dict,
        date_str: str,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> AttendanceDailyResponse:
        """
        Fetch attendance roster for the specified calendar date.
        Only shows ACTIVE employees for the agency.
        Employees without an attendance record return status 'unmarked'.
        """
        agency_id = cls._get_agency_id(user)

        try:
            norm_date = AttendanceModel.normalize_date(date_str)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD",
            )

        # 1. Fetch active employees belonging strictly to this agency
        emp_query: dict = {
            "agency_id": agency_id,
            "status": "active",
        }

        if search and search.strip():
            rgx = re.compile(re.escape(search.strip()), re.IGNORECASE)
            emp_query["$or"] = [
                {"name": {"$regex": rgx}},
                {"employee_code": {"$regex": rgx}},
                {"phone": {"$regex": rgx}},
            ]

        employees = list(
            employees_collection.find(emp_query).sort("employee_code", 1)
        )

        # 2. Fetch existing attendance records for this date and agency
        attendance_docs = list(
            attendance_collection.find(
                {
                    "agency_id": agency_id,
                    "date": norm_date,
                }
            )
        )
        attendance_map = {str(doc["employee_id"]): doc for doc in attendance_docs}

        # 3. Construct employee list with resolved status
        items: list[AttendanceEmployeeItem] = []
        total_present = 0
        total_absent = 0
        total_unmarked = 0

        for emp in employees:
            emp_id_str = str(emp["_id"])
            att_doc = attendance_map.get(emp_id_str)

            if att_doc:
                att_status = att_doc.get("status", "unmarked")
                marked_at = att_doc.get("marked_at")
                marked_at_str = cls._format_datetime(marked_at)
                att_id = str(att_doc["_id"])
                if att_status == "present":
                    total_present += 1
                elif att_status == "absent":
                    total_absent += 1
                else:
                    total_unmarked += 1
            else:
                att_status = "unmarked"
                marked_at_str = None
                att_id = None
                total_unmarked += 1

            items.append(
                AttendanceEmployeeItem(
                    employee_id=emp_id_str,
                    employee_code=emp.get("employee_code", ""),
                    name=emp.get("name", ""),
                    designation=emp.get("designation", "Staff"),
                    status=att_status,
                    marked_at=marked_at_str,
                    attendance_id=att_id,
                )
            )

        # Filter by status if requested (present, absent, or unmarked)
        if status_filter and status_filter.lower() in ("present", "absent", "unmarked"):
            items = [item for item in items if item.status == status_filter.lower()]

        return AttendanceDailyResponse(
            date=date_str,
            employees=items,
            total_present=total_present,
            total_absent=total_absent,
            total_unmarked=total_unmarked,
        )

    @classmethod
    def mark_or_update_attendance(
        cls,
        user: dict,
        req: AttendanceMarkRequest,
    ) -> AttendanceRecordResponse:
        """
        Record or adjust attendance for an active employee on a specific calendar date.
        Uses atomic find_one_and_update with upsert to prevent race conditions and duplicate keys.
        """
        agency_id = cls._get_agency_id(user)

        if not ObjectId.is_valid(req.employee_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid employee ID format",
            )

        # 1. Verify employee belongs to the agency and is active
        employee = employees_collection.find_one(
            {
                "_id": ObjectId(req.employee_id),
                "agency_id": agency_id,
            }
        )
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or does not belong to your agency",
            )

        if employee.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance can only be marked for active employees",
            )

        # 2. Normalize date to UTC midnight
        try:
            norm_date = AttendanceModel.normalize_date(req.date)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD",
            )

        now = datetime.now(timezone.utc)

        # 3. Upsert attendance record atomically
        doc = attendance_collection.find_one_and_update(
            {
                "agency_id": agency_id,
                "employee_id": ObjectId(req.employee_id),
                "date": norm_date,
            },
            {
                "$set": {
                    "status": req.status.lower(),
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "agency_id": agency_id,
                    "employee_id": ObjectId(req.employee_id),
                    "date": norm_date,
                    "marked_at": now,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        marked_at = doc.get("marked_at", now)
        updated_at = doc.get("updated_at", now)
        date_val = doc.get("date", norm_date)

        return AttendanceRecordResponse(
            id=str(doc["_id"]),
            agency_id=doc.get("agency_id", agency_id),
            employee_id=str(doc["employee_id"]),
            date=date_val.strftime("%Y-%m-%d") if hasattr(date_val, "strftime") else str(req.date),
            status=doc.get("status", req.status),
            marked_at=cls._format_datetime(marked_at) or "",
            updated_at=cls._format_datetime(updated_at) or "",
        )

    @classmethod
    def update_attendance_by_id(
        cls,
        user: dict,
        attendance_id: str,
        req: AttendanceUpdateRequest,
    ) -> AttendanceRecordResponse:
        """Update an existing attendance record by ID."""
        agency_id = cls._get_agency_id(user)

        if not ObjectId.is_valid(attendance_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid attendance ID format",
            )

        now = datetime.now(timezone.utc)

        doc = attendance_collection.find_one_and_update(
            {
                "_id": ObjectId(attendance_id),
                "agency_id": agency_id,
            },
            {
                "$set": {
                    "status": req.status.lower(),
                    "updated_at": now,
                }
            },
            return_document=ReturnDocument.AFTER,
        )

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found or does not belong to your agency",
            )

        marked_at = doc.get("marked_at", now)
        updated_at = doc.get("updated_at", now)
        date_val = doc.get("date")

        return AttendanceRecordResponse(
            id=str(doc["_id"]),
            agency_id=doc.get("agency_id", agency_id),
            employee_id=str(doc["employee_id"]),
            date=date_val.strftime("%Y-%m-%d") if hasattr(date_val, "strftime") else "",
            status=doc.get("status", req.status),
            marked_at=cls._format_datetime(marked_at) or "",
            updated_at=cls._format_datetime(updated_at) or "",
        )

    @classmethod
    def get_employee_attendance_history(
        cls,
        user: dict,
        employee_id: str,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> list[EmployeeAttendanceHistoryItem]:
        """
        Fetch historical attendance records for an employee.
        Enforces strict agency tenant isolation.
        Works for both active and inactive employees to preserve history.
        """
        agency_id = cls._get_agency_id(user)

        if not ObjectId.is_valid(employee_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid employee ID format",
            )

        # 1. Verify employee belongs to this agency (active or inactive)
        employee = employees_collection.find_one(
            {
                "_id": ObjectId(employee_id),
                "agency_id": agency_id,
            }
        )
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or does not belong to your agency",
            )

        # 2. Build history query
        query: dict = {
            "agency_id": agency_id,
            "employee_id": ObjectId(employee_id),
        }

        date_filter: dict = {}
        if start_date:
            try:
                date_filter["$gte"] = AttendanceModel.normalize_date(start_date)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Expected YYYY-MM-DD",
                )

        if end_date:
            try:
                date_filter["$lte"] = AttendanceModel.normalize_date(end_date)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Expected YYYY-MM-DD",
                )

        if date_filter:
            query["date"] = date_filter

        records = list(
            attendance_collection.find(query).sort("date", -1)
        )

        history: list[EmployeeAttendanceHistoryItem] = []
        for doc in records:
            d = doc.get("date")
            d_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)
            marked_at = doc.get("marked_at")
            history.append(
                EmployeeAttendanceHistoryItem(
                    date=d_str,
                    status=doc.get("status", "present"),
                    marked_at=cls._format_datetime(marked_at) or "",
                )
            )

        return history
