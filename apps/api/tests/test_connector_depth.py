"""Tests for the /connector-depth router — depth overview, sync log, extraction matrix, provenance."""

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth_headers, make_token

from app.models.connector import ConnectorConfig, ConnectorType, ConnectorStatus, SourceAsset
from app.models.connector_depth import (
    ConnectorExtractionMeta,
    ConnectorSyncLog,
    FieldProvenance,
    SyncStatus,
    AutomationLevel,
)
from app.models.data_product import DataProduct, LifecycleStage, PlatformType


# ---------- Helpers ----------

async def seed_connector(db: AsyncSession, org_id: uuid.UUID) -> ConnectorConfig:
    """Create a test connector."""
    connector = ConnectorConfig(
        org_id=org_id,
        name="Test Snowflake",
        connector_type=ConnectorType.snowflake,
        status=ConnectorStatus.connected,
        credentials={},
    )
    db.add(connector)
    await db.flush()
    return connector


async def seed_sync_log(db: AsyncSession, connector_id: uuid.UUID, org_id: uuid.UUID) -> ConnectorSyncLog:
    """Create a test sync log entry."""
    now = datetime.now(timezone.utc)
    log = ConnectorSyncLog(
        connector_id=connector_id,
        org_id=org_id,
        sync_started_at=now,
        sync_ended_at=now,
        status=SyncStatus.success,
        objects_discovered=10,
        objects_updated=3,
        objects_deleted=0,
        usage_events_fetched=100,
        cost_events_fetched=50,
    )
    db.add(log)
    await db.flush()
    return log


async def seed_extraction_meta(db: AsyncSession, connector_id: uuid.UUID, org_id: uuid.UUID) -> ConnectorExtractionMeta:
    """Create a test extraction capability."""
    meta = ConnectorExtractionMeta(
        connector_id=connector_id,
        org_id=org_id,
        capability_category="schema_metadata",
        capability_name="Column-level types",
        is_available=True,
        requires_elevated_access=False,
        extraction_method="INFORMATION_SCHEMA.COLUMNS",
        refresh_frequency="per-sync",
    )
    db.add(meta)
    await db.flush()
    return meta


async def seed_provenance(db: AsyncSession, product_id: uuid.UUID, org_id: uuid.UUID, connector_id: uuid.UUID | None = None) -> FieldProvenance:
    """Create a test field provenance entry."""
    fp = FieldProvenance(
        org_id=org_id,
        data_product_id=product_id,
        field_name="monthly_cost",
        source_connector_id=connector_id,
        source_platform="snowflake",
        extraction_method="WAREHOUSE_METERING_HISTORY",
        automation_level=AutomationLevel.fully_automated,
        confidence=0.95,
    )
    db.add(fp)
    await db.flush()
    return fp


# ---------- Depth Overview ----------

class TestConnectorDepthOverview:
    @pytest.mark.asyncio
    async def test_depth_overview(self, client: AsyncClient, db: AsyncSession, org_and_user, seeded_product):
        org, user, _ = org_and_user
        connector = await seed_connector(db, org.id)
        await seed_extraction_meta(db, connector.id, org.id)
        await seed_sync_log(db, connector.id, org.id)
        await seed_provenance(db, seeded_product.id, org.id, connector.id)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/connector-depth/depth", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert "connectors" in data
        assert isinstance(data["connectors"], list)
        assert len(data["connectors"]) >= 1
        assert "portfolioAutomationCoverage" in data
        assert "totalFieldsTracked" in data

    @pytest.mark.asyncio
    async def test_depth_overview_empty(self, client: AsyncClient, org_and_user):
        """Returns 200 with empty connectors when none exist."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/connector-depth/depth", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert data["connectors"] == []

    @pytest.mark.asyncio
    async def test_depth_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/connector-depth/depth")
        assert res.status_code == 401


# ---------- Sync Log ----------

class TestConnectorSyncLog:
    @pytest.mark.asyncio
    async def test_sync_log(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        connector = await seed_connector(db, org.id)
        await seed_sync_log(db, connector.id, org.id)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(f"/api/v1/connector-depth/{connector.id}/sync-log", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_sync_log_not_found(self, client: AsyncClient, org_and_user):
        """Returns 404 for non-existent connector."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        fake_id = uuid.uuid4()
        res = await client.get(f"/api/v1/connector-depth/{fake_id}/sync-log", headers=auth_headers(token))
        assert res.status_code == 404


# ---------- Extraction Matrix ----------

class TestExtractionMatrix:
    @pytest.mark.asyncio
    async def test_extraction_matrix(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        connector = await seed_connector(db, org.id)
        await seed_extraction_meta(db, connector.id, org.id)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(f"/api/v1/connector-depth/{connector.id}/extraction-matrix", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert "connectorId" in data
        assert "connectorName" in data
        assert "capabilities" in data
        assert len(data["capabilities"]) >= 1
        cap = data["capabilities"][0]
        assert "capabilityCategory" in cap
        assert "capabilityName" in cap
        assert "isAvailable" in cap

    @pytest.mark.asyncio
    async def test_extraction_matrix_not_found(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        fake_id = uuid.uuid4()
        res = await client.get(f"/api/v1/connector-depth/{fake_id}/extraction-matrix", headers=auth_headers(token))
        assert res.status_code == 404


# ---------- Automation Summary ----------

class TestAutomationSummary:
    @pytest.mark.asyncio
    async def test_automation_summary(self, client: AsyncClient, db: AsyncSession, org_and_user, seeded_product):
        org, user, _ = org_and_user
        connector = await seed_connector(db, org.id)
        await seed_provenance(db, seeded_product.id, org.id, connector.id)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/connector-depth/automation-summary", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert "fullyAutomated" in data
        assert "semiAutomated" in data
        assert "manual" in data
        assert "total" in data
        assert "coveragePct" in data
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_automation_summary_empty(self, client: AsyncClient, org_and_user):
        """Returns valid response with zeroes when no provenance exists."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/connector-depth/automation-summary", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0


# ---------- Asset Provenance ----------

class TestAssetProvenance:
    @pytest.mark.asyncio
    async def test_asset_provenance(self, client: AsyncClient, db: AsyncSession, org_and_user, seeded_product):
        org, user, _ = org_and_user
        connector = await seed_connector(db, org.id)
        await seed_provenance(db, seeded_product.id, org.id, connector.id)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/connector-depth/assets/{seeded_product.id}/provenance",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert "productId" in data
        assert "productName" in data
        assert "fields" in data
        assert "automationCoverage" in data
        assert len(data["fields"]) >= 1

        field = data["fields"][0]
        assert "fieldName" in field
        assert "sourcePlatform" in field
        assert "extractionMethod" in field
        assert "automationLevel" in field
        assert "confidence" in field

    @pytest.mark.asyncio
    async def test_asset_provenance_not_found(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        fake_id = uuid.uuid4()
        res = await client.get(f"/api/v1/connector-depth/assets/{fake_id}/provenance", headers=auth_headers(token))
        assert res.status_code == 404
