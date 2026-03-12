"""Lineage Center routes — nodes, edges, graph traversal, manual creation."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.deps import get_current_org_id, require_permission
from app.models.user import User
from app.models.lineage import (
    LineageNode,
    LineageEdge,
    LineageNodeType,
    LineageEdgeType,
    LineageProvenance,
)
from app.schemas.lineage import (
    LineageNodeResponse,
    LineageNodeCreate,
    LineageNodeSearchResponse,
    LineageEdgeResponse,
    LineageEdgeCreate,
    LineageGraphNode,
    LineageGraphEdge,
    LineageGraphResponse,
    LineageNodeDetail,
)

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node_to_response(n: LineageNode) -> LineageNodeResponse:
    return LineageNodeResponse(
        id=str(n.id),
        node_type=n.node_type.value,
        name=n.name,
        qualified_name=n.qualified_name,
        platform=n.platform,
        domain=n.domain,
        owner_user_id=str(n.owner_user_id) if n.owner_user_id else None,
        tags=n.tags if isinstance(n.tags, list) else [],
        provenance=n.provenance.value,
        confidence=float(n.confidence),
        data_product_id=str(n.data_product_id) if n.data_product_id else None,
        source_asset_id=str(n.source_asset_id) if n.source_asset_id else None,
        metadata=n.metadata_json or {},
        last_synced_at=n.last_synced_at,
        created_at=n.created_at,
    )


def _edge_to_response(e: LineageEdge) -> LineageEdgeResponse:
    return LineageEdgeResponse(
        id=str(e.id),
        from_node_id=str(e.from_node_id),
        to_node_id=str(e.to_node_id),
        edge_type=e.edge_type.value,
        platform=e.platform,
        provenance=e.provenance.value,
        confidence=float(e.confidence),
        metadata=e.metadata_json or {},
        created_at=e.created_at,
    )


# ---------------------------------------------------------------------------
# GET /lineage/nodes — Search / list nodes
# ---------------------------------------------------------------------------

@router.get("/nodes", response_model=LineageNodeSearchResponse)
async def search_lineage_nodes(
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:read")),
    q: str | None = Query(None, description="Search by name or qualified_name"),
    node_type: str | None = Query(None, description="Filter by node type"),
    platform: str | None = Query(None, description="Filter by platform"),
    domain: str | None = Query(None, description="Filter by domain"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> LineageNodeSearchResponse:
    """Search lineage nodes with optional filters."""

    stmt = select(LineageNode).where(LineageNode.org_id == org_id)

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                LineageNode.name.ilike(pattern),
                LineageNode.qualified_name.ilike(pattern),
            )
        )
    if node_type:
        stmt = stmt.where(LineageNode.node_type == node_type)
    if platform:
        stmt = stmt.where(LineageNode.platform == platform)
    if domain:
        stmt = stmt.where(LineageNode.domain == domain)

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    # Paginated results
    result = await db.execute(
        stmt.order_by(LineageNode.name).offset(offset).limit(limit)
    )
    nodes = result.scalars().all()

    return LineageNodeSearchResponse(
        items=[_node_to_response(n) for n in nodes],
        total=total,
    )


# ---------------------------------------------------------------------------
# GET /lineage/node/{id} — Node detail with upstream/downstream
# ---------------------------------------------------------------------------

@router.get("/node/{node_id}", response_model=LineageNodeDetail)
async def get_lineage_node(
    node_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:read")),
) -> LineageNodeDetail:
    """Get a single lineage node with upstream/downstream edge info."""

    node = await db.get(LineageNode, node_id)
    if not node or node.org_id != org_id:
        raise HTTPException(status_code=404, detail="Lineage node not found")

    # Upstream edges (edges where this node is the target)
    up_result = await db.execute(
        select(LineageEdge).where(
            LineageEdge.to_node_id == node_id,
            LineageEdge.org_id == org_id,
        )
    )
    upstream_edges = up_result.scalars().all()

    # Downstream edges (edges where this node is the source)
    down_result = await db.execute(
        select(LineageEdge).where(
            LineageEdge.from_node_id == node_id,
            LineageEdge.org_id == org_id,
        )
    )
    downstream_edges = down_result.scalars().all()

    return LineageNodeDetail(
        node=_node_to_response(node),
        upstream_count=len(upstream_edges),
        downstream_count=len(downstream_edges),
        upstream_edges=[_edge_to_response(e) for e in upstream_edges],
        downstream_edges=[_edge_to_response(e) for e in downstream_edges],
    )


# ---------------------------------------------------------------------------
# GET /lineage/graph — Graph traversal (BFS from a root node)
# ---------------------------------------------------------------------------

@router.get("/graph", response_model=LineageGraphResponse)
async def get_lineage_graph(
    db: DbSession,
    org_id: OrgId,
    root_node_id: uuid.UUID = Query(..., description="Root node to start traversal from"),
    direction: str = Query("both", description="upstream | downstream | both"),
    depth: int = Query(3, ge=1, le=10, description="Max traversal depth"),
    _user: User = Depends(require_permission("connectors:read")),
) -> LineageGraphResponse:
    """BFS graph traversal from a root node. Returns subgraph of nodes + edges."""

    # Verify root node exists in this org
    root = await db.get(LineageNode, root_node_id)
    if not root or root.org_id != org_id:
        raise HTTPException(status_code=404, detail="Root node not found")

    # BFS traversal
    visited_node_ids: set[uuid.UUID] = {root_node_id}
    collected_edges: list[LineageEdge] = []
    frontier: set[uuid.UUID] = {root_node_id}

    for _ in range(depth):
        if not frontier:
            break
        next_frontier: set[uuid.UUID] = set()

        # Upstream: edges pointing TO nodes in frontier
        if direction in ("upstream", "both"):
            result = await db.execute(
                select(LineageEdge).where(
                    LineageEdge.to_node_id.in_(frontier),
                    LineageEdge.org_id == org_id,
                )
            )
            for edge in result.scalars().all():
                collected_edges.append(edge)
                if edge.from_node_id not in visited_node_ids:
                    visited_node_ids.add(edge.from_node_id)
                    next_frontier.add(edge.from_node_id)

        # Downstream: edges pointing FROM nodes in frontier
        if direction in ("downstream", "both"):
            result = await db.execute(
                select(LineageEdge).where(
                    LineageEdge.from_node_id.in_(frontier),
                    LineageEdge.org_id == org_id,
                )
            )
            for edge in result.scalars().all():
                collected_edges.append(edge)
                if edge.to_node_id not in visited_node_ids:
                    visited_node_ids.add(edge.to_node_id)
                    next_frontier.add(edge.to_node_id)

        frontier = next_frontier

    # Load all visited nodes
    if visited_node_ids:
        node_result = await db.execute(
            select(LineageNode).where(LineageNode.id.in_(visited_node_ids))
        )
        all_nodes = node_result.scalars().all()
    else:
        all_nodes = [root]

    # Deduplicate edges
    seen_edge_ids: set[uuid.UUID] = set()
    unique_edges: list[LineageEdge] = []
    for e in collected_edges:
        if e.id not in seen_edge_ids:
            seen_edge_ids.add(e.id)
            unique_edges.append(e)

    return LineageGraphResponse(
        root_node_id=str(root_node_id),
        nodes=[
            LineageGraphNode(
                id=str(n.id),
                node_type=n.node_type.value,
                name=n.name,
                qualified_name=n.qualified_name,
                platform=n.platform,
                domain=n.domain,
                data_product_id=str(n.data_product_id) if n.data_product_id else None,
            )
            for n in all_nodes
        ],
        edges=[
            LineageGraphEdge(
                id=str(e.id),
                from_node_id=str(e.from_node_id),
                to_node_id=str(e.to_node_id),
                edge_type=e.edge_type.value,
                provenance=e.provenance.value,
                confidence=float(e.confidence),
            )
            for e in unique_edges
        ],
        depth=depth,
        direction=direction,
    )


# ---------------------------------------------------------------------------
# POST /lineage/edges/manual — Create a manual edge
# ---------------------------------------------------------------------------

@router.post("/edges/manual", response_model=LineageEdgeResponse, status_code=201)
async def create_manual_edge(
    body: LineageEdgeCreate,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:write")),
) -> LineageEdgeResponse:
    """Create a manual lineage edge between two existing nodes."""

    # Validate both nodes exist and belong to this org
    from_node = await db.get(LineageNode, uuid.UUID(body.from_node_id))
    if not from_node or from_node.org_id != org_id:
        raise HTTPException(status_code=404, detail="From node not found")
    to_node = await db.get(LineageNode, uuid.UUID(body.to_node_id))
    if not to_node or to_node.org_id != org_id:
        raise HTTPException(status_code=404, detail="To node not found")

    # Validate edge type
    try:
        edge_type = LineageEdgeType(body.edge_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid edge type: {body.edge_type}")

    edge = LineageEdge(
        org_id=org_id,
        from_node_id=from_node.id,
        to_node_id=to_node.id,
        edge_type=edge_type,
        platform=body.platform,
        provenance=LineageProvenance.manual,
        confidence=1.0,
        metadata_json=body.metadata or {},
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)

    return _edge_to_response(edge)


# ---------------------------------------------------------------------------
# POST /lineage/nodes/manual — Create a manual node
# ---------------------------------------------------------------------------

@router.post("/nodes/manual", response_model=LineageNodeResponse, status_code=201)
async def create_manual_node(
    body: LineageNodeCreate,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("connectors:write")),
) -> LineageNodeResponse:
    """Create a manual lineage node."""

    # Validate node type
    try:
        node_type = LineageNodeType(body.node_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid node type: {body.node_type}")

    node = LineageNode(
        org_id=org_id,
        node_type=node_type,
        name=body.name,
        qualified_name=body.qualified_name,
        platform=body.platform,
        domain=body.domain,
        tags=body.tags or [],
        provenance=LineageProvenance.manual,
        confidence=1.0,
        data_product_id=uuid.UUID(body.data_product_id) if body.data_product_id else None,
        source_asset_id=uuid.UUID(body.source_asset_id) if body.source_asset_id else None,
        metadata_json=body.metadata or {},
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)

    return _node_to_response(node)
