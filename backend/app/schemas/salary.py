from typing import Literal
from pydantic import BaseModel, Field


class SalaryEmployeeItem(BaseModel):
    employee_id: str
    employee_code: str
    name: str
    designation: str
    status: str
    joining_date: str
    base_salary: float
    effective_daily_cutoff: float | None = None
    cutoff_source: Literal["agency_default", "individual", "not_set"] = "not_set"
    total_days_in_month: int
    eligible_days: int
    present_days: int
    half_days: int
    absent_days: int
    unmarked_days: int
    absence_deduction: float
    calculated_salary: float


class SalaryMonthlyResponse(BaseModel):
    year: int
    month: int
    month_name: str
    agency_id: str
    agency_default_daily_cutoff: float | None = None
    total_employees: int
    total_base_salary: float
    total_deductions: float
    total_net_payable: float
    items: list[SalaryEmployeeItem]
