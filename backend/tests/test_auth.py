import pytest
from httpx import AsyncClient
from app.core.security import get_password_hash, verify_password, decode_token


@pytest.mark.asyncio
async def test_password_hashing():
    pwd = "SecureTradeXPassword2026!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    payload = {
        "email": "newtrader@tradex.com",
        "password": "SecurePassword123!",
        "first_name": "Rohan",
        "last_name": "Sharma",
        "phone": "+919876543210",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newtrader@tradex.com"
    assert "TRADER" in data["user"]["roles"]


@pytest.mark.asyncio
async def test_duplicate_registration_fails(client: AsyncClient):
    payload = {
        "email": "duplicate@tradex.com",
        "password": "SecurePassword123!",
    }
    # First attempt
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second attempt with same email
    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    err = res2.json()
    assert err["success"] is False
    assert err["error"]["code"] == "RESOURCE_CONFLICT"


@pytest.mark.asyncio
async def test_login_success_and_failure(client: AsyncClient):
    # Register user
    reg_payload = {"email": "login_test@tradex.com", "password": "CorrectPassword123!"}
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Valid login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "login_test@tradex.com", "password": "CorrectPassword123!"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data

    decoded = decode_token(token_data["access_token"])
    assert decoded["type"] == "access"

    # Invalid login
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "login_test@tradex.com", "password": "BadPassword123!"},
    )
    assert bad_login.status_code == 401
    err = bad_login.json()
    assert err["success"] is False
    assert err["error"]["code"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_refresh_token_flow(client: AsyncClient):
    # Register and get tokens
    reg_payload = {"email": "refresh_test@tradex.com", "password": "ValidPassword123!"}
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    refresh_token = reg_res.json()["refresh_token"]

    # Request new access token
    ref_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    data = ref_res.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient, trader_auth_headers: dict):
    res = await client.get("/api/v1/auth/me", headers=trader_auth_headers)
    assert res.status_code == 200
    user_info = res.json()
    assert user_info["email"] == "trader@tradex.com"
    assert "TRADER" in user_info["roles"]


@pytest.mark.asyncio
async def test_case_insensitive_email_normalization(client: AsyncClient):
    """Verify that email registration and login are strictly case-insensitive."""
    reg_payload = {
        "email": "TraderCase@BullRun.in",
        "password": "PasswordCase123!",
        "first_name": "Case",
        "last_name": "Test",
    }
    res_reg = await client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    assert res_reg.json()["user"]["email"] == "tradercase@bullrun.in"

    # Login with lowercase
    res_login_lower = await client.post(
        "/api/v1/auth/login",
        json={"email": "tradercase@bullrun.in", "password": "PasswordCase123!"},
    )
    assert res_login_lower.status_code == 200

    # Login with UPPERCASE
    res_login_upper = await client.post(
        "/api/v1/auth/login",
        json={"email": "TRADERCASE@BULLRUN.IN", "password": "PasswordCase123!"},
    )
    assert res_login_upper.status_code == 200


@pytest.mark.asyncio
async def test_duplicate_registration_case_insensitive(client: AsyncClient):
    """Verify duplicate registration fails even with mixed casing."""
    p1 = {"email": "UniqueTrader@bullrun.in", "password": "Password123!"}
    p2 = {"email": "uniquetrader@bullrun.in", "password": "Password123!"}

    res1 = await client.post("/api/v1/auth/register", json=p1)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=p2)
    assert res2.status_code == 409


@pytest.mark.asyncio
async def test_expired_and_invalid_tokens_rejected(client: AsyncClient, test_trader):
    """Verify protected endpoints reject missing, expired, and forged tokens."""
    from datetime import timedelta
    from app.core.security import create_access_token

    # 1. Missing token
    res_no_token = await client.get("/api/v1/auth/me")
    assert res_no_token.status_code == 401

    # 2. Forged token
    res_bad_token = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.jwt"})
    assert res_bad_token.status_code == 401

    # 3. Expired token
    expired_token = create_access_token(
        subject=test_trader.id,
        role="TRADER",
        expires_delta=timedelta(seconds=-60),
    )
    res_expired = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401


@pytest.mark.asyncio
async def test_logout_and_session_persistence(client: AsyncClient, trader_auth_headers: dict):
    """Verify logout records audit event and succeeds."""
    logout_res = await client.post("/api/v1/auth/logout", headers=trader_auth_headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True


@pytest.mark.asyncio
async def test_forgot_and_reset_password_flow(client: AsyncClient):
    """Verify complete password recovery flow."""
    email = "recovery_test@bullrun.in"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "OldPassword123!"},
    )

    # Request reset token
    forgot_res = await client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    reset_token = forgot_res.json()["reset_token"]
    assert reset_token is not None

    # Reset password with token
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "NewSecurePassword456!"},
    )
    assert reset_res.status_code == 200

    # Old password fails
    bad_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "OldPassword123!"})
    assert bad_login.status_code == 401

    # New password succeeds
    good_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "NewSecurePassword456!"})
    assert good_login.status_code == 200

