"""Connector depth routes — transparency, sync logs, extraction matrix, provenance."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.user import User
from app.models.connector import ConnectorConfig, SourceAsset
from app.models.connector_depth import (
    ConnectorExtractionMeta,
    ConnectorSyncLog,
    FieldProvenance,
)
from app.models.data_product import DataProduct
from app.schemas.connector_depth import (
    AutomationSummaryResponse,
    AssetProvenanceResponse,
    ConnectorDepthOverview,
    ConnectorDepthSummary,
    ExtractionCapability,
    ExtractionMatrixResponse,
    FieldProvenanceResponse,
    SyncLogListResponse,
    SyncLogResponse,
)
from app.services.provenance import get_automation_summary

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# GET /connectors/depth — Overview of all connectors with capability coverage
# ---------------------------------------------------------------------------

@router.get("/depth", response_model=ConnectorDepthOverview)
async def connector_depth_overview(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:read")),
) -> ConnectorDepthOverview:
    """Overview: all connectors with capability coverage + portfolio automation stats."""

    # Fetch all connectors for this org
    result = await db.execute(
        select(ConnectorConfig).where(ConnectorConfig.org_id == org_id)
    )
    connectors = result.scalars().all()

    summaries = []
    for c in connectors:
        # Count capabilities
        cap_result = await db.execute(
            select(
                func.count(ConnectorExtractionMeta.id).label("total"),
                func.count(ConnectorExtractionMeta.id).filter(
                    ConnectorExtractionMeta.is_available.is_(True)
                ).label("available"),
            ).where(ConnectorExtractionMeta.connector_id == c.id)
        )
        row = cap_result.one()
        total_caps = row.total or 0
        available_caps = row.available or 0

        # Count managed objects (source assets)
        obj_result = await db.execute(
            select(func.count(SourceAsset.id)).where(SourceAsset.connector_id == c.id)
        )
        objects_managed = obj_result.scalar() or 0

        # Latest sync log
        sync_result = await db.execute(
            select(ConnectorSyncLog)
            .where(ConnectorSyncLog.connector_id == c.id)
            .order_by(ConnectorSyncLog.sync_started_at.desc())
            .limit(1)
        )
        latest_sync = sync_result.scalar_one_or_none()

        # Automation coverage for this connector's products
        prov_result = await db.execute(
            select(
                func.count(FieldProvenance.id).label("total"),
                func.count(FieldProvenance.id).filter(
                    FieldProvenance.automation_level == "fully_automated"
                ).label("automated"),
            ).where(FieldProvenance.source_connector_id == c.id)
        )
        prov_row = prov_result.one()
        auto_coverage = (prov_row.automated / prov_row.total) if prov_row.total else 0.0

        summaries.append(ConnectorDepthSummary(
            connector_id=str(c.id),
            connector_name=c.name,
            platform=c.connector_type.value,
            total_capabilities=total_caps,
            available_capabilities=available_caps,
            coverage_pct=round(available_caps / total_caps, 4) if total_caps else 0.0,
            last_sync_at=latest_sync.sync_started_at.isoformat() if latest_sync else None,
            sync_status=latest_sync.status.value if latest_sync else "unknown",
            objects_managed=objects_managed,
            automation_coverage=round(auto_coverage, 4),
        ))

    # Portfolio-wide automation stats
    auto_summary = await get_automation_summary(org_id, db)

    return ConnectorDepthOverview(
        connectors=summaries,
        portfolio_automation_coverage=auto_summary["coverage_pct"],
        total_fields_tracked=auto_summary["total"],
        fully_automated_pct=round(auto_summary["fully_automated"] / auto_summary["total"], 4) if auto_summary["total"] else 0.0,
        semi_automated_pct=round(auto_summary["semi_automated"] / auto_summary["total"], 4) if auto_summary["total"] else 0.0,
        manual_pct=round(auto_summary["manual"] / auto_summary["total"], 4) if auto_summary["total"] else 0.0,
    )


# ---------------------------------------------------------------------------
# GET /connectors/{id}/sync-log — Paginated sync history
# ---------------------------------------------------------------------------

@router.get("/{connector_id}/sync-log", response_model=SyncLogListResponse)
async def connector_sync_log(
    connector_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    limit: int = 20,
    offset: int = 0,
    _user: User = Depends(require_permission("connectors:read")),
) -> SyncLogListResponse:
    """Paginated sync history for a connector."""

    # Verify connector belongs to org
    connector = await db.get(ConnectorConfig, connector_id)
    if not connector or connector.org_id != org_id:
        raise HTTPException(status_code=404, detail="Connector not found")

    total_result = await db.execute(
        select(func.count(ConnectorSyncLog.id)).where(
            ConnectorSyncLog.connector_id == connector_id
        )
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(ConnectorSyncLog)
        .where(ConnectorSyncLog.connector_id == connector_id)
        .order_by(ConnectorSyncLog.sync_started_at.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()

    items = [
        SyncLogResponse(
            id=log.id,
            connector_id=log.connector_id,
            sync_started_at=log.sync_started_at,
            sync_ended_at=log.sync_ended_at,
            status=log.status.value,
            objects_discovered=log.objects_discovered,
            objects_updated=log.objects_updated,
            objects_deleted=log.objects_deleted,
            usage_events_fetched=log.usage_events_fetched,
            cost_events_fetched=log.cost_events_fetched,
            duration_seconds=log.duration_seconds,
            errors=log.errors,
            diff_summary=log.diff_summary,
        )
        for log in logs
    ]

    return SyncLogListResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# GET /connectors/{id}/extraction-matrix — Capability matrix
# ---------------------------------------------------------------------------

@router.get("/{connector_id}/extraction-matrix", response_model=ExtractionMatrixResponse)
async def connector_extraction_matrix(
    connector_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:read")),
) -> ExtractionMatrixResponse:
    """Capability matrix for a single connector."""

    connector = await db.get(ConnectorConfig, connector_id)
    if not connector or connector.org_id != org_id:
        raise HTTPException(status_code=404, detail="Connector not found")

    result = await db.execute(
        select(ConnectorExtractionMeta)
        .where(ConnectorExtractionMeta.connector_id == connector_id)
        .order_by(ConnectorExtractionMeta.capability_category)
    )
    caps = result.scalars().all()

    capabilities = [
        ExtractionCapability(
            capability_category=c.capability_category,
            capability_name=c.capability_name,
            is_available=c.is_available,
            requires_elevated_access=c.requires_elevated_access,
            extraction_method=c.extraction_method,
            refresh_frequency=c.refresh_frequency,
        )
        for c in caps
    ]

    return ExtractionMatrixResponse(
        connector_id=str(connector.id),
        connector_name=connector.name,
        platform=connector.connector_type.value,
        capabilities=capabilities,
    )


# ---------------------------------------------------------------------------
# GET /connectors/automation-summary — Portfolio-wide automation breakdown
# ---------------------------------------------------------------------------

@router.get("/automation-summary", response_model=AutomationSummaryResponse)
async def automation_summary(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:read")),
) -> AutomationSummaryResponse:
    """Portfolio-wide automation breakdown."""
    summary = await get_automation_summary(org_id, db)
    return AutomationSummaryResponse(**summary)


# ---------------------------------------------------------------------------
# GET /assets/{id}/provenance — Field-level provenance for a data product
# ---------------------------------------------------------------------------

@router.get("/assets/{product_id}/provenance", response_model=AssetProvenanceResponse)
async def asset_provenance(
    product_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("products:read")),
) -> AssetProvenanceResponse:
    """Field-level provenance for a single data product."""

    product = await db.get(DataProduct, product_id)
    if not product or product.org_id != org_id:
        raise HTTPException(status_code=404, detail="Product not found")

    result = await db.execute(
        select(FieldProvenance)
        .where(FieldProvenance.data_product_id == product_id)
        .order_by(FieldProvenance.field_name)
    )
    provenances = result.scalars().all()

    fields = [
        FieldProvenanceResponse(
            field_name=p.field_name,
            source_platform=p.source_platform,
            extraction_method=p.extraction_method,
            automation_level=p.automation_level.value,
            confidence=p.confidence,
            last_observed_at=p.last_observed_at,
            observation_count=p.observation_count,
        )
        for p in provenances
    ]

    automated_count = sum(1 for f in fields if f.automation_level == "fully_automated")
    coverage = automated_count / len(fields) if fields else 0.0

    return AssetProvenanceResponse(
        product_id=str(product_id),
        product_name=product.name,
        fields=fields,
        automation_coverage=round(coverage, 4),
    )
