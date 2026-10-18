from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ProfileBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(ProfileBase):
    user_id: str
    model_config = ConfigDict(from_attributes=True)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters required")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class GoogleAuthRequest(BaseModel):
    code: Optional[str] = Field(None, description="Authorization code from Google OAuth redirect")
    id_token: Optional[str] = Field(None, description="Direct Google ID token from One Tap or Google Sign-In")
    redirect_uri: Optional[str] = Field(None, description="Redirect URI that received the auth code")
    state: Optional[str] = Field(None, description="Anti-CSRF state token")


class GoogleAuthUrlResponse(BaseModel):
    url: str
    state: str



class UserResponse(BaseModel):
    id: str
    email: EmailStr
    is_active: bool
    is_verified: bool
    roles: List[str] = []
    profile: Optional[ProfileResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
