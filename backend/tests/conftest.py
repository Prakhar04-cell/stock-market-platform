import asyncio
from decimal import Decimal
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app, seed_initial_data
from app.models.market import Exchange, Stock
from app.models.user import Profile, Role, User, UserRole
from app.models.wallet import LedgerEntry, Wallet

# Use in-memory SQLite for test execution
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Seed system roles
        for r_name in ["TRADER", "ADMIN"]:
            role = Role(name=r_name, description=f"{r_name} role")
            session.add(role)
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_trader(db_session: AsyncSession) -> User:
    """Creates a sample trader user with wallet."""
    user = User(
        email="trader@tradex.com",
        hashed_password=get_password_hash("TraderPass123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()

    # Get trader role
    from sqlalchemy import select
    r = (await db_session.execute(select(Role).where(Role.name == "TRADER"))).scalar_one()
    ur = UserRole(user_id=user.id, role_id=r.id)
    db_session.add(ur)

    profile = Profile(user_id=user.id, first_name="John", last_name="Trader")
    db_session.add(profile)

    wallet = Wallet(
        user_id=user.id,
        currency="INR",
        balance=Decimal("100000.00"),
        locked_balance=Decimal("0.0000"),
    )
    db_session.add(wallet)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Creates an admin user."""
    from sqlalchemy import select
    user = User(
        email="admin@tradex.com",
        hashed_password=get_password_hash("AdminPass123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()

    r = (await db_session.execute(select(Role).where(Role.name == "ADMIN"))).scalar_one()
    ur = UserRole(user_id=user.id, role_id=r.id)
    db_session.add(ur)

    profile = Profile(user_id=user.id, first_name="Super", last_name="Admin")
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def trader_auth_headers(test_trader: User) -> dict:
    token = create_access_token(subject=test_trader.id, role="TRADER")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(test_admin: User) -> dict:
    token = create_access_token(subject=test_admin.id, role="ADMIN")
    return {"Authorization": f"Bearer {token}"}
