import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Enable SQL echo in debug mode (set DEBUG=true in .env or environment)
_echo_sql = os.getenv("DEBUG", "").lower() in ("true", "1", "yes")

# SQLite (used in tests) does not support pool_size / max_overflow
_engine_kwargs: dict = {"echo": _echo_sql}
if "sqlite" not in settings.database_url:
    if settings.serverless:
        _engine_kwargs.update(
            pool_size=1,
            max_overflow=2,
            pool_recycle=300,
            pool_pre_ping=True,
        )
    else:
        _engine_kwargs.update(
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            pool_pre_ping=True,
        )

engine = create_async_engine(settings.database_url, **_engine_kwargs)
async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db():
    async with async_session_factory() as session:
        yield session
