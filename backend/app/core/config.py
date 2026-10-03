import os
from pathlib import Path
from dotenv import load_dotenv

# Robustly find backend/.env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.is_file():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    MONGODB_URI: str = os.getenv("MONGODB_URI", "").strip()
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "anjana_connects").strip()
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-anjana-connects-jwt-key-change-in-prod-1234567890").strip()
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256").strip()
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60").strip())

    # CORS configuration
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()

    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587").strip())
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "").strip()
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip()
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "").strip()
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Anjana Connects").strip()

    # Password Reset Expiry (in minutes)
    PASSWORD_RESET_EXPIRE_MINUTES: int = int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "15").strip())

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
        ]
        if self.FRONTEND_URL:
            for item in self.FRONTEND_URL.split(","):
                clean = item.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)
        return origins


settings = Settings()
