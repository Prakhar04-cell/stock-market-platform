from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthenticationError, ResourceConflictError, ResourceNotFoundError
from app.core.security import get_password_hash, verify_password
from app.models.user import Profile, Role, User, UserRole
from app.models.watchlist import Watchlist
from app.schemas.auth import UserRegister
from app.services.audit_service import record_audit_log
from app.services.wallet_service import create_user_wallet


async def get_or_create_role(db: AsyncSession, name: str, description: str = "") -> Role:
    """Ensure a system role exists and return it."""
    stmt = select(Role).where(Role.name == name)
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=name, description=description)
        db.add(role)
        await db.flush()
    return role


async def register_user(
    db: AsyncSession,
    user_in: UserRegister,
    role_name: str = "TRADER",
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> User:
    """Register a new user, profile, role, paper wallet, and default watchlist."""
    # Check if email is already taken
    stmt = select(User).where(User.email == user_in.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise ResourceConflictError(message=f"User with email '{user_in.email}' already exists.")

    # Hash password
    hashed_pwd = get_password_hash(user_in.password)

    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    # Create profile
    profile = Profile(
        user_id=user.id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
    )
    db.add(profile)

    # Assign role
    role = await get_or_create_role(db, role_name, f"System {role_name} role")
    user_role = UserRole(user_id=user.id, role_id=role.id)
    db.add(user_role)
    await db.flush()

    # Create paper trading wallet with initial balance from system config
    await create_user_wallet(db, user.id)

    # Create default watchlist
    default_watchlist = Watchlist(
        user_id=user.id,
        name="My Watchlist",
        is_default=True,
    )
    db.add(default_watchlist)

    # Audit log
    await record_audit_log(
        db=db,
        action="USER_REGISTRATION",
        entity_type="user",
        user_id=user.id,
        entity_id=user.id,
        new_values={"email": user.email, "role": role_name},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    await db.commit()

    # Reload user with relationships
    return await get_user_by_id(db, user.id)


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> User:
    """Verify user credentials and check active status."""
    stmt = (
        select(User)
        .where(User.email == email)
        .options(selectinload(User.roles), selectinload(User.profile))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        await record_audit_log(
            db=db,
            action="LOGIN_FAILED",
            entity_type="user",
            user_id=user.id if user else None,
            new_values={"email": email},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await db.commit()
        raise AuthenticationError(message="Incorrect email or password.")

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

    # Record successful login
    await record_audit_log(
        db=db,
        action="LOGIN_SUCCESS",
        entity_type="user",
        user_id=user.id,
        entity_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await db.commit()

    return user


async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
    """Retrieve user by UUID including roles and profile."""
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles), selectinload(User.profile))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise ResourceNotFoundError(resource="User", identifier=user_id)
    return user
