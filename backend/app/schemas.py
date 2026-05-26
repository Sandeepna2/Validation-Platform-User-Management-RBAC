from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    role_id: int


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    role_id: int | None = None
    role_name: str | None = None
    created_at: datetime


class UserRoleUpdate(BaseModel):
    role_id: int


class UserActivePatch(BaseModel):
    is_active: bool


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    description: str | None


class RoleDetailOut(RoleOut):
    permissions: list[PermissionOut]


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    vehicle_platform: str = Field(min_length=1, max_length=128)
    odd_type: str = Field(min_length=1, max_length=128)
    status: str = Field(default="draft", max_length=64)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    vehicle_platform: str | None = Field(default=None, min_length=1, max_length=128)
    odd_type: str | None = Field(default=None, min_length=1, max_length=128)
    status: str | None = Field(default=None, max_length=64)
    review_status: str | None = Field(default=None, max_length=64)


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_status: str
    created_by_id: int
    created_at: datetime
    updated_at: datetime


class MeOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    permissions: list[str]
    role_name: str | None
