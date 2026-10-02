from typing import Any
from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user
from app.schemas.employee import (
    EmployeeCreateRequest,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeStatusUpdateRequest,
    EmployeeUpdateRequest,
)
from app.services.employee_service import EmployeeService

router = APIRouter()


@router.get(
    "",
    response_model=EmployeeListResponse,
    summary="List agency staff members",
)
async def list_employees(
    search: str | None = Query(default=None, description="Search by name, code, phone, or email"),
    status: str | None = Query(default=None, description="Filter by status ('active', 'inactive', or 'all')"),
    designation: str | None = Query(default=None, description="Filter by designation/role"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeListResponse:
    """Retrieve paginated staff directory belonging strictly to the authenticated agency."""
    return EmployeeService.list_employees(
        user=current_user,
        search=search,
        status_filter=status,
        designation=designation,
        page=page,
        limit=limit,
    )


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get employee profile by ID",
)
async def get_employee(
    employee_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeResponse:
    """Fetch complete employee profile with IDOR prevention."""
    return EmployeeService.get_employee(user=current_user, employee_id=employee_id)


@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new staff member",
)
async def create_employee(
    req: EmployeeCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeResponse:
    """Add a new staff member to the agency roster with duplicate code verification."""
    return EmployeeService.create_employee(user=current_user, req=req)


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update staff member details",
)
async def update_employee(
    employee_id: str,
    req: EmployeeUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeResponse:
    """Update profile information for an existing staff member."""
    return EmployeeService.update_employee(user=current_user, employee_id=employee_id, req=req)


@router.patch(
    "/{employee_id}/status",
    response_model=EmployeeResponse,
    summary="Toggle staff active / inactive status",
)
async def update_employee_status(
    employee_id: str,
    req: EmployeeStatusUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> EmployeeResponse:
    """Activate or deactivate staff member to maintain historical attendance records."""
    return EmployeeService.update_status(user=current_user, employee_id=employee_id, new_status=req.status)


@router.delete(
    "/{employee_id}",
    summary="Remove employee from agency roster",
)
async def delete_employee(
    employee_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict:
    """Permanently delete an employee if no historical dependencies exist."""
    return EmployeeService.delete_employee(user=current_user, employee_id=employee_id)
