"""Connector routes — list, create, test, run."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.user import User
from app.models.connector import (
    ConnectorConfig,
    ConnectorRun,
    ConnectorStatus,
    ConnectorType,
    RunStatus,
)

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ConnectorResponse(BaseModel):
    id: uuid.UUID
    platform: str
    name: str
    status: str
    last_sync: str | None
    products_found: int
    cost_coverage: float
    usage_coverage: float

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class CreateConnectorRequest(BaseModel):
    name: str
    platform: str
    credentials: dict = {}
    config_json: dict = {}

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class TestConnectionResponse(BaseModel):
    success: bool
    message: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class RunResponse(BaseModel):
    run_id: uuid.UUID
    status: str
    started_at: str
    message: str

    model_config = {"alias_generator": to_camel, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(c: ConnectorConfig) -> ConnectorResponse:
    return ConnectorResponse(
        id=c.id,
        platform=c.connector_type.value,
        name=c.name,
        status=c.status.value,
        last_sync=c.last_sync_at.isoformat() if c.last_sync_at else None,
        products_found=c.products_found,
        cost_coverage=float(c.cost_coverage),
        usage_coverage=float(c.usage_coverage),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[ConnectorResponse])
async def list_connectors(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:read")),
):
    """List all connectors for the org."""
    q = select(ConnectorConfig).where(ConnectorConfig.org_id == org_id).order_by(ConnectorConfig.created_at.desc())
    result = await db.execute(q)
    connectors = result.scalars().all()
    return [_to_response(c) for c in connectors]


@router.post("/", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
async def create_connector(
    body: CreateConnectorRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("connectors:write")),
):
    """Create a new connector configuration."""
    connector = ConnectorConfig(
        org_id=org_id,
        name=body.name,
        connector_type=ConnectorType(body.platform),
        credentials=body.credentials,
        config_json=body.config_json,
        status=ConnectorStatus.disconnected,
    )
    db.add(connector)
    await db.commit()
    await db.refresh(connector)
    return _to_response(connector)


@router.post("/{connector_id}/test", response_model=TestConnectionResponse)
async def test_connector(
    connector_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:run")),
):
    """Test a connector's connection (validates credentials)."""
    result = await db.execute(
        select(ConnectorConfig).where(
            ConnectorConfig.id == connector_id,
            ConnectorConfig.org_id == org_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    # Use real connector framework to test connection
    from app.connectors.registry import get_connector
    try:
        driver = get_connector(
            connector.connector_type.value,
            {**(connector.credentials or {}), "connector_id": str(connector.id)},
        )
        test_result = await driver.test_connection()
        if test_result.success:
            connector.status = ConnectorStatus.connected
        else:
            connector.status = ConnectorStatus.error
        await db.commit()
        await db.refresh(connector)
        return TestConnectionResponse(
            success=test_result.success,
            message=test_result.message,
        )
    except Exception as e:
        connector.status = ConnectorStatus.error
        await db.commit()
        return TestConnectionResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
        )


@router.post("/{connector_id}/run", response_model=RunResponse)
async def run_connector(connector_id: uuid.UUID, db: DbSession, org_id: OrgId, user: User = Depends(require_permission("connectors:run"))):
    """Trigger an ingestion run for a connector."""
    result = await db.execute(
        select(ConnectorConfig).where(
            ConnectorConfig.id == connector_id,
            ConnectorConfig.org_id == org_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    if connector.status == ConnectorStatus.disconnected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connector is not connected. Test the connection first.",
        )

    # Execute the real connector runner (discover + fetch + store)
    from app.connectors.runner import ConnectorRunner
    runner = ConnectorRunner(db, connector)
    run = await runner.run()

    # After connector sync, run attribution to compute aggregates + ROI
    from app.services.attribution import AttributionService
    attribution = AttributionService(db, org_id)
    attribution_stats = await attribution.run_full_attribution()

    return RunResponse(
        run_id=run.id,
        status=run.status.value,
        started_at=run.started_at.isoformat() if run.started_at else datetime.now(timezone.utc).isoformat(),
        message=f"Ingestion complete: {run.records_found} assets, "
                f"{run.usage_events_found} usage events, {run.cost_events_found} cost events. "
                f"Attribution: {attribution_stats['products_updated']} products updated.",
    )
