import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserOrgRole
from app.auth.rbac import has_permission as _rbac_has_permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_org_id(
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> uuid.UUID:
    """Extract org_id from JWT without loading user. Faster for read-only checks."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        org_id = payload.get("org_id")
        if org_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No org in token")
        return uuid.UUID(org_id)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_role(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> str:
    """Resolve the user's role for the current org context."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        # Prefer role from token (set at login time)
        if payload.get("role"):
            return payload["role"]
        # Fallback: look up from DB
        user_id = payload.get("sub")
        org_id = payload.get("org_id")
        if user_id and org_id:
            result = await db.execute(
                select(UserOrgRole).where(
                    UserOrgRole.user_id == uuid.UUID(user_id),
                    UserOrgRole.org_id == uuid.UUID(org_id),
                )
            )
            org_role = result.scalars().first()
            if org_role:
                return org_role.role.value
        return "consumer"
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def require_role(*roles: str):
    """Dependency factory: check that the current user has one of the required roles in the org."""
    async def checker(
        user: Annotated[User, Depends(get_current_user)],
        org_id: Annotated[uuid.UUID, Depends(get_current_org_id)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> User:
        result = await db.execute(
            select(UserOrgRole).where(
                UserOrgRole.user_id == user.id,
                UserOrgRole.org_id == org_id,
            )
        )
        user_roles = result.scalars().all()
        if not any(r.role.value in roles for r in user_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return checker


def require_permission(permission: str):
    """
    Dependency factory: enforce a permission using the RBAC registry.

    Usage:
        @router.post("/promote")
        async def promote(user = Depends(require_permission("candidates:promote"))):
            ...
    """
    async def checker(
        user: Annotated[User, Depends(get_current_user)],
        role: Annotated[str, Depends(get_current_role)],
    ) -> User:
        if not _rbac_has_permission(role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}",
            )
        return user
    return checker
