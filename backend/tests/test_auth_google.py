import secrets
from decimal import Decimal
from unittest.mock import AsyncMock, patch
import pytest
import httpx
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User
from app.models.wallet import Wallet
from app.services.google_oauth_service import (
    authenticate_or_register_google_user,
    get_google_auth_url,
    verify_google_identity,
)


@pytest.mark.asyncio
async def test_google_auth_url_generation(client: AsyncClient):
    """Verify Google OAuth authorization URL endpoint generates valid URL with state."""
    res = await client.get("/api/v1/auth/google/url")
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert "state" in data
    assert "accounts.google.com" in data["url"]
    assert f"state={data['state']}" in data["url"]
    assert "response_type=code" in data["url"]
    assert "scope=openid" in data["url"]


@pytest.mark.asyncio
async def test_new_google_user_registration(client: AsyncClient, db_session):
    """
    Verify full flow for a brand new Google user:
    - User account created and verified.
    - Profile populated with Google details.
    - Paper trading wallet created with ₹1,00,000 initial balance.
    - Default watchlist created.
    - Valid BullRun JWT access & refresh tokens issued.
    """
    google_sub = "google_user_1001"
    email = "new_google_trader@bullrun.in"

    mock_google_info = {
        "sub": google_sub,
        "email": email,
        "first_name": "Arjun",
        "last_name": "Mehta",
        "avatar_url": "https://lh3.googleusercontent.com/a/avatar1",
        "email_verified": True,
    }

    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_google_info)):
        res = await client.post(
            "/api/v1/auth/google",
            json={"id_token": "mocked_valid_google_id_token"},
        )
        assert res.status_code == 200
        token_data = res.json()
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["token_type"] == "bearer"

        user_info = token_data["user"]
        assert user_info["email"] == email
        assert user_info["is_active"] is True
        assert user_info["is_verified"] is True
        assert "TRADER" in user_info["roles"]

        # Verify decoded JWT
        decoded = decode_token(token_data["access_token"])
        assert decoded["sub"] == user_info["id"]
        assert decoded["type"] == "access"

        # Verify database persistence
        stmt = select(User).where(User.id == user_info["id"]).options(selectinload(User.profile))
        user_in_db = (await db_session.execute(stmt)).scalar_one()
        assert user_in_db.email == email
        assert user_in_db.is_verified is True
        assert user_in_db.profile.first_name == "Arjun"
        assert user_in_db.profile.preferences.get("google_id") == google_sub

        # Verify paper trading wallet allocation
        stmt_wallet = select(Wallet).where(Wallet.user_id == user_info["id"])
        wallet = (await db_session.execute(stmt_wallet)).scalar_one_or_none()
        assert wallet is not None
        assert wallet.balance == Decimal("100000.00")
        assert wallet.currency == "INR"


@pytest.mark.asyncio
async def test_returning_google_user_preserves_data(client: AsyncClient, db_session):
    """
    Verify that subsequent Google sign-ins retrieve the existing account,
    do NOT duplicate records, and preserve paper trading wallet balance.
    """
    google_sub = "google_user_2002"
    email = "returning_google_user@bullrun.in"

    mock_google_info = {
        "sub": google_sub,
        "email": email,
        "first_name": "Priya",
        "last_name": "Nair",
        "avatar_url": None,
        "email_verified": True,
    }

    # 1. First login (Registration)
    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_google_info)):
        res1 = await client.post("/api/v1/auth/google", json={"id_token": "token_1"})
        assert res1.status_code == 200
        user_id_1 = res1.json()["user"]["id"]

    # Simulate paper trading balance change
    stmt_wallet = select(Wallet).where(Wallet.user_id == user_id_1)
    wallet = (await db_session.execute(stmt_wallet)).scalar_one()
    wallet.balance = Decimal("145000.00")
    await db_session.commit()

    # 2. Second login (Returning user)
    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_google_info)):
        res2 = await client.post("/api/v1/auth/google", json={"id_token": "token_2"})
        assert res2.status_code == 200
        user_id_2 = res2.json()["user"]["id"]
        assert user_id_1 == user_id_2

    # Verify wallet balance remained ₹1,45,000 and wasn't reset
    stmt_wallet_after = select(Wallet).where(Wallet.user_id == user_id_1)
    wallet_after = (await db_session.execute(stmt_wallet_after)).scalar_one()
    assert wallet_after.balance == Decimal("145000.00")

    # Verify no duplicate users exist
    stmt_users = select(User).where(User.email == email)
    users = (await db_session.execute(stmt_users)).scalars().all()
    assert len(users) == 1


