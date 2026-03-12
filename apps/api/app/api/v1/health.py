"""Health check endpoint with dependency health."""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(tags=["health"])

_start_time = time.monotonic()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check with dependency status."""
    checks: dict = {}
    overall_status = "healthy"

    # Database check
    try:
        start = time.monotonic()
        await db.execute(text("SELECT 1"))
        db_latency = (time.monotonic() - start) * 1000
        checks["database"] = {"status": "healthy", "latency_ms": round(db_latency, 2)}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        overall_status = "degraded"

    checks["timestamp"] = datetime.now(timezone.utc).isoformat()

    return {
        "status": overall_status,
        "version": "1.0.0",
        "uptime_seconds": round(time.monotonic() - _start_time, 2),
        "checks": checks,
    }
