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
