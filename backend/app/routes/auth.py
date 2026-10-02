from typing import Any
from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegistrationStatusResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.get(
    "/status",
    response_model=RegistrationStatusResponse,
    summary="Check if initial owner registration is available",
)
async def check_registration_status() -> RegistrationStatusResponse:
    """Returns whether the agency needs initial owner setup or is already configured."""
    return AuthService.get_registration_status()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register initial agency owner",
)
async def register(req: RegisterRequest) -> TokenResponse:
    """
    Register the first owner for Anjana Connects.
    Subsequent registrations are locked to maintain agency security.
    """
    return AuthService.register_initial_owner(req)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate agency owner / staff",
)
async def login(req: LoginRequest) -> TokenResponse:
    """Validate credentials and issue JWT bearer access token."""
    return AuthService.login(req)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset link",
)
async def forgot_password(req: ForgotPasswordRequest) -> MessageResponse:
    """
    Initiates the password reset workflow.
    Dispatches a single-use, 15-minute tokenized link via SMTP without revealing account existence.
    """
    return AuthService.forgot_password(req)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password with verification token",
)
async def reset_password(req: ResetPasswordRequest) -> MessageResponse:
    """
    Validates token and updates user password hash with Argon2.
    Marks token as used.
    """
    return AuthService.reset_password(req)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    """Return profile information of the currently authenticated user."""
    return AuthService.format_user_response(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out of application",
)
async def logout() -> MessageResponse:
    """Clear client authentication state."""
    return MessageResponse(message="Logged out successfully")
