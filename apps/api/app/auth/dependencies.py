"""
FastAPI dependencies for authentication and authorization.

Usage in route handlers:
    @router.get("/protected")
    async def protected(user = Depends(get_current_user)):
        ...

    @router.post("/admin-only")
    async def admin_only(user = Depends(require_permission("users:write"))):
        ...
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.user import User, UserOrgRole
from app.auth.rbac import get_permissions, has_permission


# ---------------------------------------------------------------------------
# Authenticated user context
# ---------------------------------------------------------------------------

@dataclass
class AuthUser:
    """Lightweight representation of the authenticated user, available in all routes."""

    id: uuid.UUID
    org_id: uuid.UUID | None
    role: str           # enum value, e.g. "cfo", "platform_admin"
    email: str
    name: str
    title: str | None

    def has_perm(self, permission: str) -> bool:
        return has_permission(self.role, permission)


# ---------------------------------------------------------------------------
# JWT bearer scheme
# ---------------------------------------------------------------------------

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> AuthUser:
    """
    Validate the JWT and return an AuthUser.
    Raises 401 if token is missing/invalid/expired.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Load user + org roles in one query
    result = await db.execute(
        select(User)
        .options(selectinload(User.org_roles))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Resolve org context from token or first role
    org_id_str: str | None = payload.get("org_id")
    org_id: uuid.UUID | None = uuid.UUID(org_id_str) if org_id_str else None

    # Find the matching org role
    role_name = "consumer"  # default fallback
    for org_role in user.org_roles:
        if org_id and org_role.org_id == org_id:
            role_name = org_role.role.value
            break
    else:
        # No match — use first available
        if user.org_roles:
            first = user.org_roles[0]
            role_name = first.role.value
            org_id = first.org_id

    return AuthUser(
        id=user.id,
        org_id=org_id,
        role=role_name,
        email=user.email,
        name=user.name,
        title=user.title,
    )


# ---------------------------------------------------------------------------
# Permission dependency factory
# ---------------------------------------------------------------------------

def require_permission(permission: str) -> Callable:
    """
    FastAPI dependency that enforces a specific permission.

    Usage:
        @router.post("/action")
        async def action(user: AuthUser = Depends(require_permission("candidates:promote"))):
            ...
    """

    async def _check(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if not user.has_perm(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )
        return user

    return _check
