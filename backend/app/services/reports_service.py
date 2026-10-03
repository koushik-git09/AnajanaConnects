from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo
from bson import ObjectId
from fastapi import HTTPException, status

from app.database.mongodb import attendance_collection, employees_collection
from app.models.attendance import AttendanceModel
from app.schemas.attendance import EmployeeAttendanceHistoryResponse
from app.schemas.reports import (
    AttendanceReportItem,
    AttendanceReportResponse,
    AttendanceReportSummary,
)
from app.schemas.salary import SalaryMonthlyResponse
from app.services.agency_service import AgencyService
from app.services.attendance_service import AttendanceService
from app.services.salary_service import SalaryService

IST_TZ = ZoneInfo("Asia/Kolkata")


class ReportsService:
    @classmethod
    def get_attendance_report(
        cls,
        user: dict[str, Any],
        start_date: str | None = None,
        end_date: str | None = None,
        status_filter: str | None = None,
        employee_id: str | None = None,
        search: str | None = None,
    ) -> AttendanceReportResponse:
        agency_id = AgencyService.get_agency_id(user)
        now_ist = datetime.now(IST_TZ)

        # Default to current month start and end if not provided
        if not start_date:
            start_date = f"{now_ist.year:04d}-{now_ist.month:02d}-01"
        if not end_date:
            end_date = now_ist.strftime("%Y-%m-%d")

        try:
            norm_start = AttendanceModel.normalize_date(start_date)
            norm_end = AttendanceModel.normalize_date(end_date)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Expected YYYY-MM-DD",
            )

        if norm_start > norm_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date must be less than or equal to end_date",
            )

        # Base query
        query: dict[str, Any] = {
            "agency_id": agency_id,
            "date": {"$gte": norm_start, "$lte": norm_end},
        }

        if status_filter and status_filter.lower() in ("present", "absent"):
            query["status"] = status_filter.lower()

        if employee_id and employee_id.strip():
            emp_id_str = employee_id.strip()
            try:
                emp_oid = ObjectId(emp_id_str)
                query["employee_id"] = {"$in": [emp_oid, emp_id_str]}
            except Exception:
                query["employee_id"] = emp_id_str

        # Fetch matching attendance documents
        records = list(
            attendance_collection.find(query).sort([("date", -1), ("marked_at", -1)])
        )

        # Pre-fetch employees for mapping
        emp_ids = set()
        for r in records:
            eid = r.get("employee_id")
            if eid:
                emp_ids.add(eid if isinstance(eid, ObjectId) else ObjectId(str(eid)))

        emp_lookup: dict[str, dict[str, str]] = {}
        if emp_ids:
            for emp in employees_collection.find(
                {"_id": {"$in": list(emp_ids)}},
                {"_id": 1, "name": 1, "employee_code": 1, "designation": 1},
            ):
                emp_lookup[str(emp["_id"])] = {
                    "name": emp.get("name", "Unknown Staff"),
                    "employee_code": emp.get("employee_code", ""),
                    "designation": emp.get("designation", "Staff"),
                }

        search_clean = search.strip().lower() if search and search.strip() else None

        items: list[AttendanceReportItem] = []
        present_count = 0
        absent_count = 0

        for r in records:
            eid_str = str(r.get("employee_id", ""))
            emp_info = emp_lookup.get(
                eid_str,
                {"name": "Staff Member", "employee_code": "", "designation": "Staff"},
            )

            # Apply client-level search if requested
            if search_clean:
                matches_name = search_clean in emp_info["name"].lower()
                matches_code = search_clean in emp_info["employee_code"].lower()
                if not (matches_name or matches_code):
                    continue

            rec_status = r.get("status", "present")
            if rec_status == "present":
                present_count += 1
            elif rec_status == "absent":
                absent_count += 1

            raw_d = r.get("date")
            d_str = (
                raw_d.strftime("%Y-%m-%d")
                if hasattr(raw_d, "strftime")
                else str(raw_d)[:10]
            )

            raw_m = r.get("marked_at") or r.get("updated_at")
            m_str = (
                raw_m.isoformat()
                if hasattr(raw_m, "isoformat")
                else (str(raw_m) if raw_m else None)
            )

            items.append(
                AttendanceReportItem(
                    id=str(r.get("_id")),
                    date=d_str,
                    employee_id=eid_str,
                    employee_code=emp_info["employee_code"],
                    employee_name=emp_info["name"],
                    designation=emp_info["designation"],
                    status=rec_status,
                    marked_at=m_str,
                    method=r.get("method", "manual"),
                )
            )

        total_records = len(items)
        denom = present_count + absent_count
        attendance_pct = (
            round((present_count / denom) * 100.0, 2) if denom > 0 else 0.0
        )

        return AttendanceReportResponse(
            summary=AttendanceReportSummary(
                start_date=start_date,
                end_date=end_date,
                total_records=total_records,
                total_present=present_count,
                total_absent=absent_count,
                attendance_percentage=attendance_pct,
            ),
            items=items,
        )

    @classmethod
    def get_employee_attendance_report(
        cls,
        user: dict[str, Any],
        employee_id: str,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> EmployeeAttendanceHistoryResponse:
        return AttendanceService.get_employee_attendance_history(
            user=user,
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
        )

    @classmethod
    def get_salary_report(
        cls,
        user: dict[str, Any],
        year: int | None = None,
        month: int | None = None,
        employee_id: str | None = None,
    ) -> SalaryMonthlyResponse:
        now_ist = datetime.now(IST_TZ)
        target_year = year if year is not None else now_ist.year
        target_month = month if month is not None else now_ist.month

        payroll = SalaryService.get_monthly_payroll(
            user=user,
            year=target_year,
            month=target_month,
        )

        if employee_id and employee_id.strip():
            target_eid = employee_id.strip()
            filtered_items = [it for it in payroll.items if it.employee_id == target_eid]
            total_base = round(sum(it.base_salary for it in filtered_items), 2)
            total_ded = round(sum(it.absence_deduction for it in filtered_items), 2)
            total_net = round(sum(it.calculated_salary for it in filtered_items), 2)

            return SalaryMonthlyResponse(
                year=payroll.year,
                month=payroll.month,
                month_name=payroll.month_name,
                agency_id=payroll.agency_id,
                agency_default_daily_cutoff=payroll.agency_default_daily_cutoff,
                total_employees=len(filtered_items),
                total_base_salary=total_base,
                total_deductions=total_ded,
                total_net_payable=total_net,
                items=filtered_items,
            )

        return payroll
