"""
Rate limiting for authentication endpoints.

Uses slowapi (backed by limits) to prevent brute-force login attacks.
Default: 5 attempts per minute per IP address on login endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

# Key function: rate-limit by client IP
limiter = Limiter(key_func=get_remote_address)

# Login-specific rate limit string (e.g. "5/minute")
LOGIN_RATE = settings.login_rate_limit
