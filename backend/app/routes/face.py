from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.face import (
    FaceDeleteResponse,
    FaceRegistrationRequest,
    FaceRegistrationStatusResponse,
)
from app.services.face_service import FaceService

router = APIRouter(prefix="/employees/{employee_id}/face", tags=["Face Registration"])


@router.post("", response_model=FaceRegistrationStatusResponse)
def register_employee_face(
    employee_id: str,
    req: FaceRegistrationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Register normalized face embeddings for an active employee.
    Stores the template in MongoDB under strict agency tenancy.
    """
    return FaceService.register_face(
        user=current_user,
        employee_id=employee_id,
        req=req,
    )


@router.get("", response_model=FaceRegistrationStatusResponse)
def get_employee_face_status(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get face registration status and metadata for an employee (does not return raw vectors).
    """
    return FaceService.get_face_status(
        user=current_user,
        employee_id=employee_id,
    )


@router.delete("", response_model=FaceDeleteResponse)
def delete_employee_face(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete the registered face template for an employee.
    """
    return FaceService.delete_face(
        user=current_user,
        employee_id=employee_id,
    )
