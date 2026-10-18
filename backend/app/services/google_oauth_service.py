import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ResourceConflictError
from app.core.security import get_password_hash
from app.models.user import Profile, Role, User, UserRole
from app.models.watchlist import Watchlist
from app.services.audit_service import record_audit_log
from app.services.auth_service import get_or_create_role, get_user_by_id
from app.services.wallet_service import create_user_wallet

logger = logging.getLogger("bullrun.google_oauth")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def get_google_auth_url(
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Generate Google OAuth 2.0 authorization URL with anti-CSRF state token.
    Uses standard OpenID Connect scopes (openid, email, profile).
    """
    if not state:
        state = secrets.token_urlsafe(32)

    resolved_redirect_uri = (
        redirect_uri
        or settings.GOOGLE_REDIRECT_URI
        or f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback/google"
    )

    client_id = settings.GOOGLE_CLIENT_ID or "bullrun-google-client-id-placeholder"

    params = {
        "client_id": client_id,
        "redirect_uri": resolved_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": state,
        "prompt": "select_account",
    }

    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return url, state


async def exchange_google_code(
    code: str,
    redirect_uri: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Exchange authorization code for Google ID token and access token.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise AuthenticationError(
            message="Google OAuth is not configured on the server. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET."
        )

    resolved_redirect_uri = (
        redirect_uri
        or settings.GOOGLE_REDIRECT_URI
        or f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback/google"
    )

    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": resolved_redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data=data)
            if resp.status_code != 200:
                logger.warning(f"Google token exchange failed ({resp.status_code}): {resp.text}")
                err_detail = resp.text
                try:
                    err_detail = resp.json().get("error_description", resp.text)
                except Exception:
                    pass
                raise AuthenticationError(
                    message=f"Google token exchange failed: {err_detail}"
                )
            return resp.json()
    except httpx.RequestError as exc:
        logger.error(f"Network error during Google token exchange: {exc}")
        raise AuthenticationError(message=f"Failed to communicate with Google authentication server: {str(exc)}")


async def verify_google_identity(
    id_token: Optional[str] = None,
    access_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Verify identity with Google's verified endpoints.
    Ensures email_verified is true and validates token audience when configured.
    """
    if not id_token and not access_token:
        raise AuthenticationError(message="Either id_token or access_token must be provided for Google authentication.")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if id_token:
                # Validate id_token with Google tokeninfo endpoint
                resp = await client.get(f"{GOOGLE_TOKENINFO_URL}?id_token={id_token}")
                if resp.status_code != 200:
                    raise AuthenticationError(message="Invalid or expired Google ID token.")
                claims = resp.json()

                # Verify audience if client ID is configured
                if settings.GOOGLE_CLIENT_ID and claims.get("aud") != settings.GOOGLE_CLIENT_ID:
                    logger.warning(f"Token audience mismatch: got {claims.get('aud')}, expected {settings.GOOGLE_CLIENT_ID}")
                    raise AuthenticationError(message="Google token audience verification failed.")
            else:
                # Fetch userinfo with access_token
                resp = await client.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if resp.status_code != 200:
                    raise AuthenticationError(message="Invalid Google access token.")
                claims = resp.json()

            # Enforce verified email requirement to prevent account takeover
            email_verified = claims.get("email_verified")
            if email_verified not in (True, "true", "True", 1):
                raise AuthenticationError(message="Google account email address is not verified by Google.")

            email = claims.get("email")
            sub = claims.get("sub")
            if not email or not sub:
                raise AuthenticationError(message="Google token missing essential email or subject claims.")

            return {
                "sub": str(sub),
                "email": str(email).strip().lower(),
                "first_name": claims.get("given_name") or (claims.get("name", "").split(" ")[0] if claims.get("name") else None),
                "last_name": claims.get("family_name") or (" ".join(claims.get("name", "").split(" ")[1:]) if claims.get("name") and len(claims.get("name").split(" ")) > 1 else None),
                "avatar_url": claims.get("picture"),
                "email_verified": True,
            }
    except AuthenticationError:
        raise
    except httpx.RequestError as exc:
        logger.error(f"Network error verifying Google identity: {exc}")
        raise AuthenticationError(message="Failed to connect to Google identity verification service.")
    except Exception as exc:
        logger.error(f"Unexpected error verifying Google identity: {exc}")
        raise AuthenticationError(message=f"Google identity verification failed: {str(exc)}")


async def authenticate_or_register_google_user(
    db: AsyncSession,
    google_info: Dict[str, Any],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> User:
    """
    Authenticate an existing BullRun user or safely register a new user via verified Google identity.
    Enforces safe account linking policy and assigns initial ₹1,00,000 paper trading balance.
    """
    email = google_info["email"].strip().lower()
    google_sub = google_info["sub"]

    # 1. Check if user already exists by normalized email
    stmt = (
        select(User)
        .where(func.lower(User.email) == email)
        .options(selectinload(User.roles), selectinload(User.profile))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # Existing account: verify account status
        if not user.is_active:
            await record_audit_log(
                db=db,
                action="LOGIN_REJECTED_DEACTIVATED",
                entity_type="user",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await db.commit()
            raise AuthenticationError(message="Account has been suspended or deactivated. Contact support.")

        # Safe Account Linking Policy:
        # Verify that if a Google ID was already linked, it matches this Google account
        current_prefs = dict(user.profile.preferences or {}) if user.profile else {}
        existing_google_id = current_prefs.get("google_id")

        if existing_google_id and str(existing_google_id) != str(google_sub):
            raise ResourceConflictError(
                message="This BullRun account is already linked to a different Google account."
            )

        # Link Google account if not linked yet
        if not existing_google_id:
            current_prefs["google_id"] = str(google_sub)
            current_prefs["auth_provider"] = "google"
            current_prefs["google_linked_at"] = datetime.now(timezone.utc).isoformat()
            if user.profile:
                user.profile.preferences = current_prefs
                if not user.profile.avatar_url and google_info.get("avatar_url"):
                    user.profile.avatar_url = google_info["avatar_url"]

            user.is_verified = True  # Google verified the email
            await record_audit_log(
                db=db,
                action="AUTH_GOOGLE_LINKED",
                entity_type="user",
                user_id=user.id,
                entity_id=user.id,
                new_values={"email": email, "google_id": google_sub},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        else:
            await record_audit_log(
                db=db,
                action="AUTH_GOOGLE_LOGIN",
                entity_type="user",
                user_id=user.id,
                entity_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        await db.commit()
        return await get_user_by_id(db, user.id)

    # 2. User does not exist: Provision new user with safe random unusable password hash
    try:
        random_password_secret = secrets.token_urlsafe(32)
        hashed_pwd = get_password_hash(random_password_secret)

        new_user = User(
            email=email,
            hashed_password=hashed_pwd,
            is_active=True,
            is_verified=True,  # Google verified email
        )
        db.add(new_user)
        await db.flush()

        # Create Profile
        new_profile = Profile(
            user_id=new_user.id,
            first_name=google_info.get("first_name"),
            last_name=google_info.get("last_name"),
            avatar_url=google_info.get("avatar_url"),
            preferences={
                "auth_provider": "google",
                "google_id": str(google_sub),
                "google_registered_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(new_profile)

        # Assign TRADER role
        role = await get_or_create_role(db, "TRADER", "System TRADER role")
        user_role = UserRole(user_id=new_user.id, role_id=role.id)
        db.add(user_role)
        await db.flush()

        # Initialize paper trading wallet with ₹1,00,000 virtual balance
        await create_user_wallet(db, new_user.id)

        # Create default watchlist
        default_watchlist = Watchlist(
            user_id=new_user.id,
            name="My Watchlist",
            is_default=True,
        )
        db.add(default_watchlist)

        # Audit log
        await record_audit_log(
            db=db,
            action="USER_REGISTRATION_GOOGLE",
            entity_type="user",
            user_id=new_user.id,
            entity_id=new_user.id,
            new_values={"email": email, "google_id": google_sub, "role": "TRADER"},
            ip_address=ip_address,
            user_agent=user_agent,
        )

        await db.commit()
        return await get_user_by_id(db, new_user.id)
    except Exception:
        await db.rollback()
        raise
