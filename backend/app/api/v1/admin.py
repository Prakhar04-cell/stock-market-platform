from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin
from app.core.config import settings
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
    """Comprehensive monitoring status across all platform components and real-time market streams."""
    import os
    from app.core.database import check_db_health
    from app.core.redis import check_redis_ping
    from app.core.sentry import get_sentry_status
    from app.models.market import Instrument
    from app.models.system import ProviderCredential
    from app.services.market_data.upstox_client import upstox_client
    from app.services.market_data.upstox_provider import upstox_provider
    from app.services.market_data.websocket_service import market_ws_manager, upstream_feed

    # 1. Database - Real SELECT 1 ping with latency
    db_ok, db_latency, db_provider = await check_db_health(db)
    db_status = "HEALTHY" if db_ok else "DOWN"

    # 2. Redis - Real PING with latency
    redis_ok, redis_latency, redis_provider = await check_redis_ping()
    redis_status = "HEALTHY" if redis_ok else ("NOT_CONFIGURED" if redis_provider == "NOT_CONFIGURED" else "DOWN")

    # 3. Market Provider Status
    verification = await upstox_client.verify_token()
    upstox_health = await upstox_provider.get_health()
    mkt_status = "HEALTHY" if verification.get("authenticated") else ("DEGRADED" if verification.get("configured") else "NOT_CONFIGURED")

    # Check stored OAuth credentials for user details
    stmt = (
        select(ProviderCredential)
        .where(ProviderCredential.provider_name == "upstox", ProviderCredential.is_active.is_(True))
        .order_by(ProviderCredential.created_at.desc())
    )
    cred = (await db.execute(stmt)).scalar_one_or_none()

    # 4. WebSocket Status
    ws_metrics = upstream_feed.get_monitoring_metrics()
    client_stats = market_ws_manager.get_stats()
    ws_state = ws_metrics["state"]
    ws_status = "HEALTHY" if upstream_feed.is_connected else ("DEGRADED" if mkt_status == "HEALTHY" else "NOT_CONFIGURED")

    # 5. Sentry Status
    sentry_status, sentry_desc = get_sentry_status()

    # 6. Docker Runtime / Host Process Semantics
    in_docker = os.path.exists("/.dockerenv")
    if not in_docker:
        try:
            with open("/proc/1/cgroup", "rt") as f:
                content = f.read()
                in_docker = "docker" in content or "containerd" in content
        except Exception:
            in_docker = False

    docker_status = "RUNNING_IN_DOCKER" if in_docker else "MANAGED BY HOST"
    docker_desc = (
        "Running inside containerized stack."
        if in_docker
        else "Host Docker runtime is managed by Render and is not directly exposed to the application."
    )

    inst_count = (await db.execute(select(func.count(Instrument.id)))).scalar() or 0
    now = datetime.now(timezone.utc)
    ws_rtt_ms = ws_metrics.get("websocket_rtt_ms")
    market_data_latency_ms = ws_metrics.get("market_data_latency_ms")

    return {
        "environment": settings.ENVIRONMENT,
        "components": [
            {"service_name": "Frontend Web Application", "status": "HEALTHY", "details": "Next.js App Server (Vercel / Local)"},
            {"service_name": "Backend REST API", "status": "HEALTHY", "details": f"FastAPI Core v{settings.VERSION}"},
            {"service_name": "Docker Runtime", "status": docker_status, "details": docker_desc},
            {"service_name": "PostgreSQL Database", "status": db_status, "details": f"{db_provider} ({db_latency} ms)"},
            {"service_name": "Redis Cache & Rate Limiter", "status": redis_status, "details": f"{redis_provider} ({redis_latency} ms)" if redis_ok else redis_provider},
            {"service_name": "Upstox Connection", "status": mkt_status, "details": f"Upstox V3 API ({'Analytics Token ACTIVE' if verification.get('authenticated') else 'NOT CONFIGURED'})"},
            {"service_name": "Market WebSocket", "status": ws_status, "details": f"Upstream: {ws_state}, Clients: {client_stats['connected_clients']}, RTT: {ws_rtt_ms if ws_rtt_ms is not None else 'N/A'} ms"},
            {"service_name": "Sentry Monitoring", "status": sentry_status, "details": sentry_desc},
            {"service_name": "Trading Engine", "status": "HEALTHY", "details": "Virtual Paper Trading Engine (No Real Money)"},
        ],
        "metrics": {
            "docker_runtime": {
                "status": docker_status,
                "is_container": in_docker,
                "description": docker_desc,
            },
            "backend_container": {
                "status": "HEALTHY",
                "service": "FastAPI",
                "version": settings.VERSION,
            },
            "upstox_configured": verification["configured"],
            "upstox_authenticated": verification["authenticated"],
            "upstox_user_id": cred.user_id if cred else None,
            "upstox_user_name": cred.user_name if cred else None,
            "upstox_expires_at": cred.expires_at.isoformat() if cred and cred.expires_at else None,
            "market_websocket_status": "connected" if upstream_feed.is_connected else "disconnected",
            "market_websocket_state": ws_state,
            "last_market_update": ws_metrics.get("last_tick_at") or ws_metrics.get("last_message"),
            "redis_status": redis_status,
            "redis_latency_ms": redis_latency,
            "redis_provider": redis_provider,
            "postgresql_status": db_status,
            "postgresql_latency_ms": db_latency,
            "postgresql_provider": db_provider,
            "subscribed_instruments_count": ws_metrics.get("subscribed_instruments_count", 0),
            "websocket_rtt_ms": ws_rtt_ms,
            "market_data_latency_ms": market_data_latency_ms,
            "quote_update_rate": ws_metrics.get("quote_update_rate", "Standby"),
            "paper_trading_engine_status": "ACTIVE (PAPER EXECUTION ONLY)",
            "sentry_status": sentry_status,
            "sentry_description": sentry_desc,
            "upstox_connection": {
                "status": "healthy" if verification.get("authenticated") else "authentication_required",
                "authenticated": verification.get("authenticated", False),
                "configured": verification.get("configured", False),
                "last_successful_request": upstox_provider._last_successful_request.isoformat() if upstox_provider._last_successful_request else None,
                "error_count": upstox_provider._error_count,
                "last_error": upstox_provider._last_error_message,
            },
            "market_websocket": {
                "status": "connected" if upstream_feed.is_connected else "disconnected",
                "state": ws_state,
                "connected": upstream_feed.is_connected,
                "websocket_connected": upstream_feed.is_connected,
                "diagnostic_state": ws_metrics.get("diagnostic_state", "DISCONNECTED"),
                "last_message": ws_metrics.get("last_message"),
                "last_websocket_frame_at": ws_metrics.get("last_websocket_frame_at"),
                "last_binary_message_at": ws_metrics.get("last_binary_message_at"),
                "first_tick_at": ws_metrics.get("first_tick_at"),
                "last_tick_at": ws_metrics.get("last_tick_at"),
                "total_binary_messages": ws_metrics.get("total_binary_messages", 0),
                "total_ticks_decoded": ws_metrics.get("total_ticks_decoded", 0),
                "messages_received": ws_metrics.get("messages_received", 0),
                "reconnect_count": ws_metrics.get("reconnect_count", 0),
                "last_disconnect_reason": ws_metrics.get("last_disconnect_reason"),
                "error_count": ws_metrics.get("error_count", 0),
                "quote_update_rate": ws_metrics.get("quote_update_rate", "Standby"),
                "subscribed_instruments": ws_metrics.get("subscribed_instruments_count", 0),
                "active_client_connections": client_stats["connected_clients"],
                "active_background_tasks": ws_metrics.get("active_background_tasks", 0),
                "websocket_rtt_ms": ws_rtt_ms,
                "market_data_latency_ms": market_data_latency_ms,
            },
            "instruments_master_count": inst_count,
            "database_status": db_status,
            "paper_trading_engine": "ACTIVE",
        },
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
