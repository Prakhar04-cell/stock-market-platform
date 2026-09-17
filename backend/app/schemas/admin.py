from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.auth import UserResponse


class AdminDashboardMetrics(BaseModel):
    total_users: int
    active_users: int
    orders_today: int
    executed_orders: int
    failed_orders: int
    security_incidents: int
    system_status: str # HEALTHY, DEGRADED, DOWN


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role_names: Optional[List[str]] = None


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SystemSettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SystemSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class SystemHealthItem(BaseModel):
    service_name: str
    status: str # HEALTHY, DEGRADED, DOWN, NOT_CONFIGURED
    response_time_ms: Optional[float] = None
    last_checked_at: datetime
    details: Optional[Dict[str, Any]] = None
