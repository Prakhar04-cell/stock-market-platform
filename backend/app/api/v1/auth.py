from datetime import timedelta
from typing import Any, Optional
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.exceptions import AuthenticationError, ResourceNotFoundError
from app.core.limiter import auth_rate_limiter, login_rate_limiter
from app.core.security import create_access_token, create_refresh_token, decode_token, get_password_hash
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    GoogleAuthUrlResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.audit_service import record_audit_log
from app.services.auth_service import authenticate_user, register_user
from app.services.google_oauth_service import (
    authenticate_or_register_google_user,
    exchange_google_code,
    get_google_auth_url,
    verify_google_identity,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=[r.name for r in user.roles],
        profile=user.profile,
        created_at=user.created_at,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED, summary="Register new user")
async def register(
    request: Request,
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db),
    _limiter: None = Depends(auth_rate_limiter),
):
    """Register a new user, allocate initial paper trading balance, and return JWT tokens."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    user = await register_user(
        db=db,
        user_in=user_in,
        role_name="TRADER",
        ip_address=client_ip,
        user_agent=user_agent,
    )

    primary_role = user.roles[0].name if user.roles else "TRADER"
    access_token = create_access_token(subject=user.id, role=primary_role)
    refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_build_user_response(user),
    )


@router.post("/login", response_model=Token, summary="User login with email and password")
async def login(
    request: Request,
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
    _limiter: None = Depends(login_rate_limiter),
):
    """Authenticate user with email/password and issue JWT access and refresh tokens."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    user = await authenticate_user(
        db=db,
        email=credentials.email,
        password=credentials.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    primary_role = user.roles[0].name if user.roles else "TRADER"
    access_token = create_access_token(subject=user.id, role=primary_role)
    refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_build_user_response(user),
    )


@router.post("/refresh", response_model=Token, summary="Refresh access token")
async def refresh_token(
    payload_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a new access token using a valid refresh token."""
    payload = decode_token(payload_in.refresh_token)
    if payload.get("type") != "refresh":
        raise AuthenticationError(message="Invalid token type. Refresh token required.")

    user_id = payload.get("sub")
    from app.services.auth_service import get_user_by_id
    user = await get_user_by_id(db, user_id)

    if not user.is_active:
        raise AuthenticationError(message="User account is deactivated.")

    primary_role = user.roles[0].name if user.roles else "TRADER"
    new_access_token = create_access_token(subject=user.id, role=primary_role)
    new_refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_build_user_response(user),
    )


@router.get("/me", response_model=UserResponse, summary="Get current authenticated user")
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return _build_user_response(current_user)


@router.post("/logout", summary="Logout current session")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record logout audit event."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    await record_audit_log(
        db=db,
        action="USER_LOGOUT",
        entity_type="user",
        user_id=current_user.id,
        entity_id=current_user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    await db.commit()
    return {"success": True, "message": "Logged out successfully"}


@router.post("/forgot-password", summary="Initiate password recovery")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _limiter: None = Depends(auth_rate_limiter),
):
    """Initiate password recovery. Generates secure reset token."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    # Audit the attempt
    await record_audit_log(
        db=db,
        action="PASSWORD_RESET_REQUESTED",
        entity_type="user",
        new_values={"email": payload.email},
        ip_address=client_ip,
        user_agent=user_agent,
    )
    await db.commit()

    # Note: In production an email is sent; for foundation return a simulated token
    reset_token = create_access_token(
        subject=payload.email,
        role="PASSWORD_RESET",
        expires_delta=timedelta(minutes=15),
        extra_claims={"purpose": "password_reset"},
    )
    return {
        "success": True,
        "message": "Password reset instructions sent to email (or token generated for verification).",
        "reset_token": reset_token, # returned in development for testing
    }


@router.post("/reset-password", summary="Reset password using recovery token")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _limiter: None = Depends(auth_rate_limiter),
):
    """Reset user password using token."""
    claims = decode_token(payload.token)
    if claims.get("purpose") != "password_reset":
        raise AuthenticationError(message="Invalid token for password reset.")

    email = str(claims.get("sub", "")).strip().lower()
    stmt = select(User).where(func.lower(User.email) == email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise ResourceNotFoundError(resource="User", identifier=email)

    user.hashed_password = get_password_hash(payload.new_password)
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    await record_audit_log(
        db=db,
        action="PASSWORD_RESET_COMPLETED",
        entity_type="user",
        user_id=user.id,
        entity_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    await db.commit()
    return {"success": True, "message": "Password has been successfully updated."}


@router.get("/google/url", response_model=GoogleAuthUrlResponse, summary="Get Google OAuth authorization URL")
async def google_auth_url(
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None,
):
    """
    Generate and return a Google OAuth 2.0 authorization URL with anti-CSRF state token.
    Uses standard scopes (openid, email, profile).
    """
    url, generated_state = get_google_auth_url(redirect_uri=redirect_uri, state=state)
    return GoogleAuthUrlResponse(url=url, state=generated_state)


@router.post("/google", response_model=Token, summary="Authenticate via Google OAuth")
async def google_auth(
    request: Request,
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
    _limiter: None = Depends(login_rate_limiter),
):
    """
    Authenticate user via Google OAuth 2.0.
    Accepts either an authorization code (exchanged securely on backend) or a direct verified Google ID token.
    Creates new BullRun user with ₹1,00,000 paper trading wallet or safely links to existing account.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    if payload.code:
        token_data = await exchange_google_code(code=payload.code, redirect_uri=payload.redirect_uri)
        google_user_info = await verify_google_identity(
            id_token=token_data.get("id_token"),
            access_token=token_data.get("access_token"),
        )
    elif payload.id_token:
        google_user_info = await verify_google_identity(id_token=payload.id_token)
    else:
        raise AuthenticationError(message="Either authorization code or Google ID token is required.")

    user = await authenticate_or_register_google_user(
        db=db,
        google_info=google_user_info,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    primary_role = user.roles[0].name if user.roles else "TRADER"
    access_token = create_access_token(subject=user.id, role=primary_role)
    refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_build_user_response(user),
    )


@router.get("/google/callback", summary="Direct browser callback handler for Google OAuth")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    Handles Google redirect when Google directly calls the backend URL.
    Redirects user to the frontend callback handler.
    """
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    if error:
        return RedirectResponse(url=f"{frontend_base}/login?oauth_error={error}")
    if not code:
        return RedirectResponse(url=f"{frontend_base}/login?oauth_error=missing_code")

    params = {"code": code}
    if state:
        params["state"] = state
    return RedirectResponse(url=f"{frontend_base}/auth/callback/google?{urlencode(params)}")

