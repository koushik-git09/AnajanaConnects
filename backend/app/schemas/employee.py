import re
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class EmployeeCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of employee")
    employee_code: str = Field(..., min_length=2, max_length=30, description="Unique employee identifier code")
    designation: str = Field(..., min_length=2, max_length=100, description="Job role or designation")
    salary: float = Field(..., ge=0, description="Base monthly salary in rupees")
    joining_date: str = Field(..., min_length=4, max_length=50, description="Joining date (YYYY-MM-DD or readable)")
    phone: str | None = Field(default=None, max_length=25, description="Contact phone number")
    email: str | None = Field(default=None, max_length=100, description="Contact email address")
    address: str | None = Field(default=None, max_length=255, description="Residential address")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Employee name cannot be blank")
        return v

    @field_validator("employee_code")
    @classmethod
    def validate_employee_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Employee code cannot be blank")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v:
            v = v.strip().lower()
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
                raise ValueError("Invalid email format")
            return v
        return None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v:
            v = v.strip()
            return v if v else None
        return None


class EmployeeUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    employee_code: str | None = Field(default=None, min_length=2, max_length=30)
    designation: str | None = Field(default=None, min_length=2, max_length=100)
    salary: float | None = Field(default=None, ge=0)
    joining_date: str | None = Field(default=None, min_length=4, max_length=50)
    phone: str | None = Field(default=None, max_length=25)
    email: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=255)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Employee name cannot be blank")
        return v

    @field_validator("employee_code")
    @classmethod
    def validate_employee_code(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip().upper()
            if not v:
                raise ValueError("Employee code cannot be blank")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v:
            v = v.strip().lower()
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
                raise ValueError("Invalid email format")
            return v
        return None


class EmployeeStatusUpdateRequest(BaseModel):
    status: Literal["active", "inactive"] = Field(..., description="Staff status")


class EmployeeResponse(BaseModel):
    id: str
    agency_id: str
    employee_code: str
    name: str
    phone: str | None = None
    email: str | None = None
    designation: str
    salary: float
    joining_date: str
    status: str
    address: str | None = None
    created_at: str
    updated_at: str


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    limit: int
    total_pages: int
