#!/usr/bin/env python3
"""
One-time script to seed a remote Neon database with demo data.

Usage:
    # 1. Set Neon connection strings in your environment (or a temp .env):
    export DATABASE_URL="postgresql+asyncpg://user:pass@ep-xxx-pooler.region.neon.tech/strata?ssl=require"
    export DATABASE_URL_SYNC="postgresql+psycopg2://user:pass@ep-xxx.region.neon.tech/strata?sslmode=require"
    export DEMO_MODE=true

    # 2. Run Alembic migrations first:
    cd apps/api
    alembic upgrade head

    # 3. Then run this script:
    python scripts/seed_neon.py
"""

import asyncio
import sys
from pathlib import Path

# Ensure the app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402


async def main():
    if not settings.demo_mode:
        print("ERROR: DEMO_MODE must be true to seed demo data.")
        sys.exit(1)

    print(
        f"Connecting to: {settings.database_url.split('@')[1] if '@' in settings.database_url else '(hidden)'}"
    )
    print("Running multinational seeder...")

    from app.seed.multinational_seeder import seed_multinational  # noqa: E402

    await seed_multinational()

    print("Done! Neon database is seeded with demo data.")


if __name__ == "__main__":
    asyncio.run(main())
