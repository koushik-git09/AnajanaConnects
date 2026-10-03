from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.mongodb import db, init_db
from app.routes.auth import router as auth_router
from app.routes.employee import router as employee_router
from app.routes.attendance import router as attendance_router
from app.routes.agency import router as agency_router
from app.routes.salary import router as salary_router
from app.routes.face import router as face_router
from app.routes.dashboard import router as dashboard_router
from app.routes.reports import router as reports_router


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
app.include_router(agency_router, prefix="/api", tags=["Agency"])
app.include_router(salary_router, prefix="/api", tags=["Salary"])
app.include_router(face_router, prefix="/api", tags=["Face Registration"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard"])
app.include_router(reports_router, prefix="/api", tags=["Reports"])


import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("anjana_connects")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again or contact system administration."},
    )


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
        logger.error("Database health check ping failed: %s", e)
        return {
            "status": "unhealthy",
            "database": "disconnected",
        }