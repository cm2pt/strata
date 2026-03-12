import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine
from app.auth.rate_limit import limiter
from app.logging_config import setup_logging

logger = logging.getLogger("strata.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: configure structured logging, run seeder if DEMO_MODE and DB is empty. Shutdown: dispose engine."""
    setup_logging()
    if settings.demo_mode and not settings.serverless:
        from app.seed.multinational_seeder import seed_multinational

        await seed_multinational()
    yield
    await engine.dispose()


app = FastAPI(
    title="Strata API",
    description="The financial operating system for enterprise data portfolios.",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiter — attach to app state so slowapi decorators work
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-CSRF-Token",
        "X-Idempotency-Key",
    ],
)

# GZip response compression for responses >= 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# Deprecation / Sunset headers for deprecated endpoints
from app.middleware.deprecation import DeprecationHeadersMiddleware  # noqa: E402

app.add_middleware(DeprecationHeadersMiddleware)


# CSRF double-submit cookie validation for mutating requests
_CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/demo-login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/health",
    "/api/v1/health",
}

_CSRF_METHODS = {"POST", "PATCH", "DELETE"}


@app.middleware("http")
async def csrf_double_submit(request, call_next):
    """Validate X-CSRF-Token header matches csrf_token cookie for mutating requests.

    CSRF protection is skipped when the request uses Bearer token authentication,
    since Bearer tokens cannot be automatically attached by the browser (unlike cookies),
    making CSRF attacks inapplicable for token-based auth.
    """
    if request.method in _CSRF_METHODS:
        path = request.url.path
        if path not in _CSRF_EXEMPT_PATHS:
            # Skip CSRF for Bearer-token-authenticated requests — CSRF only
            # applies to cookie-based session auth where the browser auto-sends
            # credentials. Bearer tokens require explicit JS to attach, so they
            # are inherently immune to CSRF.
            auth_header = request.headers.get("authorization", "")
            if not auth_header.startswith("Bearer "):
                cookie_token = request.cookies.get("csrf_token")
                header_token = request.headers.get("x-csrf-token")
                if not cookie_token or not header_token or cookie_token != header_token:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token missing or invalid"},
                    )
    return await call_next(request)


# Limit request body size to 1MB
@app.middleware("http")
async def limit_request_size(request, call_next):
    if request.headers.get("content-length"):
        content_length = int(request.headers.get("content-length", 0))
        if content_length > 1_048_576:  # 1MB
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large. Maximum size is 1MB."},
            )
    return await call_next(request)


# Request timing middleware
@app.middleware("http")
async def log_request_timing(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration_ms, 2),
            "request_id": request.headers.get("x-request-id", ""),
        },
    )
    # Add timing header for client debugging
    response.headers["X-Response-Time"] = f"{duration_ms:.0f}ms"
    return response


# Mount API v1 router (includes /api/v1/health)
from app.api.v1.router import api_router  # noqa: E402

app.include_router(api_router, prefix="/api/v1")

# Backwards-compatible root health check — delegates to the v1 endpoint
from app.api.v1.health import health_check  # noqa: E402

app.get("/health", tags=["health"])(health_check)
