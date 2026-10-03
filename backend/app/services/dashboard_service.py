from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo
from bson import ObjectId

from app.database.mongodb import attendance_collection, employees_collection
from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardEmployeesSummary,
    DashboardMonthAttendance,
    DashboardPayrollSummary,
    DashboardSummaryResponse,
    DashboardTodayAttendance,
)
from app.services.agency_service import AgencyService
from app.services.attendance_service import AttendanceService
from app.services.salary_service import SalaryService

IST_TZ = ZoneInfo("Asia/Kolkata")


class DashboardService:
    @classmethod
    def get_summary(cls, user: dict[str, Any]) -> DashboardSummaryResponse:
        agency_id = AgencyService.get_agency_id(user)
        agency_settings = AgencyService.get_settings(agency_id)
        agency_name = agency_settings.get("name") or agency_id

        now_ist = datetime.now(IST_TZ)
        today_str = now_ist.strftime("%Y-%m-%d")
        current_year = now_ist.year
        current_month = now_ist.month
        month_name = now_ist.strftime("%B")

        # 1. Employee headcount breakdown
        active_count = employees_collection.count_documents(
            {"agency_id": agency_id, "status": "active"}
        )
        inactive_count = employees_collection.count_documents(
            {"agency_id": agency_id, "status": "inactive"}
        )
        total_employees = active_count + inactive_count

        # 2. Today's attendance summary (Active employees only, unmarked != absent)
        daily_summary = AttendanceService.get_daily_summary(user, today_str)

        today_attendance = DashboardTodayAttendance(
            date=today_str,
            total_employees=daily_summary.total_employees,
            present=daily_summary.present,
            absent=daily_summary.absent,
            unmarked=daily_summary.unmarked,
            attendance_percentage=daily_summary.attendance_percentage,
        )

        # 3. Monthly attendance summary
        monthly_summary = AttendanceService.get_monthly_summary(
            user, current_year, current_month
        )

        # Monthly unmarked: days in month up to today * total active - (overall_present + overall_absent)
        month_attendance = DashboardMonthAttendance(
            year=current_year,
            month=current_month,
            month_name=month_name,
            total_active_employees=monthly_summary.total_active_employees,
            overall_present=monthly_summary.overall_present,
            overall_absent=monthly_summary.overall_absent,
            overall_attendance_percentage=monthly_summary.overall_attendance_percentage,
        )

        # 4. Current month payroll snapshot
        payroll_res = SalaryService.get_monthly_payroll(
            user, current_year, current_month
        )

        payroll_summary = DashboardPayrollSummary(
            year=current_year,
            month=current_month,
            month_name=month_name,
            total_employees=payroll_res.total_employees,
            total_base_salary=payroll_res.total_base_salary,
            total_absence_deduction=payroll_res.total_deductions,
            total_net_payable=payroll_res.total_net_payable,
            agency_default_daily_cutoff=payroll_res.agency_default_daily_cutoff,
        )

        # 5. Real recent attendance activity (latest 8 actions)
        recent_cursor = (
            attendance_collection.find({"agency_id": agency_id})
            .sort([("marked_at", -1), ("_id", -1)])
            .limit(8)
        )
        recent_docs = list(recent_cursor)

        # Batch resolve employee codes and names
        emp_ids = set()
        for doc in recent_docs:
            raw_eid = doc.get("employee_id")
            if raw_eid:
                emp_ids.add(raw_eid if isinstance(raw_eid, ObjectId) else ObjectId(str(raw_eid)))

        emp_lookup: dict[str, dict[str, str]] = {}
        if emp_ids:
            for emp in employees_collection.find(
                {"_id": {"$in": list(emp_ids)}},
                {"_id": 1, "name": 1, "employee_code": 1},
            ):
                emp_lookup[str(emp["_id"])] = {
                    "name": emp.get("name", "Unknown Staff"),
                    "employee_code": emp.get("employee_code", ""),
                }

        recent_activity: list[DashboardActivityItem] = []
        for doc in recent_docs:
            eid_str = str(doc.get("employee_id", ""))
            emp_info = emp_lookup.get(eid_str, {"name": "Staff Member", "employee_code": ""})

            raw_marked_at = doc.get("marked_at") or doc.get("updated_at")
            marked_at_iso = (
                raw_marked_at.isoformat()
                if hasattr(raw_marked_at, "isoformat")
                else (str(raw_marked_at) if raw_marked_at else None)
            )

            raw_date = doc.get("date")
            date_str = (
                raw_date.strftime("%Y-%m-%d")
                if hasattr(raw_date, "strftime")
                else str(raw_date)[:10]
            )

            recent_activity.append(
                DashboardActivityItem(
                    id=str(doc.get("_id")),
                    employee_id=eid_str,
                    employee_name=emp_info["name"],
                    employee_code=emp_info["employee_code"],
                    status=doc.get("status", "present"),
                    date=date_str,
                    marked_at=marked_at_iso,
                    method=doc.get("method", "manual"),
                )
            )

        return DashboardSummaryResponse(
            agency_id=agency_id,
            agency_name=agency_name,
            employees=DashboardEmployeesSummary(
                active=active_count,
                inactive=inactive_count,
                total=total_employees,
            ),
            today_attendance=today_attendance,
            month_attendance=month_attendance,
            payroll=payroll_summary,
            recent_activity=recent_activity,
        )
