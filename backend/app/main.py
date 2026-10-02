from fastapi import FastAPI

from app.database.mongodb import db

app = FastAPI(
    title="Anjana Connects API",
    description="Backend API for Anjana Connects staff management system",
    version="1.0.0",
)


@app.get("/")
async def root():
    return {
        "message": "Anjana Connects API is running"
    }


@app.get("/health")
async def health_check():
    try:
        db.command("ping")

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }