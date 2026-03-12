from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.common import CamelModel


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    org_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserInfo(CamelModel):
    id: UUID
    email: str
    name: str
    role: str
    org_id: UUID


class AuthResponse(CamelModel):
    access_token: str
    user: UserInfo
