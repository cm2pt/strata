"""
Rate limiting for authentication endpoints.

Uses slowapi (backed by limits) to prevent brute-force login attacks.
Default: 5 attempts per minute per IP address on login endpoints.

In serverless mode, in-memory rate limiting is ineffective (no shared state
across invocations), so the limit is raised to be effectively permissive.
"""

import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

logger = logging.getLogger("strata.api")

# Key function: rate-limit by client IP
limiter = Limiter(key_func=get_remote_address)

# Login-specific rate limit string (e.g. "5/minute")
if settings.serverless:
    LOGIN_RATE = "1000/minute"
    logger.info(
        "Serverless mode: in-memory rate limiting is permissive (no shared state)"
    )
else:
    LOGIN_RATE = settings.login_rate_limit
