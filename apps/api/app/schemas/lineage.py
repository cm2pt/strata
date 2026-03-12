"""Pydantic schemas for lineage endpoints — nodes, edges, graph traversal."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import CamelModel


# ---------------------------------------------------------------------------
# Shared value types
# ---------------------------------------------------------------------------

LineageNodeTypeStr = str  # one of the LineageNodeType enum values
LineageEdgeTypeStr = str  # one of the LineageEdgeType enum values
LineageProvenanceStr = str  # automated | inferred | manual


# ---------------------------------------------------------------------------
# Node schemas
# ---------------------------------------------------------------------------

class LineageNodeResponse(CamelModel):
    id: str
    node_type: LineageNodeTypeStr
    name: str
    qualified_name: str
    platform: str
    domain: str | None = None
    owner_user_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    provenance: LineageProvenanceStr = "automated"
    confidence: float = 1.0
    data_product_id: str | None = None
    source_asset_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict, alias="metadata")
    last_synced_at: datetime | None = None
    created_at: datetime | None = None


class LineageNodeCreate(CamelModel):
    """Body for POST /lineage/nodes/manual."""
    node_type: LineageNodeTypeStr
    name: str
    qualified_name: str
    platform: str
    domain: str | None = None
    tags: list[str] = Field(default_factory=list)
    data_product_id: str | None = None
    source_asset_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict, alias="metadata")


class LineageNodeSearchResponse(CamelModel):
    items: list[LineageNodeResponse]
    total: int


# ---------------------------------------------------------------------------
# Edge schemas
# ---------------------------------------------------------------------------

class LineageEdgeResponse(CamelModel):
    id: str
    from_node_id: str
    to_node_id: str
    edge_type: LineageEdgeTypeStr
    platform: str | None = None
    provenance: LineageProvenanceStr = "automated"
    confidence: float = 1.0
    metadata: dict[str, Any] = Field(default_factory=dict, alias="metadata")
    created_at: datetime | None = None


class LineageEdgeCreate(CamelModel):
    """Body for POST /lineage/edges/manual."""
    from_node_id: str
    to_node_id: str
    edge_type: LineageEdgeTypeStr
    platform: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict, alias="metadata")


# ---------------------------------------------------------------------------
# Graph traversal schemas
# ---------------------------------------------------------------------------

class LineageGraphNode(CamelModel):
    """Minimal node for graph rendering (lighter than full NodeResponse)."""
    id: str
    node_type: LineageNodeTypeStr
    name: str
    qualified_name: str
    platform: str
    domain: str | None = None
    data_product_id: str | None = None


class LineageGraphEdge(CamelModel):
    """Minimal edge for graph rendering."""
    id: str
    from_node_id: str
    to_node_id: str
    edge_type: LineageEdgeTypeStr
    provenance: LineageProvenanceStr = "automated"
    confidence: float = 1.0


class LineageGraphResponse(CamelModel):
    """Full graph subgraph response for visualization."""
    root_node_id: str
    nodes: list[LineageGraphNode]
    edges: list[LineageGraphEdge]
    depth: int
    direction: str  # "upstream" | "downstream" | "both"


# ---------------------------------------------------------------------------
# Node detail (enriched) schema
# ---------------------------------------------------------------------------

class LineageNodeDetail(CamelModel):
    """Full node detail with upstream/downstream counts."""
    node: LineageNodeResponse
    upstream_count: int = 0
    downstream_count: int = 0
    upstream_edges: list[LineageEdgeResponse] = Field(default_factory=list)
    downstream_edges: list[LineageEdgeResponse] = Field(default_factory=list)
