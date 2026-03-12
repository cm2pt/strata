"""
Deprecation / Sunset headers middleware.

Adds RFC 8594 ``Deprecation`` and ``Sunset`` headers to responses whose
request path matches a deprecated endpoint.

Usage:
    1. Add entries to ``DEPRECATED_ENDPOINTS`` below.
    2. Register the middleware on the FastAPI app (see ``main.py``).

Each entry maps a path prefix to a dict with:
    - ``sunset``  : ISO-8601 date string (YYYY-MM-DD) for the removal date.
    - ``message`` : optional human-readable deprecation notice (added as a
                    ``X-Deprecation-Notice`` header).
"""

from __future__ import annotations

from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.datastructures import MutableHeaders

# ---------------------------------------------------------------------------
# Configuration: map path prefixes to their deprecation metadata.
# Add entries here as endpoints are deprecated.
# ---------------------------------------------------------------------------
DEPRECATED_ENDPOINTS: dict[str, dict[str, str]] = {
    # Example (uncomment when needed):
    # "/api/v1/legacy-reports": {
    #     "sunset": "2026-06-01",
    #     "message": "Use /api/v1/reports instead.",
    # },
}


class DeprecationHeadersMiddleware:
    """ASGI middleware that injects Deprecation and Sunset response headers."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        matched_entry: dict[str, str] | None = None

        for prefix, entry in DEPRECATED_ENDPOINTS.items():
            if path.startswith(prefix):
                matched_entry = entry
                break

        if matched_entry is None:
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: dict) -> None:  # type: ignore[override]
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.append("Deprecation", "true")
                if "sunset" in matched_entry:  # type: ignore[operator]
                    headers.append("Sunset", matched_entry["sunset"])  # type: ignore[index]
                if "message" in matched_entry:  # type: ignore[operator]
                    headers.append("X-Deprecation-Notice", matched_entry["message"])  # type: ignore[index]
            await send(message)

        await self.app(scope, receive, send_with_headers)
