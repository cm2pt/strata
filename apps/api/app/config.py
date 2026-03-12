import re
import warnings
from pathlib import Path

from pydantic_settings import BaseSettings


def _adapt_neon_url(url: str, driver: str = "asyncpg") -> str:
    """Transform a Neon/Vercel-provided PostgreSQL URL for SQLAlchemy drivers.

    Vercel's Neon integration provides ``postgresql://…`` URLs with parameters
    that are incompatible with asyncpg (``channel_binding``, ``sslmode``).
    This helper rewrites the URL so it works with the requested driver.
    """
    if not url or "neon.tech" not in url:
        return url
    # Replace driver prefix
    url = re.sub(r"^postgresql(\+\w+)?://", f"postgresql+{driver}://", url)
    # Remove channel_binding (not supported by asyncpg)
    url = re.sub(r"[?&]channel_binding=[^&]*", "", url)
    # If removal left & as first query-string char, replace with ?
    url = re.sub(r"\?&", "?", url)
    url = re.sub(r"([^?])&", r"\1?", url) if "?" not in url.split("@")[-1] else url
    # Ensure remaining params start with ?
    parts = url.split("@", 1)
    if len(parts) == 2 and "?" not in parts[1] and "&" in parts[1]:
        parts[1] = parts[1].replace("&", "?", 1)
        url = "@".join(parts)
    if driver == "asyncpg":
        # asyncpg uses ``ssl`` not ``sslmode``
        url = url.replace("sslmode=require", "ssl=require")
    return url


_DEFAULT_JWT_SECRET = "dev-secret-change-in-production"


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://strata:localdev@localhost:5432/strata"
    database_url_sync: str = (
        "postgresql+psycopg2://strata:localdev@localhost:5432/strata"
    )
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    # Short-lived access token (minutes) — used when refresh tokens are active
    jwt_access_minutes: int = 15
    # Refresh token lifetime (days)
    jwt_refresh_days: int = 30
    encryption_key: str = "dev-encryption-key-32bytes!!"
    demo_mode: bool = True
    cors_origins: str = "http://localhost:3001,http://127.0.0.1:3001"
    demo_data_path: str = "/demo-data"

    # Rate limiting: max login attempts per minute per IP
    login_rate_limit: str = "5/minute"

    # Serverless mode: disables startup seeding, reduces connection pool,
    # and relaxes in-memory rate limiting (no shared state across invocations).
    serverless: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# ---------------------------------------------------------------------------
# Adapt Neon URLs for SQLAlchemy drivers (Vercel injects plain postgresql://)
# ---------------------------------------------------------------------------
settings.database_url = _adapt_neon_url(settings.database_url, driver="asyncpg")
settings.database_url_sync = _adapt_neon_url(
    settings.database_url_sync, driver="psycopg2"
)

# ---------------------------------------------------------------------------
# Auto-resolve demo_data_path for local development
# ---------------------------------------------------------------------------
if settings.demo_data_path == "/demo-data" and not Path("/demo-data").exists():
    # Try common local paths relative to the project structure
    _candidates = [
        Path(__file__).resolve().parent.parent.parent.parent
        / "infra"
        / "demo-data",  # apps/api/app/config.py → project root
        Path.cwd() / "infra" / "demo-data",
        Path.cwd().parent.parent / "infra" / "demo-data",  # from apps/api/
    ]
    for p in _candidates:
        if p.exists():
            settings.demo_data_path = str(p)
            break

# ---------------------------------------------------------------------------
# Startup safety check: warn / refuse to start with default JWT secret
# ---------------------------------------------------------------------------
if settings.jwt_secret == _DEFAULT_JWT_SECRET:
    if settings.demo_mode:
        warnings.warn(
            "JWT_SECRET is using the built-in default. "
            "This is acceptable for local demo mode but MUST be changed in production.",
            stacklevel=1,
        )
    else:
        raise RuntimeError(
            "FATAL: JWT_SECRET is set to the default value. "
            "Set a strong, unique JWT_SECRET environment variable before running in production. "
            "If you are running in demo mode, set DEMO_MODE=true."
        )