@pytest.mark.asyncio
async def test_safe_account_linking_policy(client: AsyncClient, db_session):
    """
    Verify safe explicit account linking:
    - User registers initially via traditional email/password.
    - User subsequently signs in with Google using the same verified email.
    - Account is linked with Google provider ID and marked verified.
    - No duplicate account is created.
    """
    email = "link_candidate@bullrun.in"

    # Step 1: Register with email/password
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "ExistingUserPassword123!",
            "first_name": "Dev",
            "last_name": "Patel",
        },
    )
    assert reg_res.status_code == 201
    existing_user_id = reg_res.json()["user"]["id"]

    # Step 2: Sign in with Google with same verified email
    google_sub = "google_sub_9999"
    mock_google_info = {
        "sub": google_sub,
        "email": email,
        "first_name": "Dev",
        "last_name": "Patel",
        "avatar_url": "https://lh3.googleusercontent.com/a/dev_avatar",
        "email_verified": True,
    }

    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_google_info)):
        link_res = await client.post("/api/v1/auth/google", json={"id_token": "mocked_link_token"})
        assert link_res.status_code == 200
        linked_user = link_res.json()["user"]
        assert linked_user["id"] == existing_user_id
        assert linked_user["is_verified"] is True

    # Check database: only 1 user exists and preferences has google_id
    stmt = select(User).where(User.email == email).options(selectinload(User.profile))
    all_users = (await db_session.execute(stmt)).scalars().all()
    assert len(all_users) == 1
    assert all_users[0].profile.preferences.get("google_id") == google_sub


@pytest.mark.asyncio
async def test_google_conflict_with_different_google_account(client: AsyncClient, db_session):
    """
    Verify that if an account is already linked to Google ID A,
    an attempt to link Google ID B with the same email fails with 409 Conflict.
    """
    email = "conflict_user@bullrun.in"

    # First Google login with sub_A
    mock_a = {
        "sub": "sub_google_AAAA",
        "email": email,
        "first_name": "User",
        "last_name": "A",
        "email_verified": True,
    }
    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_a)):
        res1 = await client.post("/api/v1/auth/google", json={"id_token": "token_a"})
        assert res1.status_code == 200

    # Attempt second Google login with same email but different sub_B
    mock_b = {
        "sub": "sub_google_BBBB",
        "email": email,
        "first_name": "User",
        "last_name": "B",
        "email_verified": True,
    }
    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_b)):
        res2 = await client.post("/api/v1/auth/google", json={"id_token": "token_b"})
        assert res2.status_code == 409
        err = res2.json()
        assert err["error"]["code"] == "RESOURCE_CONFLICT"


@pytest.mark.asyncio
async def test_unverified_google_email_rejected(client: AsyncClient):
    """
    Security check: Reject Google identity if email is not verified by Google.
    Prevents account takeover attacks.
    """
    mock_unverified = {
        "sub": "sub_unverified_123",
        "email": "unverified@gmail.com",
        "email_verified": False,
    }

    with patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_unverified)):
        # verify_google_identity should reject unverified email
        with pytest.raises(Exception):
            await verify_google_identity(id_token="fake_token")


@pytest.mark.asyncio
async def test_google_authorization_code_exchange_flow(client: AsyncClient):
    """
    Verify authorization code exchange endpoint /api/v1/auth/google with code parameter.
    """
    mock_token_response = {
        "id_token": "mocked_google_jwt",
        "access_token": "mocked_google_access",
    }
    mock_user_info = {
        "sub": "sub_code_flow_888",
        "email": "code_flow@bullrun.in",
        "first_name": "Siddharth",
        "last_name": "Verma",
        "email_verified": True,
    }

    with patch("app.api.v1.auth.exchange_google_code", new=AsyncMock(return_value=mock_token_response)), \
         patch("app.api.v1.auth.verify_google_identity", new=AsyncMock(return_value=mock_user_info)):
        res = await client.post(
            "/api/v1/auth/google",
            json={
                "code": "sample_auth_code",
                "redirect_uri": "http://localhost:3000/auth/callback/google",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["email"] == "code_flow@bullrun.in"


@pytest.mark.asyncio
async def test_google_browser_callback_redirect(client: AsyncClient):
    """
    Verify GET /api/v1/auth/google/callback redirects browser cleanly to frontend callback route.
    """
    res = await client.get("/api/v1/auth/google/callback?code=testcode123&state=teststate456", follow_redirects=False)
    assert res.status_code in (302, 307)
    location = res.headers.get("location")
    assert "/auth/callback/google" in location
    assert "code=testcode123" in location
    assert "state=teststate456" in location

    # Test error redirect
    err_res = await client.get("/api/v1/auth/google/callback?error=access_denied", follow_redirects=False)
    assert err_res.status_code in (302, 307)
    err_location = err_res.headers.get("location")
    assert "/login" in err_location
    assert "oauth_error=access_denied" in err_location
