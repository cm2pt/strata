"""Tests for the /lineage router — nodes, edges, graph traversal, manual creation."""

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth_headers, make_token

from app.models.lineage import (
    LineageEdge,
    LineageEdgeType,
    LineageNode,
    LineageNodeType,
    LineageProvenance,
)


# ---------- Helpers ----------

async def seed_lineage_node(
    db: AsyncSession,
    org_id: uuid.UUID,
    name: str = "DIM_CUSTOMER",
    qualified_name: str | None = None,
    node_type: LineageNodeType = LineageNodeType.table,
    platform: str = "snowflake",
    domain: str = "analytics",
) -> LineageNode:
    """Create a test lineage node."""
    node = LineageNode(
        org_id=org_id,
        node_type=node_type,
        name=name,
        qualified_name=qualified_name or f"snowflake://ANALYTICS.GOLD.{name}_{uuid.uuid4().hex[:8]}",
        platform=platform,
        domain=domain,
        provenance=LineageProvenance.automated,
        confidence=1.0,
        tags=["test"],
        metadata_json={},
    )
    db.add(node)
    await db.flush()
    return node


async def seed_lineage_edge(
    db: AsyncSession,
    org_id: uuid.UUID,
    from_node_id: uuid.UUID,
    to_node_id: uuid.UUID,
    edge_type: LineageEdgeType = LineageEdgeType.physical_lineage,
) -> LineageEdge:
    """Create a test lineage edge."""
    edge = LineageEdge(
        org_id=org_id,
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        edge_type=edge_type,
        platform="snowflake",
        provenance=LineageProvenance.automated,
        confidence=1.0,
        metadata_json={},
    )
    db.add(edge)
    await db.flush()
    return edge


# ---------- Node Search ----------

