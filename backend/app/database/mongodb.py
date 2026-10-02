import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

# Load .env from backend directory if present, or fallback to current directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.is_file():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "anjana_connects")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not configured")

client = MongoClient(MONGODB_URI)

db = client[DATABASE_NAME]