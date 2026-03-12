"""
Vercel serverless entry point.

Vercel's Python runtime auto-detects the FastAPI ``app`` object and serves it
as an ASGI application.  All requests are routed here via the root vercel.json.
"""

import logging
import os
import sys
import traceback

# When the Vercel project root is the monorepo root, the ``app`` package
# lives under ``apps/api/app/``.  Add ``apps/api`` to sys.path so that
# ``from app.main import app`` resolves correctly.
_api_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
if _api_root not in sys.path:
    sys.path.insert(0, _api_root)

try:
    from app.main import app  # noqa: F401
except Exception:
    # Surface import errors as a visible response instead of a generic 500
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse

    _tb = traceback.format_exc()
    logging.error("Failed to import app: %s", _tb)
    app = FastAPI()

    @app.get("/{path:path}")
    async def _error(path: str):
        return PlainTextResponse(f"App failed to start:\n{_tb}", status_code=500)
