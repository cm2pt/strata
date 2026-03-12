"""Authentication routes — register, login, demo-login, refresh, logout, and /me."""

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt
from passlib.context import CryptContext

from app.config import settings
from app.database import get_db
from app.models.user import User, UserOrgRole, UserRole
from app.models.org import Organization
from app.auth.dependencies import AuthUser, get_current_user
from app.auth.rbac import ROLE_DEFINITIONS, get_role, get_ui_roles
from app.auth.rate_limit import limiter, LOGIN_RATE
from app.services.audit_service import log_action

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)
    org_name: str | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DemoLoginRequest(BaseModel):
    """Body for demo persona login — just a role_id."""
    role: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class RoleMetadata(BaseModel):
    role_id: str
    display_name: str
    description: str
    default_focus_route: str
    nav_priority: list[str]
    permissions: list[str]

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    title: str | None = None
    role: str
    org_id: uuid.UUID | None = None
    role_meta: RoleMetadata | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class RefreshRequest(BaseModel):
    refresh_token: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    user: UserResponse

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class DemoPersona(BaseModel):
    role_id: str
    display_name: str
    description: str
    default_focus_route: str
    email: str | None = None
    name: str | None = None

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_access_token(user_id: uuid.UUID, org_id: uuid.UUID | None, role: str | None = None) -> str:
    """Short-lived access token (default 15 minutes)."""
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id) if org_id else None,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_minutes),
    }
    if role:
        payload["role"] = role
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _create_refresh_token() -> tuple[str, str]:
    """
    Create a cryptographically random refresh token.
    Returns (raw_token, hashed_token) — store the hash, return the raw.
    """
    raw = secrets.token_urlsafe(48)
    hashed = pwd_context.hash(raw)
    return raw, hashed


async def _store_refresh_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    org_id: uuid.UUID | None,
    role: str,
    token_hash: str,
    ip_address: str | None = None,
) -> uuid.UUID:
    """Persist a refresh token and return its ID."""
    from app.models.refresh_token import RefreshToken

    # Enforce max 5 active refresh tokens per user (revoke oldest)
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .order_by(RefreshToken.created_at.asc())
    )
    active_tokens = result.scalars().all()
    if len(active_tokens) >= 5:
        # Revoke oldest tokens beyond the limit
        for old_token in active_tokens[: len(active_tokens) - 4]:
            old_token.revoked_at = datetime.now(timezone.utc)

    rt = RefreshToken(
        user_id=user_id,
        org_id=org_id,
        role=role,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_days),
        ip_address=ip_address,
    )
    db.add(rt)
    await db.flush()
    return rt.id


def _set_csrf_cookie(response: Response) -> str:
    """Generate a CSRF token and set it as a cookie on the response.

    The cookie is NOT HttpOnly so the frontend can read it and send
    it back as the X-CSRF-Token header (double-submit cookie pattern).
    """
    csrf_token = secrets.token_hex(32)
    is_production = os.environ.get("NODE_ENV") == "production" or not settings.demo_mode
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # frontend needs to read this
        samesite="strict",
        secure=is_production,
        path="/",
        max_age=86400,  # 24 hours
    )
    return csrf_token


def _build_role_meta(role_name: str) -> RoleMetadata | None:
    rd = get_role(role_name)
    if rd is None:
        return None
    return RoleMetadata(
        role_id=rd.role_id,
        display_name=rd.display_name,
        description=rd.description,
        default_focus_route=rd.default_focus_route,
        nav_priority=list(rd.nav_priority),
        permissions=sorted(rd.permissions),
    )


def _build_user_response(
    user: User,
    role_name: str,
    org_id: uuid.UUID | None,
) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        title=user.title,
        role=role_name,
        org_id=org_id,
        role_meta=_build_role_meta(role_name),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(LOGIN_RATE)
