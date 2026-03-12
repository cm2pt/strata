from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.org import Organization
from app.models.user import User, UserOrgRole, UserRole
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserInfo


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: UUID, org_id: UUID, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def register(db: AsyncSession, request: RegisterRequest) -> AuthResponse:
    # Check for existing user
    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise ValueError("User with this email already exists")

    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
    )
    db.add(user)
    await db.flush()

    # Create or find organization
    if request.org_name:
        slug = request.org_name.lower().replace(" ", "-")
        org = Organization(name=request.org_name, slug=slug)
        db.add(org)
        await db.flush()
    else:
        # Find first org or create a default
        result = await db.execute(select(Organization).limit(1))
        org = result.scalar_one_or_none()
        if not org:
            org = Organization(name="Default Organization", slug="default")
            db.add(org)
            await db.flush()

    # Assign admin role
    role = UserOrgRole(user_id=user.id, org_id=org.id, role=UserRole.admin)
    db.add(role)
    await db.commit()

    token = create_access_token(user.id, org.id, UserRole.admin.value)
    return AuthResponse(
        access_token=token,
        user=UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            role=UserRole.admin.value,
            org_id=org.id,
        ),
    )


async def login(db: AsyncSession, request: LoginRequest) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(request.password, user.password_hash):
        raise ValueError("Invalid email or password")

    # Get the first org role for the user
    role_result = await db.execute(
        select(UserOrgRole).where(UserOrgRole.user_id == user.id).limit(1)
    )
    org_role = role_result.scalar_one_or_none()
    if not org_role:
        raise ValueError("User has no organization role")

    token = create_access_token(user.id, org_role.org_id, org_role.role.value)
    return AuthResponse(
        access_token=token,
        user=UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            role=org_role.role.value,
            org_id=org_role.org_id,
        ),
    )
