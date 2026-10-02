import logging
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.database.mongodb import password_reset_tokens_collection, users_collection
from app.models.user import UserModel
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
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    def format_user_response(user: dict) -> UserResponse:
        return UserResponse(
            id=str(user["_id"]),
            name=user.get("name", ""),
            email=user.get("email", ""),
            role=user.get("role", "owner"),
            agency_id=user.get("agency_id", "anjana_gas_agency"),
            created_at=user.get("created_at", ""),
        )

    @classmethod
    def register_initial_owner(cls, req: RegisterRequest) -> TokenResponse:
        # Enforce rule: Only the first owner can register
        user_count = users_collection.count_documents({})
        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration is locked. An owner account has already been registered for this agency.",
            )

        # Check existing email
        if users_collection.find_one({"email": req.email}):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        # Hash password using Argon2
        hashed = hash_password(req.password)
        doc = UserModel.create_document(
            name=req.name,
            email=req.email,
            password_hash=hashed,
            role="owner",
            agency_id="anjana_gas_agency",
        )

        try:
            result = users_collection.insert_one(doc)
            doc["_id"] = result.inserted_id
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        # Create JWT token
        token_data = {
            "sub": str(doc["_id"]),
            "role": doc["role"],
            "agency_id": doc["agency_id"],
            "email": doc["email"],
        }
        token = create_access_token(token_data)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=cls.format_user_response(doc),
        )

    @classmethod
    def login(cls, req: LoginRequest) -> TokenResponse:
        user = users_collection.find_one({"email": req.email})
        if not user or not verify_password(req.password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_data = {
            "sub": str(user["_id"]),
            "role": user.get("role", "owner"),
            "agency_id": user.get("agency_id", "anjana_gas_agency"),
            "email": user.get("email", ""),
        }
        token = create_access_token(token_data)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=cls.format_user_response(user),
        )

    @classmethod
    def get_registration_status(cls) -> RegistrationStatusResponse:
        count = users_collection.count_documents({})
        return RegistrationStatusResponse(
            registration_allowed=(count == 0),
            total_users=count,
        )

    @classmethod
    def forgot_password(cls, req: ForgotPasswordRequest) -> MessageResponse:
        generic_message = "If an account exists for this email, a password reset link has been sent."

        user = users_collection.find_one({"email": req.email})
        if not user:
            # Prevent account enumeration: return same generic response
            return MessageResponse(message=generic_message)

        # Invalidate any prior unused reset tokens for this user
        password_reset_tokens_collection.update_many(
            {"user_id": user["_id"], "used": False},
            {"$set": {"used": True}},
        )

        # Generate cryptographically secure token & SHA-256 hash
        raw_token = generate_reset_token()
        token_hash = hash_reset_token(raw_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)

        token_doc = {
            "user_id": user["_id"],
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used": False,
            "created_at": now,
        }
        password_reset_tokens_collection.insert_one(token_doc)

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

        try:
            EmailService.send_password_reset_email(
                recipient_email=user["email"],
                recipient_name=user.get("name", "Agency Owner"),
                reset_url=reset_url,
            )
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to dispatch password reset email. Please contact agency technical support.",
            )

        return MessageResponse(message=generic_message)

    @classmethod
    def reset_password(cls, req: ResetPasswordRequest) -> MessageResponse:
        invalid_error = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or has expired.",
        )

        token_hash = hash_reset_token(req.token)
        token_doc = password_reset_tokens_collection.find_one({"token_hash": token_hash})

        if not token_doc:
            raise invalid_error

        if token_doc.get("used", False):
            raise invalid_error

        expires_at = token_doc.get("expires_at")
        if not expires_at:
            raise invalid_error

        # Ensure timezone-aware comparison
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            raise invalid_error

        user = users_collection.find_one({"_id": token_doc["user_id"]})
        if not user:
            raise invalid_error

        # Hash new password using Argon2
        hashed_password = hash_password(req.new_password)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update user's password hash
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"password_hash": hashed_password, "updated_at": now_iso}},
        )

        # Invalidate current token and any outstanding tokens for this user
        password_reset_tokens_collection.update_many(
            {"user_id": user["_id"]},
            {"$set": {"used": True}},
        )

        logger.info(f"Password reset successfully executed for user_id={user['_id']}")
        return MessageResponse(message="Password reset successfully.")
