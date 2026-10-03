from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.core.config import settings

if not settings.MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not configured in environment variables")

client = MongoClient(settings.MONGODB_URI)
db: Database = client[settings.DATABASE_NAME]
users_collection: Collection = db["users"]
password_reset_tokens_collection: Collection = db["password_reset_tokens"]
employees_collection: Collection = db["employees"]
attendance_collection: Collection = db["attendance"]
agencies_collection: Collection = db["agencies"]
face_templates_collection: Collection = db["face_templates"]
face_recognition_sessions_collection: Collection = db["face_recognition_sessions"]


def init_db():
    """Ensure database indexes exist."""
    try:
        # Unique index on email field in users collection
        users_collection.create_index([("email", ASCENDING)], unique=True)
    except Exception as e:
        print(f"Warning: could not create users email index: {e}")

    try:
        # TTL index on expires_at for automatic cleanup of expired reset tokens
        password_reset_tokens_collection.create_index(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
        )
        # Index on token_hash for fast token lookup
        password_reset_tokens_collection.create_index([("token_hash", ASCENDING)])
        # Index on user_id for fast user token invalidation
        password_reset_tokens_collection.create_index([("user_id", ASCENDING)])
    except Exception as e:
        print(f"Warning: could not create password_reset_tokens indexes: {e}")

    try:
        # Compound unique index: scoped per agency so employee_code is unique within the agency
        employees_collection.create_index(
            [("agency_id", ASCENDING), ("employee_code", ASCENDING)],
            unique=True,
        )
        # Compound index for filtering employees by status within agency
        employees_collection.create_index(
            [("agency_id", ASCENDING), ("status", ASCENDING)],
        )
        # Compound index for searching employees by name within agency
        employees_collection.create_index(
            [("agency_id", ASCENDING), ("name", ASCENDING)],
        )
    except Exception as e:
        print(f"Warning: could not create employees indexes: {e}")

    try:
        # Unique compound index to prevent duplicate attendance records for an employee on a single calendar date
        attendance_collection.create_index(
            [("agency_id", ASCENDING), ("employee_id", ASCENDING), ("date", ASCENDING)],
            unique=True,
        )
        # Fast query for agency attendance by date
        attendance_collection.create_index(
            [("agency_id", ASCENDING), ("date", ASCENDING)],
        )
        # Fast query for employee attendance history sorted chronologically
        attendance_collection.create_index(
            [("agency_id", ASCENDING), ("employee_id", ASCENDING), ("date", DESCENDING)],
        )
    except Exception as e:
        print(f"Warning: could not create attendance indexes: {e}")

    try:
        # Unique index for agency configuration
        agencies_collection.create_index([("agency_id", ASCENDING)], unique=True)
    except Exception as e:
        print(f"Warning: could not create agencies index: {e}")

    try:
        # Compound unique index for face templates: one active template per employee within an agency
        face_templates_collection.create_index(
            [("agency_id", ASCENDING), ("employee_id", ASCENDING)],
            unique=True,
        )
    except Exception as e:
        print(f"Warning: could not create face_templates index: {e}")

    try:
        # TTL index for automatic expiry of face recognition sessions (5 min)
        face_recognition_sessions_collection.create_index(
            [("expires_at", ASCENDING)],
            expireAfterSeconds=0,
        )
        # Fast query for session verification by agency and session_id
        face_recognition_sessions_collection.create_index(
            [("agency_id", ASCENDING), ("session_id", ASCENDING)],
            unique=True,
        )
    except Exception as e:
        print(f"Warning: could not create face_recognition_sessions index: {e}")