async def register(body: RegisterRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Create org if name supplied
    org: Organization | None = None
    if body.org_name:
        slug = body.org_name.lower().replace(" ", "-")
        org = Organization(name=body.org_name, slug=slug)
        db.add(org)
        await db.flush()

    # Create user
    user = User(
        email=body.email,
        password_hash=pwd_context.hash(body.password),
        name=body.name,
    )
    db.add(user)
    await db.flush()

    # Assign role
    org_id: uuid.UUID | None = None
    role_name = "consumer"
    if org:
        org_id = org.id
        role_name = "admin"
        role_entry = UserOrgRole(user_id=user.id, org_id=org.id, role=UserRole.admin)
        db.add(role_entry)

    # Create tokens
    access_token = _create_access_token(user.id, org_id, role_name)
    raw_refresh, hashed_refresh = _create_refresh_token()
    ip = request.client.host if request.client else None
    await _store_refresh_token(db, user.id, org_id, role_name, hashed_refresh, ip)

    await db.commit()
    await db.refresh(user)

    _set_csrf_cookie(response)

    return AuthResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=_build_user_response(user, role_name, org_id),
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit(LOGIN_RATE)
async def login(body: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # Fetch first org role for token
    roles_result = await db.execute(
        select(UserOrgRole).where(UserOrgRole.user_id == user.id)
    )
    first_role = roles_result.scalars().first()
    org_id = first_role.org_id if first_role else None
    role_name = first_role.role.value if first_role else "consumer"

    ip = request.client.host if request.client else None

    # Audit log
    if org_id:
        await log_action(
            db, org_id=org_id, user_id=user.id, action="login",
            metadata={"method": "password"},
            ip_address=ip,
        )

    # Create tokens
    access_token = _create_access_token(user.id, org_id, role_name)
    raw_refresh, hashed_refresh = _create_refresh_token()
    await _store_refresh_token(db, user.id, org_id, role_name, hashed_refresh, ip)
    await db.commit()

    _set_csrf_cookie(response)

    return AuthResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=_build_user_response(user, role_name, org_id),
    )


@router.post("/demo-login", response_model=AuthResponse)
@limiter.limit(LOGIN_RATE)
async def demo_login(body: DemoLoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    One-click login as a demo persona. Only available when DEMO_MODE=true.
    Accepts a role_id and logs in as the demo user with that role.
    """
    if not settings.demo_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo login is disabled in production mode",
        )

    # Validate role exists and is a UI role
    role_def = get_role(body.role)
    if role_def is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown role: {body.role}")

    # Find user with this role
    result = await db.execute(
        select(UserOrgRole)
        .where(UserOrgRole.role == UserRole(body.role))
        .limit(1)
    )
    org_role = result.scalar_one_or_none()
    if org_role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No demo user for role: {body.role}",
        )

    # Load user
    user_result = await db.execute(select(User).where(User.id == org_role.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo user not found")

    ip = request.client.host if request.client else None

    # Audit log
    await log_action(
        db, org_id=org_role.org_id, user_id=user.id, action="demo_login",
        metadata={"role": body.role},
        ip_address=ip,
    )

    # Create tokens
    access_token = _create_access_token(user.id, org_role.org_id, body.role)
    raw_refresh, hashed_refresh = _create_refresh_token()
    await _store_refresh_token(db, user.id, org_role.org_id, body.role, hashed_refresh, ip)
    await db.commit()

    _set_csrf_cookie(response)

    return AuthResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=_build_user_response(user, body.role, org_role.org_id),
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access + refresh token pair.
    The old refresh token is revoked (rotation).
    """
    from app.models.refresh_token import RefreshToken

    # Find all non-revoked, non-expired refresh tokens for matching
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
    )
    tokens = result.scalars().all()

    # Verify the raw token against stored hashes
    matched_token: RefreshToken | None = None
    for rt in tokens:
        if pwd_context.verify(body.refresh_token, rt.token_hash):
            matched_token = rt
            break

    if matched_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Revoke the used token (rotation)
    matched_token.revoked_at = now

    # Load user to confirm still active
    user_result = await db.execute(select(User).where(User.id == matched_token.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Issue new token pair
    ip = request.client.host if request.client else None
    access_token = _create_access_token(user.id, matched_token.org_id, matched_token.role)
    raw_refresh, hashed_refresh = _create_refresh_token()
    await _store_refresh_token(db, user.id, matched_token.org_id, matched_token.role, hashed_refresh, ip)
    await db.commit()

    # Build user response
    role_name = matched_token.role

    _set_csrf_cookie(response)

    return AuthResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=_build_user_response(user, role_name, matched_token.org_id),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all refresh tokens for the current user."""
    from app.models.refresh_token import RefreshToken

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    for rt in result.scalars().all():
        rt.revoked_at = now

    await db.commit()
    return None


@router.get("/me", response_model=UserResponse)
async def get_me(user: AuthUser = Depends(get_current_user)):
    """Return the authenticated user's profile + role metadata."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        title=user.title,
        role=user.role,
        org_id=user.org_id,
        role_meta=_build_role_meta(user.role),
    )


@router.get("/demo-personas", response_model=list[DemoPersona])
async def list_demo_personas(db: AsyncSession = Depends(get_db)):
    """
    Return the list of available demo personas.
    Only available when DEMO_MODE=true.
    Frontend uses this to render the persona selector.
    """
    if not settings.demo_mode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    # Build persona list with user info
    personas: list[DemoPersona] = []
    for rd in get_ui_roles():
        # Look up the demo user for this role
        result = await db.execute(
            select(UserOrgRole)
            .where(UserOrgRole.role == UserRole(rd.role_id))
            .limit(1)
        )
        org_role = result.scalar_one_or_none()
        email = None
        name = None
        if org_role:
            user_result = await db.execute(select(User).where(User.id == org_role.user_id))
            u = user_result.scalar_one_or_none()
            if u:
                email = u.email
                name = u.name

        personas.append(DemoPersona(
            role_id=rd.role_id,
            display_name=rd.display_name,
            description=rd.description,
            default_focus_route=rd.default_focus_route,
            email=email,
            name=name,
        ))

    return personas
