"""
Vercel serverless entry point.

Vercel's Python runtime auto-detects the FastAPI ``app`` object and serves it
as an ASGI application.  All requests are routed here via vercel.json.
"""

from app.main import app  # noqa: F401
