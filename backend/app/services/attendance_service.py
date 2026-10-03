import calendar
from datetime import datetime, timedelta, timezone
import re
import uuid
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.database.mongodb import (
    attendance_collection,
    employees_collection,
    face_recognition_sessions_collection,
    face_templates_collection,
)
from app.models.attendance import AttendanceModel
from app.schemas.face_attendance import (
    FaceAttendanceMarkRequest,
    FaceAttendanceMarkResponse,
    FaceRecognitionEmployee,
    FaceRecognitionSessionResponse,
)
from app.schemas.attendance import (
    AttendanceDailyResponse,
    AttendanceEmployeeItem,
    AttendanceMarkRequest,
    AttendanceRecordResponse,
    AttendanceSummaryResponse,
    AttendanceUpdateRequest,
    EmployeeAttendanceHistoryItem,
    EmployeeAttendanceHistoryResponse,
    EmployeeHistorySummary,
    EmployeeProfileShort,
    MonthlyAttendanceDaySummary,
    MonthlyAttendanceSummaryResponse,
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
    def get_daily_summary(
        cls,
        user: dict,
        date_str: str,
    ) -> AttendanceSummaryResponse:
        """
        Fetch summary metrics for a specific calendar date.
        Only counts active employees.
        Attendance percentage = (present / (present + absent)) * 100.
        """
        agency_id = cls._get_agency_id(user)

        try:
            norm_date = AttendanceModel.normalize_date(date_str)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD",
            )

        # 1. Count active agency employees
        active_employees = list(
            employees_collection.find(
                {"agency_id": agency_id, "status": "active"},
                {"_id": 1},
            )
        )
        active_emp_ids = [emp["_id"] for emp in active_employees]
        total_employees = len(active_emp_ids)

        if total_employees == 0:
            return AttendanceSummaryResponse(
                date=date_str,
                total_employees=0,
                present=0,
                absent=0,
                unmarked=0,
                attendance_percentage=0.0,
            )

        # 2. Query attendance for active employees on this date
        records = list(
            attendance_collection.find(
                {
                    "agency_id": agency_id,
                    "date": norm_date,
                    "employee_id": {"$in": active_emp_ids},
                }
            )
        )

        present = sum(1 for r in records if r.get("status") == "present")
        absent = sum(1 for r in records if r.get("status") == "absent")
        unmarked = max(0, total_employees - (present + absent))

        denominator = present + absent
        attendance_percentage = (
            round((present / denominator) * 100.0, 2) if denominator > 0 else 0.0
        )

        return AttendanceSummaryResponse(
            date=date_str,
            total_employees=total_employees,
            present=present,
            absent=absent,
            unmarked=unmarked,
            attendance_percentage=attendance_percentage,
        )

    @classmethod
    def get_monthly_summary(
        cls,
        user: dict,
        year: int,
        month: int,
    ) -> MonthlyAttendanceSummaryResponse:
        """
        Fetch daily summaries and aggregate stats for the requested month.
        Only counts active employees and real attendance records.
        """
        agency_id = cls._get_agency_id(user)

        if not (2000 <= year <= 2100 and 1 <= month <= 12):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid year or month parameter",
            )

        # Calculate month date boundaries in UTC
        _, num_days = calendar.monthrange(year, month)
        start_date = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(year, month, num_days, 23, 59, 59, tzinfo=timezone.utc)

        # Active employees
        active_employees = list(
            employees_collection.find(
                {"agency_id": agency_id, "status": "active"},
                {"_id": 1},
            )
        )
        active_emp_ids = [emp["_id"] for emp in active_employees]
        total_active = len(active_emp_ids)

        if total_active == 0:
            return MonthlyAttendanceSummaryResponse(
                year=year,
                month=month,
                total_active_employees=0,
                overall_present=0,
                overall_absent=0,
                overall_attendance_percentage=0.0,
                days=[],
            )

        # Query all attendance records for active employees in this month
        records = list(
            attendance_collection.find(
                {
                    "agency_id": agency_id,
                    "date": {"$gte": start_date, "$lte": end_date},
                    "employee_id": {"$in": active_emp_ids},
                }
            ).sort("date", -1)
        )

        # Group records by date string YYYY-MM-DD
        records_by_date: dict[str, list[dict]] = {}
        for r in records:
            d_val = r.get("date")
            d_str = (
                d_val.strftime("%Y-%m-%d")
                if hasattr(d_val, "strftime")
                else str(d_val)[:10]
            )
            records_by_date.setdefault(d_str, []).append(r)

        day_summaries: list[MonthlyAttendanceDaySummary] = []
        overall_present = 0
        overall_absent = 0

        # Sort dates descending (most recent first)
        for date_key in sorted(records_by_date.keys(), reverse=True):
            day_records = records_by_date[date_key]
            p_count = sum(1 for r in day_records if r.get("status") == "present")
            a_count = sum(1 for r in day_records if r.get("status") == "absent")
            u_count = max(0, total_active - (p_count + a_count))

            denom = p_count + a_count
            pct = round((p_count / denom) * 100.0, 2) if denom > 0 else 0.0

            overall_present += p_count
            overall_absent += a_count

            day_summaries.append(
                MonthlyAttendanceDaySummary(
                    date=date_key,
                    total_employees=total_active,
                    present=p_count,
                    absent=a_count,
                    unmarked=u_count,
                    attendance_percentage=pct,
                )
            )

        total_marked = overall_present + overall_absent
        overall_pct = (
            round((overall_present / total_marked) * 100.0, 2)
            if total_marked > 0
            else 0.0
        )

        return MonthlyAttendanceSummaryResponse(
            year=year,
            month=month,
            total_active_employees=total_active,
            overall_present=overall_present,
            overall_absent=overall_absent,
            overall_attendance_percentage=overall_pct,
            days=day_summaries,
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
    ) -> EmployeeAttendanceHistoryResponse:
        """
        Fetch historical attendance records and summary metrics for an employee.
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
        d_start = None
        d_end = None

        if start_date:
            try:
                d_start = AttendanceModel.normalize_date(start_date)
                date_filter["$gte"] = d_start
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Expected YYYY-MM-DD",
                )

        if end_date:
            try:
                d_end = AttendanceModel.normalize_date(end_date)
                date_filter["$lte"] = d_end
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Expected YYYY-MM-DD",
                )

        if date_filter:
            query["date"] = date_filter

        records_cursor = list(
            attendance_collection.find(query).sort("date", -1)
        )

        history_items: list[EmployeeAttendanceHistoryItem] = []
        present_count = 0
        absent_count = 0

        for doc in records_cursor:
            d = doc.get("date")
            d_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)
            marked_at = doc.get("marked_at")
            st = doc.get("status", "present")

            if st == "present":
                present_count += 1
            elif st == "absent":
                absent_count += 1

            history_items.append(
                EmployeeAttendanceHistoryItem(
                    date=d_str,
                    status=st,
                    marked_at=cls._format_datetime(marked_at) or "",
                )
            )

        marked_total = present_count + absent_count
        attendance_pct = (
            round((present_count / marked_total) * 100.0, 2)
            if marked_total > 0
            else 0.0
        )

        # Calculate unmarked count if date range was specified
        unmarked_count = 0
        if d_start and d_end and d_end >= d_start:
            total_days = (d_end - d_start).days + 1
            unmarked_count = max(0, total_days - marked_total)

        return EmployeeAttendanceHistoryResponse(
            employee=EmployeeProfileShort(
                id=str(employee["_id"]),
                employee_code=employee.get("employee_code", ""),
                name=employee.get("name", ""),
                designation=employee.get("designation", "Staff"),
                status=employee.get("status", "active"),
            ),
            summary=EmployeeHistorySummary(
                present=present_count,
                absent=absent_count,
                unmarked=unmarked_count,
                attendance_percentage=attendance_pct,
            ),
            records=history_items,
        )

    @classmethod
    def create_face_recognition_session(
        cls,
        user: dict,
    ) -> FaceRecognitionSessionResponse:
        """
        Create a secure, short-lived (5 min) face recognition session for the authenticated agency.
        Loads active employees having a valid registered face template.
        """
        agency_id = cls._get_agency_id(user)

        # 1. Fetch active employees of this agency
        active_employees = list(
            employees_collection.find(
                {"agency_id": agency_id, "status": "active"},
                {"_id": 1, "employee_code": 1, "name": 1},
            )
        )
        if not active_employees:
            active_emp_map = {}
        else:
            active_emp_map = {emp["_id"]: emp for emp in active_employees}

        # 2. Fetch registered face templates for these active employees
        emp_ids = list(active_emp_map.keys())
        recognition_employees: list[FaceRecognitionEmployee] = []

        if emp_ids:
            templates = list(
                face_templates_collection.find({
                    "agency_id": agency_id,
                    "employee_id": {"$in": emp_ids},
                })
            )

            for tpl in templates:
                emp_id = tpl.get("employee_id")
                emp = active_emp_map.get(emp_id)
                if not emp:
                    continue

                # Model compatibility check (Requirement 35)
                # Model must be opencv-sface and dimension 128
                if (
                    tpl.get("model_name") != "opencv-sface"
                    or tpl.get("embedding_dimension") != 128
                    or not tpl.get("embeddings")
                ):
                    continue

                recognition_employees.append(
                    FaceRecognitionEmployee(
                        employee_id=str(emp["_id"]),
                        employee_code=emp.get("employee_code", ""),
                        name=emp.get("name", ""),
                        embeddings=tpl.get("embeddings", []),
                    )
                )

        # 3. Create short-lived recognition session
        session_id = str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc)
        expires_at = now_utc + timedelta(minutes=5)

        face_recognition_sessions_collection.insert_one({
            "session_id": session_id,
            "agency_id": agency_id,
            "user_id": user.get("_id"),
            "created_at": now_utc,
            "expires_at": expires_at,
        })

        return FaceRecognitionSessionResponse(
            session_id=session_id,
            expires_at=expires_at.isoformat(),
            model_name="opencv-sface",
            model_version="2021dec-int8",
            embedding_dimension=128,
            employees=recognition_employees,
        )

    @classmethod
    def mark_face_attendance(
        cls,
        user: dict,
        req: FaceAttendanceMarkRequest,
    ) -> FaceAttendanceMarkResponse:
        """
        Record attendance via face recognition.
        - Validates session existence and expiration.
        - Validates employee active status and registered template.
        - Enforces TODAY's attendance in IST (Asia/Kolkata).
        - Handles duplicate attendance:
          - If already present: return 'already_marked'
          - If already absent: return 'already_marked_absent' without overwriting
          - If unmarked: mark 'present' with source 'face'
        """
        agency_id = cls._get_agency_id(user)

        # 1. Validate recognition session
        session_id = req.recognition_session_id.strip()
        session = face_recognition_sessions_collection.find_one({
            "session_id": session_id,
            "agency_id": agency_id,
        })
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Recognition session is invalid or has expired. Please refresh the scanner.",
            )

        now_utc = datetime.now(timezone.utc)
        session_exp = session.get("expires_at")
        if session_exp:
            if hasattr(session_exp, "tzinfo") and session_exp.tzinfo is None:
                session_exp = session_exp.replace(tzinfo=timezone.utc)
            if session_exp < now_utc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Recognition session has expired. Please refresh the scanner.",
                )

        # 2. Validate employee ID and ownership
        if not ObjectId.is_valid(req.employee_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid employee ID format.",
            )

        emp_oid = ObjectId(req.employee_id)
        employee = employees_collection.find_one({
            "_id": emp_oid,
            "agency_id": agency_id,
        })
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or does not belong to your agency.",
            )

        if employee.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face attendance can only be recorded for active staff members.",
            )

        # 3. Verify registered template exists for employee
        template = face_templates_collection.find_one({
            "agency_id": agency_id,
            "employee_id": emp_oid,
        })
        if not template or not template.get("embeddings"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee does not have an active registered face template.",
            )

        # 4. Determine TODAY's date in Indian Standard Time (IST)
        ist = timezone(timedelta(hours=5, minutes=30))
        today_ist_date = datetime.now(ist).strftime("%Y-%m-%d")
        norm_date = AttendanceModel.normalize_date(today_ist_date)

        # 5. Check today's existing attendance
        existing = attendance_collection.find_one({
            "agency_id": agency_id,
            "employee_id": emp_oid,
            "date": norm_date,
        })

        emp_name = employee.get("name", "Staff")
        emp_code = employee.get("employee_code", "")

        # 6. Duplicate check & conflict handling
        if existing:
            st = existing.get("status", "").lower()
            if st == "present":
                return FaceAttendanceMarkResponse(
                    status="already_marked",
                    message=f"{emp_name} ({emp_code}) is already marked Present today.",
                    employee_id=str(emp_oid),
                    employee_code=emp_code,
                    employee_name=emp_name,
                    date=today_ist_date,
                    marked_at=cls._format_datetime(existing.get("marked_at")),
                    attendance_status="present",
                )
            elif st == "absent":
                return FaceAttendanceMarkResponse(
                    status="already_marked_absent",
                    message=f"Attendance for {emp_name} ({emp_code}) was already marked Absent today. Use Manual Attendance to change it.",
                    employee_id=str(emp_oid),
                    employee_code=emp_code,
                    employee_name=emp_name,
                    date=today_ist_date,
                    marked_at=cls._format_datetime(existing.get("marked_at")),
                    attendance_status="absent",
                )

        # 7. Record present attendance
        updated_doc = attendance_collection.find_one_and_update(
            {
                "agency_id": agency_id,
                "employee_id": emp_oid,
                "date": norm_date,
            },
            {
                "$set": {
                    "status": "present",
                    "source": "face",
                    "updated_at": now_utc,
                },
                "$setOnInsert": {
                    "agency_id": agency_id,
                    "employee_id": emp_oid,
                    "date": norm_date,
                    "marked_at": now_utc,
                },
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

        return FaceAttendanceMarkResponse(
            status="marked",
            message=f"Attendance marked Present for {emp_name}.",
            employee_id=str(emp_oid),
            employee_code=emp_code,
            employee_name=emp_name,
            date=today_ist_date,
            marked_at=cls._format_datetime(updated_doc.get("marked_at") or now_utc),
            attendance_status="present",
        )