class TestLineageNodeSearch:
    @pytest.mark.asyncio
    async def test_search_nodes(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        await seed_lineage_node(db, org.id, name="DIM_CUSTOMER")
        await seed_lineage_node(db, org.id, name="FACT_TRANSACTION", node_type=LineageNodeType.table)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/lineage/nodes", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 2
        assert len(data["items"]) >= 2

    @pytest.mark.asyncio
    async def test_search_nodes_with_filter(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        await seed_lineage_node(db, org.id, name="DIM_CUSTOMER", node_type=LineageNodeType.table)
        await seed_lineage_node(db, org.id, name="Revenue Dashboard", node_type=LineageNodeType.dashboard, platform="power_bi")
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(
            "/api/v1/lineage/nodes?node_type=dashboard",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["nodeType"] == "dashboard"

    @pytest.mark.asyncio
    async def test_search_nodes_with_query(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        await seed_lineage_node(db, org.id, name="DIM_CUSTOMER")
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(
            "/api/v1/lineage/nodes?q=CUSTOMER",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_search_nodes_empty(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/lineage/nodes", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_search_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/lineage/nodes")
        assert res.status_code == 401


# ---------- Node Detail ----------

class TestLineageNodeDetail:
    @pytest.mark.asyncio
    async def test_node_detail(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        node = await seed_lineage_node(db, org.id)
        upstream_node = await seed_lineage_node(db, org.id, name="RAW_DATA", node_type=LineageNodeType.table)
        downstream_node = await seed_lineage_node(db, org.id, name="DASHBOARD", node_type=LineageNodeType.dashboard)
        await seed_lineage_edge(db, org.id, upstream_node.id, node.id, LineageEdgeType.transformation)
        await seed_lineage_edge(db, org.id, node.id, downstream_node.id, LineageEdgeType.consumption)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(f"/api/v1/lineage/node/{node.id}", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert "node" in data
        assert data["node"]["name"] == "DIM_CUSTOMER"
        assert data["upstreamCount"] == 1
        assert data["downstreamCount"] == 1
        assert len(data["upstreamEdges"]) == 1
        assert len(data["downstreamEdges"]) == 1

    @pytest.mark.asyncio
    async def test_node_detail_not_found(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        fake_id = uuid.uuid4()
        res = await client.get(f"/api/v1/lineage/node/{fake_id}", headers=auth_headers(token))
        assert res.status_code == 404


# ---------- Graph Traversal ----------

class TestLineageGraph:
    @pytest.mark.asyncio
    async def test_graph_traversal(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        # Create a chain: A -> B -> C
        node_a = await seed_lineage_node(db, org.id, name="SOURCE_TABLE")
        node_b = await seed_lineage_node(db, org.id, name="TRANSFORM_MODEL")
        node_c = await seed_lineage_node(db, org.id, name="DASHBOARD")
        await seed_lineage_edge(db, org.id, node_a.id, node_b.id, LineageEdgeType.transformation)
        await seed_lineage_edge(db, org.id, node_b.id, node_c.id, LineageEdgeType.consumption)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/lineage/graph?root_node_id={node_b.id}&direction=both&depth=2",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["rootNodeId"] == str(node_b.id)
        assert len(data["nodes"]) == 3
        assert len(data["edges"]) == 2
        assert data["depth"] == 2
        assert data["direction"] == "both"

    @pytest.mark.asyncio
    async def test_graph_downstream_only(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        node_a = await seed_lineage_node(db, org.id, name="ROOT")
        node_b = await seed_lineage_node(db, org.id, name="CHILD")
        await seed_lineage_edge(db, org.id, node_a.id, node_b.id)
        await db.commit()

        token = make_token(user.id, org.id)
        res = await client.get(
            f"/api/v1/lineage/graph?root_node_id={node_a.id}&direction=downstream&depth=1",
            headers=auth_headers(token),
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["nodes"]) == 2
        assert len(data["edges"]) == 1

    @pytest.mark.asyncio
    async def test_graph_root_not_found(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        fake_id = uuid.uuid4()
        res = await client.get(
            f"/api/v1/lineage/graph?root_node_id={fake_id}&direction=both&depth=2",
            headers=auth_headers(token),
        )
        assert res.status_code == 404


# ---------- Manual Edge Creation ----------

class TestManualEdge:
    @pytest.mark.asyncio
    async def test_create_manual_edge(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        node_a = await seed_lineage_node(db, org.id, name="SOURCE")
        node_b = await seed_lineage_node(db, org.id, name="TARGET")
        await db.commit()

        token = make_token(user.id, org.id)
        body = {
            "fromNodeId": str(node_a.id),
            "toNodeId": str(node_b.id),
            "edgeType": "transformation",
        }
        res = await client.post("/api/v1/lineage/edges/manual", json=body, headers=auth_headers(token))
        assert res.status_code == 201
        data = res.json()
        assert data["fromNodeId"] == str(node_a.id)
        assert data["toNodeId"] == str(node_b.id)
        assert data["edgeType"] == "transformation"
        assert data["provenance"] == "manual"

    @pytest.mark.asyncio
    async def test_create_edge_invalid_node(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        body = {
            "fromNodeId": str(uuid.uuid4()),
            "toNodeId": str(uuid.uuid4()),
            "edgeType": "transformation",
        }
        res = await client.post("/api/v1/lineage/edges/manual", json=body, headers=auth_headers(token))
        assert res.status_code == 404


# ---------- Manual Node Creation ----------

class TestManualNode:
    @pytest.mark.asyncio
    async def test_create_manual_node(self, client: AsyncClient, db: AsyncSession, org_and_user):
        org, user, _ = org_and_user
        await db.commit()

        token = make_token(user.id, org.id)
        body = {
            "nodeType": "dashboard",
            "name": "My Custom Dashboard",
            "qualifiedName": f"dashboard://custom/my_custom_dashboard_{uuid.uuid4().hex[:8]}",
            "platform": "power_bi",
        }
        res = await client.post("/api/v1/lineage/nodes/manual", json=body, headers=auth_headers(token))
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "My Custom Dashboard"
        assert data["nodeType"] == "dashboard"
        assert data["platform"] == "power_bi"
        assert data["provenance"] == "manual"

    @pytest.mark.asyncio
    async def test_create_node_invalid_type(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        body = {
            "nodeType": "invalid_type",
            "name": "Bad Node",
            "qualifiedName": "bad://node",
            "platform": "unknown",
        }
        res = await client.post("/api/v1/lineage/nodes/manual", json=body, headers=auth_headers(token))
        assert res.status_code == 400
