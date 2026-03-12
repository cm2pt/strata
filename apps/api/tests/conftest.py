"""
Shared test fixtures — in-memory SQLite async engine + FastAPI test client.

All tests run against an isolated in-memory database. No Postgres required.
The real DB session dependency is overridden so every endpoint test uses
the test database.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# ---------- env overrides BEFORE any app imports ----------
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["DATABASE_URL_SYNC"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["ENCRYPTION_KEY"] = "test-key-32bytes-long-for-test!"
os.environ["DEMO_MODE"] = "true"
os.environ["CORS_ORIGINS"] = "http://localhost:3001"
os.environ["LOGIN_RATE_LIMIT"] = "1000/minute"  # effectively disable rate limiting in tests

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import StaticPool, Text, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ---------- SQLite compatibility shims ----------
# PostgreSQL ARRAY type doesn't exist in SQLite. Register a compile-time
# adapter that renders ARRAY columns as TEXT so create_all succeeds.

from sqlalchemy.dialects.postgresql import ARRAY  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.sql.functions import percentile_cont  # noqa: E402
from sqlalchemy.sql.expression import WithinGroup  # noqa: E402


@compiles(ARRAY, "sqlite")
def _compile_array_for_sqlite(type_, compiler, **kw):
    return compiler.visit_TEXT(Text())


@compiles(WithinGroup, "sqlite")
def _compile_within_group_for_sqlite(element, compiler, **kw):
    """Replace percentile_cont(...) WITHIN GROUP (ORDER BY col) with AVG(col) for SQLite."""
    # element.order_by is a ClauseList; grab first column for AVG
    order_cols = list(element.order_by)
    if order_cols:
        return f"AVG({compiler.process(order_cols[0])})"
    return "0"


# ---------- Create test engine BEFORE importing app.database ----------

_test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(_test_engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

    # Register Postgres-specific SQL function shims for SQLite
    dbapi_conn.create_function("date_trunc", 2, lambda part, val: val[:7] if part == "month" and val else val)


TestSession = async_sessionmaker(_test_engine, class_=AsyncSession, expire_on_commit=False)

# ---------- Patch app.database before anyone imports it ----------

import app.database as _db_mod  # noqa: E402

_db_mod.engine = _test_engine
_db_mod.async_session_factory = TestSession

# Replace the generator
_original_get_db = _db_mod.get_db


async def _test_get_db():
    async with TestSession() as session:
        yield session


_db_mod.get_db = _test_get_db

# ---------- Now safe to import the rest of the app ----------

from jose import jwt as jose_jwt  # noqa: E402

from app.models.base import Base  # noqa: E402
from app.models import (  # noqa: E402, F401 — trigger registration
    User, UserOrgRole, UserRole, Organization,
    DataProduct, LifecycleStage, PlatformType,
)
from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402

# Override FastAPI's dependency resolution too
app.dependency_overrides[_original_get_db] = _test_get_db


# ---------- Fixtures ----------


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    """Provide a clean DB session."""
    async with TestSession() as session:
        yield session


# Fixed CSRF token for tests — the middleware validates cookie == header
_TEST_CSRF_TOKEN = "test-csrf-token-for-testing"


@pytest_asyncio.fixture
async def client():
    """Async test client for the FastAPI app (no auth).

    Includes a CSRF cookie + header so that POST/PATCH/DELETE requests
    pass the double-submit cookie validation middleware.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        cookies={"csrf_token": _TEST_CSRF_TOKEN},
        headers={"X-CSRF-Token": _TEST_CSRF_TOKEN},
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def org_and_user(db: AsyncSession):
    """Create a test org + user with 'admin' role. Returns (org, user, org_role)."""
    org = Organization(name="Test Corp", slug="test-corp")
    db.add(org)
    await db.flush()

    user = User(
        email="admin@test.com",
        password_hash="$2b$12$dummyhashfortest123456789abcdefghijklmnopq",
        name="Admin User",
        title="System Admin",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    org_role = UserOrgRole(user_id=user.id, org_id=org.id, role=UserRole.admin)
    db.add(org_role)
    await db.commit()
    await db.refresh(org)
    await db.refresh(user)
    return org, user, org_role


def make_token(user_id: uuid.UUID, org_id: uuid.UUID, role: str = "admin") -> str:
    """Create a JWT token for test requests."""
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jose_jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def auth_headers(token: str) -> dict:
    """Return headers dict with Bearer token and CSRF token."""
    return {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": _TEST_CSRF_TOKEN,
    }


@pytest_asyncio.fixture
async def seeded_product(db: AsyncSession, org_and_user):
    """Create a DataProduct linked to the test org for router tests."""
    from decimal import Decimal
    org, user, _ = org_and_user
    product = DataProduct(
        org_id=org.id,
        owner_id=user.id,
        name="Test Product",
        domain="analytics",
        business_unit="Engineering",
        platform=PlatformType.snowflake,
        lifecycle_stage=LifecycleStage.active,
        monthly_cost=Decimal("2000.00"),
        composite_value=Decimal("6000.00"),
        monthly_consumers=20,
        subscription_count=3,
        roi=Decimal("3.0"),
        roi_band="healthy",
        is_published=True,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product
