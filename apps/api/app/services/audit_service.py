"""Audit logging service — writes to audit_logs table and structured logger.

Records who did what, when, and on which resource for compliance tracking.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger("strata.audit")


async def log_action(
    db: AsyncSession,
    *,
    org_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Create an audit log entry. Does NOT commit -- caller must commit or flush.

    Persists to the audit_logs table AND emits a structured log message
    for downstream ingestion (SIEM, log aggregator, etc.).
    """
    entry = AuditLog(
        org_id=org_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        metadata_json=metadata or {},
        ip_address=ip_address,
    )
    db.add(entry)

    # Emit structured log for observability pipelines
    logger.info(
        "audit_event",
        extra={
            "org_id": str(org_id),
            "user_id": str(user_id) if user_id else None,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "details": metadata or {},
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    return entry
