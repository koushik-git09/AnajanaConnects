import calendar
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.database.mongodb import attendance_collection, employees_collection
from app.schemas.salary import SalaryEmployeeItem, SalaryMonthlyResponse
from app.services.agency_service import AgencyService


class SalaryService:
    @staticmethod
    def _parse_joining_date(joining_date_str: str | None) -> str | None:
        """Extract YYYY-MM-DD if available, or return None if unparseable."""
        if not joining_date_str:
            return None
        cleaned = joining_date_str.strip()
        # Check standard ISO format YYYY-MM-DD
        if len(cleaned) >= 10 and cleaned[:4].isdigit() and cleaned[4] == "-" and cleaned[7] == "-":
            return cleaned[:10]
        return None

    @classmethod
    def get_monthly_payroll(cls, user: dict, year: int, month: int) -> SalaryMonthlyResponse:
        agency_id = AgencyService.get_agency_id(user)
        agency_default_cutoff = AgencyService.get_default_daily_cutoff(agency_id)

        _, total_days_in_month = calendar.monthrange(year, month)
        month_prefix = f"{year:04d}-{month:02d}-"
        month_name = datetime(year, month, 1).strftime("%B")
        month_start_date = f"{year:04d}-{month:02d}-01"
        month_end_date = f"{year:04d}-{month:02d}-{total_days_in_month:02d}"

        start_dt = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
        end_dt = datetime(year, month, total_days_in_month, 23, 59, 59, 999999, tzinfo=timezone.utc)

        # Fetch employees for this agency (active or having records)
        employees_cursor = employees_collection.find({"agency_id": agency_id}).sort("name", 1)
        employees = list(employees_cursor)

        items: list[SalaryEmployeeItem] = []
        total_base = 0.0
        total_deductions = 0.0
        total_net = 0.0

        for emp in employees:
            emp_id = str(emp["_id"])
            emp_oid = emp["_id"] if isinstance(emp["_id"], ObjectId) else ObjectId(emp["_id"])
            joining_date_raw = emp.get("joining_date", "")
            iso_joining = cls._parse_joining_date(joining_date_raw)

            # Determine eligible days in this month
            if iso_joining:
                if iso_joining > month_end_date:
                    # Joined in a future month
                    eligible_days = 0
                elif iso_joining >= month_start_date:
                    # Joined midway through this month
                    joining_day = int(iso_joining[8:10])
                    eligible_days = max(0, total_days_in_month - joining_day + 1)
                else:
                    # Joined before this month
                    eligible_days = total_days_in_month
            else:
                eligible_days = total_days_in_month

            # Query attendance records for this employee in this month
            # Support both ObjectId and str employee_id, and datetime or string date formats
            att_records = list(
                attendance_collection.find({
                    "agency_id": agency_id,
                    "employee_id": {"$in": [emp_oid, emp_id]},
                    "$or": [
                        {"date": {"$gte": start_dt, "$lte": end_dt}},
                        {"date": {"$regex": f"^{month_prefix}"}},
                    ],
                })
            )

            present_days = 0
            half_days = 0
            absent_days = 0

            for rec in att_records:
                st = rec.get("status")
                raw_d = rec.get("date")
                if isinstance(raw_d, datetime):
                    rec_date = raw_d.strftime("%Y-%m-%d")
                else:
                    rec_date = str(raw_d)[:10]

                # Only count absent if on or after joining date
                if iso_joining and rec_date < iso_joining:
                    continue

                if st == "present":
                    present_days += 1
                elif st == "half_day":
                    half_days += 1
                elif st == "absent":
                    absent_days += 1

            unmarked_days = max(0, eligible_days - (present_days + half_days + absent_days))

            # Cutoff resolution
            ind_cutoff = emp.get("daily_cutoff")
            if ind_cutoff is not None:
                effective_cutoff = float(ind_cutoff)
                cutoff_source = "individual"
            elif agency_default_cutoff is not None:
                effective_cutoff = float(agency_default_cutoff)
                cutoff_source = "agency_default"
            else:
                effective_cutoff = None
                cutoff_source = "not_set"

            # Deduction calculation
            base_salary = float(emp.get("salary", 0.0))
            if effective_cutoff is not None:
                absence_deduction = round(absent_days * effective_cutoff, 2)
            else:
                absence_deduction = 0.0

            # Net payable (never negative)
            calculated_salary = round(max(0.0, base_salary - absence_deduction), 2)

            total_base += base_salary
            total_deductions += absence_deduction
            total_net += calculated_salary

            items.append(
                SalaryEmployeeItem(
                    employee_id=emp_id,
                    employee_code=emp.get("employee_code", ""),
                    name=emp.get("name", ""),
                    designation=emp.get("designation", "Staff"),
                    status=emp.get("status", "active"),
                    joining_date=joining_date_raw,
                    base_salary=base_salary,
                    effective_daily_cutoff=effective_cutoff,
                    cutoff_source=cutoff_source,
                    total_days_in_month=total_days_in_month,
                    eligible_days=eligible_days,
                    present_days=present_days,
                    half_days=half_days,
                    absent_days=absent_days,
                    unmarked_days=unmarked_days,
                    absence_deduction=absence_deduction,
                    calculated_salary=calculated_salary,
                )
            )

        return SalaryMonthlyResponse(
            year=year,
            month=month,
            month_name=month_name,
            agency_id=agency_id,
            agency_default_daily_cutoff=agency_default_cutoff,
            total_employees=len(items),
            total_base_salary=round(total_base, 2),
            total_deductions=round(total_deductions, 2),
            total_net_payable=round(total_net, 2),
            items=items,
        )
