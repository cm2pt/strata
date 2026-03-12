"""Notification routes — list, mark-read notifications for the current org."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.config import Notification
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    description: str
    product_id: uuid.UUID | None
    product_name: str | None
    timestamp: str
    is_read: bool

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("notifications:read")),
):
    """List all notifications for the org, newest first."""
    q = (
        select(Notification)
        .where(Notification.org_id == org_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        NotificationResponse(
            id=n.id,
            type=n.type.value,
            title=n.title,
            description=n.description,
            product_id=n.product_id,
            product_name=n.product_name,
            timestamp=n.created_at.isoformat(),
            is_read=n.is_read,
        )
        for n in rows
    ]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("notifications:read")),
):
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.org_id == org_id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)

    return NotificationResponse(
        id=notification.id,
        type=notification.type.value,
        title=notification.title,
        description=notification.description,
        product_id=notification.product_id,
        product_name=notification.product_name,
        timestamp=notification.created_at.isoformat(),
        is_read=notification.is_read,
    )


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("notifications:read")),
):
    """Mark all unread notifications as read for the org."""
    result = await db.execute(
        update(Notification)
        .where(Notification.org_id == org_id, Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    await db.commit()
    return {"updated_count": result.rowcount}
