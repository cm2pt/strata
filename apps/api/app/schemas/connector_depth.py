"""Pydantic schemas for connector depth, sync logs, provenance, and extraction matrix."""

import uuid
from datetime import datetime

from app.schemas.common import CamelModel


# ---------------------------------------------------------------------------
# Sync Log
# ---------------------------------------------------------------------------

class SyncLogResponse(CamelModel):
    id: uuid.UUID
    connector_id: uuid.UUID
    sync_started_at: datetime
    sync_ended_at: datetime | None = None
    status: str
    objects_discovered: int = 0
    objects_updated: int = 0
    objects_deleted: int = 0
    usage_events_fetched: int = 0
    cost_events_fetched: int = 0
    duration_seconds: float = 0
    errors: list | None = None
    diff_summary: dict | None = None


class SyncLogListResponse(CamelModel):
    items: list[SyncLogResponse] = []
    total: int = 0


# ---------------------------------------------------------------------------
# Field Provenance
# ---------------------------------------------------------------------------

class FieldProvenanceResponse(CamelModel):
    field_name: str
    source_platform: str
    extraction_method: str
    automation_level: str  # fully_automated | semi_automated | manual
    confidence: float = 1.0
    last_observed_at: datetime | None = None
    observation_count: int = 1


class AssetProvenanceResponse(CamelModel):
    product_id: str
    product_name: str
    fields: list[FieldProvenanceResponse] = []
    automation_coverage: float = 0.0


# ---------------------------------------------------------------------------
# Extraction Matrix
# ---------------------------------------------------------------------------

class ExtractionCapability(CamelModel):
    capability_category: str
    capability_name: str
    is_available: bool = True
    requires_elevated_access: bool = False
    extraction_method: str = ""
    refresh_frequency: str = "per-sync"


class ExtractionMatrixResponse(CamelModel):
    connector_id: str
    connector_name: str
    platform: str
    capabilities: list[ExtractionCapability] = []


# ---------------------------------------------------------------------------
# Connector Depth Overview
# ---------------------------------------------------------------------------

class ConnectorDepthSummary(CamelModel):
    connector_id: str
    connector_name: str
    platform: str
    total_capabilities: int = 0
    available_capabilities: int = 0
    coverage_pct: float = 0.0
    last_sync_at: str | None = None
    sync_status: str = "unknown"
    objects_managed: int = 0
    automation_coverage: float = 0.0


class ConnectorDepthOverview(CamelModel):
    connectors: list[ConnectorDepthSummary] = []
    portfolio_automation_coverage: float = 0.0
    total_fields_tracked: int = 0
    fully_automated_pct: float = 0.0
    semi_automated_pct: float = 0.0
    manual_pct: float = 0.0


# ---------------------------------------------------------------------------
# Automation Summary
# ---------------------------------------------------------------------------

class AutomationSummaryResponse(CamelModel):
    fully_automated: int = 0
    semi_automated: int = 0
    manual: int = 0
    total: int = 0
    coverage_pct: float = 0.0
