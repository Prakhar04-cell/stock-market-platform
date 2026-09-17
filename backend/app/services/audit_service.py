from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.system import AuditLog, SecurityIncident


async def record_audit_log(
    db: AsyncSession,
    action: str,
    entity_type: str,
    user_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Record an immutable audit log entry."""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.flush()
    return audit


async def record_security_incident(
    db: AsyncSession,
    incident_type: str,
    severity: str,
    description: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    user_id: Optional[str] = None,
) -> SecurityIncident:
    """Log a security incident (e.g. rate limit breach, suspicious auth attempt)."""
    incident = SecurityIncident(
        incident_type=incident_type,
        severity=severity,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        user_id=user_id,
    )
    db.add(incident)
    await db.flush()
    return incident
