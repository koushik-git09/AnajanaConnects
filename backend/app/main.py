from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.mongodb import db, init_db
from app.routes.auth import router as auth_router
from app.routes.employee import router as employee_router
from app.routes.attendance import router as attendance_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure indexes on startup
    init_db()
    yield


app = FastAPI(
    title="Anjana Connects API",
    description="Backend API for Anjana Connects staff & attendance management system",
    version="1.0.0",
    lifespan=lifespan,
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(employee_router, prefix="/api/employees", tags=["Employees"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])


@app.get("/", summary="Root API endpoint")
async def root():
    return {
        "message": "Anjana Connects API is running",
        "version": "1.0.0",
    }


@app.get("/health", summary="Service and database health check")
async def health_check():
    try:
        db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
        }