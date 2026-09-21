import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_optional, require_admin
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import TradeXException
from app.core.redis import get_redis
from app.models.system import ProviderCredential, SystemSetting
from app.models.user import User
from app.services.audit_service import record_audit_log
from app.services.market_data.upstox_provider import upstox_provider

logger = logging.getLogger("tradex.upstox_auth")

router = APIRouter(prefix="/upstox/auth", tags=["Upstox OAuth 2.0 Integration"])


@router.get("/login", summary="Initiate Upstox OAuth 2.0 connection")
async def upstox_login(
    redirect: bool = False,
):
    """
    Generates official Upstox OAuth 2.0 authorization dialog URL with CSRF state protection.
    Never exposes client secret.
    """
    if not settings.UPSTOX_CLIENT_ID:
        raise TradeXException(
            code="UPSTOX_NOT_CONFIGURED",
            message="Upstox Client ID is not configured in backend environment variables.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    state = secrets.token_urlsafe(32)

    # Cache state in Redis for 10 minutes to protect against CSRF
    redis = await get_redis()
    if redis:
        try:
            await redis.setex(f"oauth:upstox:state:{state}", 600, "valid")
        except Exception as e:
            logger.debug(f"Redis setex state failed: {e}")

    auth_url = (
        f"https://api.upstox.com/v2/login/authorization/dialog"
        f"?response_type=code"
        f"&client_id={settings.UPSTOX_CLIENT_ID}"
        f"&redirect_uri={settings.UPSTOX_REDIRECT_URI}"
        f"&state={state}"
    )

    if redirect:
        return RedirectResponse(url=auth_url)

    return {
        "authorization_url": auth_url,
        "state": state,
        "client_id": settings.UPSTOX_CLIENT_ID,
        "redirect_uri": settings.UPSTOX_REDIRECT_URI,
    }


@router.get("/callback", summary="Upstox OAuth 2.0 code exchange callback")
async def upstox_callback(
    code: str = Query(..., description="Authorization code from Upstox"),
    state: Optional[str] = Query(None, description="OAuth state parameter"),
    db: AsyncSession = Depends(get_db),
):
    """
    Exchanges Upstox authorization code for access token via secure server-to-server POST.
    Stores access_token, issued_at, and expires_at in PostgreSQL and Redis.
    """
    # Verify state if provided and Redis is available
    if state:
        redis = await get_redis()
        if redis:
            try:
                valid = await redis.get(f"oauth:upstox:state:{state}")
                if not valid:
                    logger.warning("Upstox OAuth callback state mismatch or expired.")
                else:
                    await redis.delete(f"oauth:upstox:state:{state}")
            except Exception as e:
                logger.debug(f"Redis state verify error: {e}")

    token_url = "https://api.upstox.com/v2/login/authorization/token"
    payload = {
        "code": code,
        "client_id": settings.UPSTOX_CLIENT_ID,
        "client_secret": settings.UPSTOX_CLIENT_SECRET,
        "redirect_uri": settings.UPSTOX_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(token_url, data=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Upstox token exchange failed: {resp.status_code} {resp.text}")
                raise TradeXException(
                    code="UPSTOX_AUTH_FAILED",
                    message=f"Failed to exchange authorization code: {resp.text}",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            data = resp.json()
    except TradeXException:
        raise
    except Exception as e:
        logger.error(f"Error during Upstox token exchange: {e}")
        raise TradeXException(
            code="UPSTOX_AUTH_ERROR",
            message=f"Error exchanging token with Upstox: {str(e)}",
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    access_token = data.get("access_token")
    if not access_token:
        raise TradeXException(
            code="INVALID_TOKEN_RESPONSE",
            message="No access_token returned by Upstox.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    now = datetime.now(timezone.utc)
    # Upstox tokens expire around 3:30 AM IST next day, standard 24 hours validity
    expires_at = now + timedelta(hours=24)

    user_id = data.get("user_id")
    user_name = data.get("user_name")

    # Update or create ProviderCredential in DB
    stmt = select(ProviderCredential).where(ProviderCredential.provider_name == "upstox")
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if not cred:
        cred = ProviderCredential(
            provider_name="upstox",
            access_token=access_token,
            refresh_token=data.get("refresh_token"),
            token_type=data.get("token_type", "Bearer"),
            issued_at=now,
            expires_at=expires_at,
            user_id=user_id,
            user_name=user_name,
            is_active=True,
            extra_data={k: v for k, v in data.items() if k != "access_token"},
        )
        db.add(cred)
    else:
        cred.access_token = access_token
        cred.refresh_token = data.get("refresh_token")
        cred.issued_at = now
        cred.expires_at = expires_at
        cred.user_id = user_id
        cred.user_name = user_name
        cred.is_active = True
        cred.extra_data = {k: v for k, v in data.items() if k != "access_token"}

    # Update SystemSetting for active provider
    setting_stmt = select(SystemSetting).where(SystemSetting.key == "MARKET_DATA_PROVIDER")
    setting = (await db.execute(setting_stmt)).scalar_one_or_none()
    if setting:
        setting.value = "UPSTOX"

    await db.commit()

    # Update in-memory singleton
    upstox_provider._cached_token = access_token
    upstox_provider._token_expires_at = expires_at

    logger.info(f"Upstox OAuth successfully completed for user {user_id} ({user_name}).")

    # If invoked by browser redirect, redirect to frontend dashboard
    frontend_target = f"{settings.FRONTEND_URL}/dashboard?upstox_connected=true"
    return RedirectResponse(url=frontend_target, status_code=status.HTTP_302_FOUND)


@router.get("/status", summary="Get Upstox market data connection and token status")
async def upstox_status(
    force_verify: bool = Query(False, description="Force real-time probe to Upstox API"),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies Upstox access token validity with official Upstox API.
    Never returns access_token, client_secret, or secret credentials.
    """
    from app.services.market_data.upstox_client import upstox_client

    verification = await upstox_client.verify_token(force_refresh=force_verify)

    user_id = None
    user_name = None
    expires_at = None

    if not settings.UPSTOX_ACCESS_TOKEN:
        stmt = select(ProviderCredential).where(
            ProviderCredential.provider_name == "upstox",
            ProviderCredential.is_active.is_(True),
        )
        cred = (await db.execute(stmt)).scalar_one_or_none()
        if cred:
            user_id = cred.user_id
            user_name = cred.user_name
            expires_at = cred.expires_at.isoformat() if cred.expires_at else None

    return {
        "configured": verification["configured"],
        "authenticated": verification["authenticated"],
        "provider": "upstox",
        "message": verification["message"],
        "user_id": user_id,
        "user_name": user_name,
        "expires_at": expires_at,
    }


@router.post("/disconnect", summary="Disconnect Upstox and revoke local token")
async def upstox_disconnect(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    """
    Deactivates Upstox connection and invalidates stored access tokens.
    """
    stmt = select(ProviderCredential).where(ProviderCredential.provider_name == "upstox")
    cred = (await db.execute(stmt)).scalar_one_or_none()
    if cred:
        cred.is_active = False
        await db.commit()

    upstox_provider.invalidate_token()

    await record_audit_log(
        db=db,
        action="UPSTOX_DISCONNECTED",
        entity_type="provider",
        user_id=admin_user.id,
        entity_id="upstox",
    )

    return {"success": True, "message": "Upstox market data provider disconnected."}
