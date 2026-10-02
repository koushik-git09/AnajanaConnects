import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

# Initialize Argon2 password hasher
password_hash_engine = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    """Hash password using Argon2 via pwdlib."""
    return password_hash_engine.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2 hash."""
    return password_hash_engine.verify(plain_password, hashed_password)


def generate_reset_token() -> str:
    """Generate a cryptographically secure random token for password reset."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Hash password reset token using SHA-256 for secure database storage."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a signed JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except (jwt.PyJWTError, Exception):
        return None
