from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.exceptions import ResourceNotFoundError
from app.core.redis import check_redis_health
from app.models.system import AuditLog, SecurityIncident, SystemSetting
from app.models.trading import Order, OrderExecution
from app.models.user import Role, User, UserRole
from app.schemas.admin import (
    AdminDashboardMetrics,
    AdminUserUpdate,
    AuditLogResponse,
    SystemHealthItem,
    SystemSettingResponse,
    SystemSettingUpdate,
)
from app.schemas.auth import UserResponse
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/admin", tags=["Admin Operations"], dependencies=[Depends(require_admin)])


@router.get("/metrics", response_model=AdminDashboardMetrics, summary="Admin dashboard KPI metrics")
async def get_admin_metrics(db: AsyncSession = Depends(get_db)):
    """Compute platform overview metrics for administrator overview."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active.is_(True)))).scalar() or 0

    orders_today = (await db.execute(select(func.count(Order.id)))).scalar() or 0
    executed_orders = (await db.execute(select(func.count(OrderExecution.id)))).scalar() or 0
    failed_orders = (await db.execute(select(func.count(Order.id)).where(Order.status == "REJECTED"))).scalar() or 0
    security_incidents = (await db.execute(select(func.count(SecurityIncident.id)))).scalar() or 0

    redis_ok = await check_redis_health()
    system_status = "HEALTHY" if redis_ok else "DEGRADED"

    return AdminDashboardMetrics(
        total_users=total_users,
        active_users=active_users,
        orders_today=orders_today,
        executed_orders=executed_orders,
        failed_orders=failed_orders,
        security_incidents=security_incidents,
        system_status=system_status,
    )


@router.get("/users", response_model=List[UserResponse], summary="List and search platform users")
async def list_users(
    search: Optional[str] = Query(None, description="Search by email or name"),
    is_active: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Admin user search and management endpoint."""
    stmt = select(User).options(selectinload(User.roles), selectinload(User.profile))

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(User.email.ilike(term))

    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    stmt = stmt.order_by(desc(User.created_at)).offset(offset).limit(limit)
    res = await db.execute(stmt)
    users = res.scalars().all()

    return [
        UserResponse(
            id=u.id,
            email=u.email,
            is_active=u.is_active,
            is_verified=u.is_verified,
            roles=[r.name for r in u.roles],
            profile=u.profile,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.get("/users/{user_id}", response_model=UserResponse, summary="Get single user details")
async def get_user_details(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed user profile and account configuration."""
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles), selectinload(User.profile))
    )
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise ResourceNotFoundError(resource="User", identifier=user_id)

    return UserResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=[r.name for r in user.roles],
        profile=user.profile,
        created_at=user.created_at,
    )


@router.put("/users/{user_id}", response_model=UserResponse, summary="Update user status and roles")
async def update_user(
    user_id: str,
    update_in: AdminUserUpdate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate/deactivate user or update roles. Records audit log."""
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles), selectinload(User.profile))
    )
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise ResourceNotFoundError(resource="User", identifier=user_id)

    old_values = {
        "is_active": user.is_active,
        "roles": [r.name for r in user.roles],
    }

    if update_in.is_active is not None:
        user.is_active = update_in.is_active

    if update_in.role_names is not None:
        # Re-assign roles
        user.roles.clear()
        for role_name in update_in.role_names:
            r_stmt = select(Role).where(Role.name == role_name.upper())
            r_res = await db.execute(r_stmt)
            role = r_res.scalar_one_or_none()
            if role:
                user.roles.append(role)

    new_values = {
        "is_active": user.is_active,
        "roles": [r.name for r in user.roles],
    }

    await record_audit_log(
        db=db,
        action="ADMIN_USER_UPDATE",
        entity_type="user",
        user_id=admin_user.id,
        entity_id=user.id,
        old_values=old_values,
        new_values=new_values,
    )
    await db.commit()

    return UserResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=[r.name for r in user.roles],
        profile=user.profile,
        created_at=user.created_at,
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse], summary="Retrieve system audit logs")
async def get_audit_logs(
    action: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve audit log stream."""
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    if action:
        stmt = stmt.where(AuditLog.action == action.upper())

    res = await db.execute(stmt)
    logs = res.scalars().all()
    return logs


@router.get("/monitoring", summary="Platform monitoring subsystem health overview")
async def get_monitoring_overview(db: AsyncSession = Depends(get_db)):
    """Comprehensive monitoring status across all 7 platform components."""
    # 1. Database
    db_status = "HEALTHY"
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "DOWN"

    # 2. Redis
    redis_ok = await check_redis_health()
    redis_status = "HEALTHY" if redis_ok else "DOWN"

    # 3. Market Provider & Trading Engine: Phase 1 strictly NOT_CONFIGURED
    now = datetime.now(timezone.utc)
    return {
        "components": [
            {"service_name": "Frontend Web Application", "status": "HEALTHY", "details": "Next.js App Server"},
            {"service_name": "Backend REST API", "status": "HEALTHY", "details": "FastAPI Core"},
            {"service_name": "PostgreSQL Database", "status": db_status, "details": "Neon / Local Postgres 16"},
            {"service_name": "Redis Cache & Rate Limiter", "status": redis_status, "details": "Upstash / Local Redis 7"},
            {"service_name": "WebSocket Live Stream", "status": "NOT_CONFIGURED", "details": "Phase 2 Live Stream Engine"},
            {"service_name": "Market Data Provider", "status": "NOT_CONFIGURED", "details": "Upstox / Zerodha Data Provider"},
            {"service_name": "Trading Execution Engine", "status": "NOT_CONFIGURED", "details": "Paper Engine / Broker Venue"},
        ],
        "checked_at": now.isoformat(),
    }


@router.get("/settings", response_model=List[SystemSettingResponse], summary="List system settings")
async def get_system_settings(db: AsyncSession = Depends(get_db)):
    """List configurable system settings."""
    stmt = select(SystemSetting).order_by(SystemSetting.key)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.put("/settings/{key}", response_model=SystemSettingResponse, summary="Update system setting")
async def update_system_setting(
    key: str,
    payload: SystemSettingUpdate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a system setting (e.g. INITIAL_PAPER_BALANCE). Records audit log."""
    stmt = select(SystemSetting).where(SystemSetting.key == key)
    setting = (await db.execute(stmt)).scalar_one_or_none()

    old_val = setting.value if setting else None

    if not setting:
        setting = SystemSetting(
            key=key,
            value=payload.value,
            description=payload.description,
            updated_by=admin_user.id,
        )
        db.add(setting)
    else:
        setting.value = payload.value
        if payload.description:
            setting.description = payload.description
        setting.updated_by = admin_user.id

    await record_audit_log(
        db=db,
        action="SYSTEM_SETTING_UPDATED",
        entity_type="system_setting",
        user_id=admin_user.id,
        entity_id=key,
        old_values={"value": old_val},
        new_values={"value": payload.value},
    )
    await db.commit()
    await db.refresh(setting)
    return setting
