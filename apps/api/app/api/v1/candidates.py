"""Candidate routes — list, detail, promote, ignore, ingest + generate."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_org_id, get_current_user, require_permission
from app.config import settings
from app.models.candidate import (
    CandidateMember,
    CandidateStatus,
    CandidateType,
    ProductCandidate,
)
from app.models.connector import (
    ConnectorConfig,
    SourceAsset as SourceAssetModel,
    UsageEvent as UsageEventModel,
    CostEvent as CostEventModel,
)
from app.models.data_product import DataProduct, LifecycleStage, PlatformType
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.connector import AssetMapping
from app.models.user import User

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]
OrgId = Annotated[uuid.UUID, Depends(get_current_org_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class SourceAssetResponse(BaseModel):
    id: uuid.UUID
    external_id: str = Field(serialization_alias="externalId")
    asset_name: str = Field(serialization_alias="assetName")
    asset_type: str | None = Field(None, serialization_alias="assetType")
    platform: str | None = None
    qualified_name: str | None = Field(None, serialization_alias="qualifiedName")
    display_name: str | None = Field(None, serialization_alias="displayName")
    owner_hint: str | None = Field(None, serialization_alias="ownerHint")
    tags: list[str] = []
    role: str | None = None
    inclusion_reason: str | None = Field(None, serialization_alias="inclusionReason")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CandidateListItem(BaseModel):
    id: uuid.UUID
    candidate_type: str = Field(serialization_alias="candidateType")
    name_suggested: str = Field(serialization_alias="nameSuggested")
    domain_suggested: str | None = Field(None, serialization_alias="domainSuggested")
    owner_suggested: str | None = Field(None, serialization_alias="ownerSuggested")
    confidence_score: int = Field(serialization_alias="confidenceScore")
    status: str
    monthly_cost_estimate: float = Field(serialization_alias="monthlyCostEstimate")
    monthly_consumers: int = Field(serialization_alias="monthlyConsumers")
    source_count: int = Field(serialization_alias="sourceCount")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CandidateDetail(BaseModel):
    id: uuid.UUID
    candidate_type: str = Field(serialization_alias="candidateType")
    name_suggested: str = Field(serialization_alias="nameSuggested")
    domain_suggested: str | None = Field(None, serialization_alias="domainSuggested")
    owner_suggested: str | None = Field(None, serialization_alias="ownerSuggested")
    confidence_score: int = Field(serialization_alias="confidenceScore")
    confidence_breakdown: dict = Field(serialization_alias="confidenceBreakdown")
    evidence: dict = {}
    status: str
    monthly_cost_estimate: float = Field(serialization_alias="monthlyCostEstimate")
    monthly_consumers: int = Field(serialization_alias="monthlyConsumers")
    consumer_teams: list[dict] = Field(serialization_alias="consumerTeams")
    cost_coverage_pct: float = Field(serialization_alias="costCoveragePct")
    source_count: int = Field(serialization_alias="sourceCount")
    members: list[SourceAssetResponse] = []
    promoted_product_id: uuid.UUID | None = Field(None, serialization_alias="promotedProductId")
    ignored_reason: str | None = Field(None, serialization_alias="ignoredReason")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class PromoteRequest(BaseModel):
    name: str
    domain: str
    business_unit: str = Field(alias="businessUnit")
    platform: str = "snowflake"
    owner_id: uuid.UUID = Field(alias="ownerId")

    model_config = {"populate_by_name": True}


class IgnoreRequest(BaseModel):
    reason: str | None = None


class IngestResponse(BaseModel):
    assets_discovered: int = Field(serialization_alias="assetsDiscovered")
    edges_created: int = Field(serialization_alias="edgesCreated")
    usage_events: int = Field(serialization_alias="usageEvents")
    cost_events: int = Field(serialization_alias="costEvents")
    candidates_generated: int = Field(serialization_alias="candidatesGenerated")
    message: str

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[CandidateListItem])
async def list_candidates(
    db: DbSession,
    org_id: OrgId,
    status_filter: str | None = Query(None, alias="status"),
    sort_by: str = Query("confidence", alias="sortBy"),
    _user: User = Depends(require_permission("candidates:read")),
):
    """List all product candidates for the org."""
    q = select(ProductCandidate).where(ProductCandidate.org_id == org_id)

    if status_filter:
        q = q.where(ProductCandidate.status == status_filter)

    if sort_by == "confidence":
        q = q.order_by(ProductCandidate.confidence_score.desc())
    elif sort_by == "newest":
        q = q.order_by(ProductCandidate.created_at.desc())
    elif sort_by == "cost":
        q = q.order_by(ProductCandidate.monthly_cost_estimate.desc())
    else:
        q = q.order_by(ProductCandidate.confidence_score.desc())

    result = await db.execute(q)
    candidates = result.scalars().all()
    return [_to_list_item(c) for c in candidates]


@router.get("/{candidate_id}", response_model=CandidateDetail)
async def get_candidate(
    candidate_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    _user: User = Depends(require_permission("candidates:read")),
):
    """Get detailed candidate info including member assets."""
    result = await db.execute(
        select(ProductCandidate)
        .options(selectinload(ProductCandidate.members))
        .where(
            ProductCandidate.id == candidate_id,
            ProductCandidate.org_id == org_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Load member source assets
    member_responses = []
    for m in candidate.members:
        sa = await db.get(SourceAssetModel, m.source_asset_id)
        if sa:
            member_responses.append(SourceAssetResponse(
                id=sa.id,
                external_id=sa.external_id,
                asset_name=sa.asset_name,
                asset_type=sa.asset_type,
                platform=sa.platform,
                qualified_name=sa.qualified_name,
                display_name=sa.display_name,
                owner_hint=sa.owner_hint,
                tags=sa.tags_json if isinstance(sa.tags_json, list) else [],
                role=m.role,
                inclusion_reason=m.inclusion_reason,
            ))

    return CandidateDetail(
        id=candidate.id,
        candidate_type=candidate.candidate_type.value,
        name_suggested=candidate.name_suggested,
        domain_suggested=candidate.domain_suggested,
        owner_suggested=candidate.owner_suggested,
        confidence_score=candidate.confidence_score,
        confidence_breakdown=candidate.confidence_breakdown_json or {},
        evidence=candidate.evidence_json or {},
        status=candidate.status.value,
        monthly_cost_estimate=float(candidate.monthly_cost_estimate or 0),
        monthly_consumers=candidate.monthly_consumers or 0,
        consumer_teams=candidate.consumer_teams_json if isinstance(candidate.consumer_teams_json, list) else [],
        cost_coverage_pct=float(candidate.cost_coverage_pct or 0),
        source_count=candidate.source_count or 0,
        members=member_responses,
        promoted_product_id=candidate.promoted_product_id,
        ignored_reason=candidate.ignored_reason,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
    )


@router.post("/{candidate_id}/promote")
async def promote_candidate(
    candidate_id: uuid.UUID,
    body: PromoteRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("candidates:promote")),
):
    """Promote a candidate to a real Data Product."""
    result = await db.execute(
        select(ProductCandidate)
        .options(selectinload(ProductCandidate.members))
        .where(
            ProductCandidate.id == candidate_id,
            ProductCandidate.org_id == org_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status == CandidateStatus.promoted:
        raise HTTPException(status_code=400, detail="Candidate already promoted")

    # Map platform string to PlatformType
    try:
        platform = PlatformType(body.platform)
    except ValueError:
        platform = PlatformType.snowflake

    # Create the Data Product
    product = DataProduct(
        org_id=org_id,
        owner_id=body.owner_id,
        name=body.name,
        domain=body.domain,
        business_unit=body.business_unit,
        platform=platform,
        lifecycle_stage=LifecycleStage.draft,
        monthly_cost=float(candidate.monthly_cost_estimate or 0),
        monthly_consumers=candidate.monthly_consumers or 0,
    )
    db.add(product)
    await db.flush()

    # Create asset mappings from candidate members
    for m in candidate.members:
        db.add(AssetMapping(
            source_asset_id=m.source_asset_id,
            data_product_id=product.id,
            mapping_type="primary" if m.role == "primary" else "derived",
            mapping_role=m.role,
        ))

    # Create a decision record
    decision = Decision(
        org_id=org_id,
        type=DecisionType.portfolio_change,
        status=DecisionStatus.approved,
        product_id=product.id,
        product_name=body.name,
        title=f"Promoted candidate '{candidate.name_suggested}' to Data Product",
        description=(
            f"Candidate '{candidate.name_suggested}' (confidence: {candidate.confidence_score}%) "
            f"was promoted to Data Product '{body.name}' with {candidate.source_count} source assets."
        ),
        initiated_by=user.name,
        assigned_to=user.name,
        estimated_impact=float(candidate.monthly_cost_estimate or 0) * 12,
        resolved_at=datetime.now(timezone.utc),
    )
    db.add(decision)

    # Update candidate status
    candidate.status = CandidateStatus.promoted
    candidate.promoted_product_id = product.id

    await db.commit()

    return {
        "productId": str(product.id),
        "decisionId": str(decision.id),
        "message": f"Successfully promoted to Data Product: {body.name}",
    }


@router.post("/{candidate_id}/ignore")
async def ignore_candidate(
    candidate_id: uuid.UUID,
    body: IgnoreRequest,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("candidates:ignore")),
):
    """Ignore (dismiss) a candidate."""
    result = await db.execute(
        select(ProductCandidate).where(
            ProductCandidate.id == candidate_id,
            ProductCandidate.org_id == org_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.status = CandidateStatus.ignored
    candidate.ignored_reason = body.reason
    candidate.ignored_by = user.name
    candidate.ignored_at = datetime.now(timezone.utc)

    await db.commit()
    return {"message": "Candidate ignored", "candidateId": str(candidate_id)}


@router.post("/{candidate_id}/flag-retirement")
async def flag_for_retirement(
    candidate_id: uuid.UUID,
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("decisions:create")),
):
    """Flag a low-confidence candidate for retirement review.

    Creates a deprecated DataProduct from the candidate, then creates
    a retirement decision (under_review) so the team can approve the
    retirement and trigger the capital-freed event.
    """
    result = await db.execute(
        select(ProductCandidate)
        .options(selectinload(ProductCandidate.members))
        .where(
            ProductCandidate.id == candidate_id,
            ProductCandidate.org_id == org_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.status == CandidateStatus.promoted:
        raise HTTPException(status_code=400, detail="Candidate already promoted")

    monthly_cost = float(candidate.monthly_cost_estimate or 0)

    # Create a DataProduct in deprecated stage so the retirement decision has a target
    product = DataProduct(
        org_id=org_id,
        owner_id=user.id,
        name=candidate.name_suggested,
        domain=candidate.domain_suggested or "General",
        business_unit="Data Platform",
        platform=PlatformType.snowflake,
        lifecycle_stage=LifecycleStage.deprecated,
        monthly_cost=monthly_cost,
        monthly_consumers=candidate.monthly_consumers or 0,
    )
    db.add(product)
    await db.flush()

    # Create asset mappings
    for m in candidate.members:
        db.add(AssetMapping(
            source_asset_id=m.source_asset_id,
            data_product_id=product.id,
            mapping_type="primary" if m.role == "primary" else "derived",
            mapping_role=m.role,
        ))

    # Create a retirement decision (under_review)
    decision = Decision(
        org_id=org_id,
        type=DecisionType.retirement,
        status=DecisionStatus.under_review,
        product_id=product.id,
        product_name=candidate.name_suggested,
        title=f"Retire '{candidate.name_suggested}' — low confidence ({candidate.confidence_score}%)",
        description=(
            f"Candidate '{candidate.name_suggested}' flagged for retirement. "
            f"Confidence: {candidate.confidence_score}%. "
            f"Estimated monthly cost: ${monthly_cost:,.2f}. "
            f"Approval will retire the product and free ${monthly_cost:,.2f}/mo in capital."
        ),
        initiated_by=user.name,
        assigned_to=user.name,
        estimated_impact=monthly_cost,
        projected_savings_monthly=monthly_cost,
        projected_savings_annual=monthly_cost * 12,
    )
    db.add(decision)

    # Update candidate status
    candidate.status = CandidateStatus.promoted
    candidate.promoted_product_id = product.id

    await db.commit()

    return {
        "productId": str(product.id),
        "decisionId": str(decision.id),
        "message": f"Retirement review created for '{candidate.name_suggested}'",
    }


@router.post("/ingest", response_model=IngestResponse)
async def ingest_and_generate(
    db: DbSession,
    org_id: OrgId,
    user: User = Depends(require_permission("connectors:run")),
):
    """Run the full discovery pipeline: ingest from demo packs → generate candidates.

    This endpoint:
    1. Finds or creates a discovery_replay connector for the org
    2. Runs the connector to ingest assets, edges, usage, and cost events
    3. Runs the candidate generation engine
    """
    from app.connectors.runner import ConnectorRunner
    from app.services.candidate_generator import CandidateGenerator
    from app.models.connector import ConnectorConfig, ConnectorStatus, ConnectorType

    # Find or create the discovery_replay connector
    result = await db.execute(
        select(ConnectorConfig).where(
            ConnectorConfig.org_id == org_id,
            ConnectorConfig.connector_type == ConnectorType.discovery_replay,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        connector = ConnectorConfig(
            org_id=org_id,
            name="Discovery Demo Pack",
            connector_type=ConnectorType.discovery_replay,
            credentials={},
            config_json={"data_path": settings.demo_data_path},
            status=ConnectorStatus.disconnected,
        )
        db.add(connector)
        await db.flush()

    # Run the connector
    runner = ConnectorRunner(db, connector)
    run = await runner.run()

    # Count results
    assets_q = await db.execute(
        select(func.count()).select_from(SourceAssetModel).where(
            SourceAssetModel.connector_id == connector.id,
        )
    )
    assets_count = assets_q.scalar() or 0

    from app.models.edge import Edge as EdgeModel
    edges_q = await db.execute(
        select(func.count()).select_from(EdgeModel).where(EdgeModel.org_id == org_id)
    )
    edges_count = edges_q.scalar() or 0

    # Generate candidates
    generator = CandidateGenerator(db, org_id)
    candidates = await generator.generate()
    await db.commit()

    return IngestResponse(
        assets_discovered=assets_count,
        edges_created=edges_count,
        usage_events=run.usage_events_found,
        cost_events=run.cost_events_found,
        candidates_generated=len(candidates),
        message=f"Discovery complete: {assets_count} assets, {len(candidates)} candidates generated",
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_list_item(c: ProductCandidate) -> CandidateListItem:
    return CandidateListItem(
        id=c.id,
        candidate_type=c.candidate_type.value,
        name_suggested=c.name_suggested,
        domain_suggested=c.domain_suggested,
        owner_suggested=c.owner_suggested,
        confidence_score=c.confidence_score,
        status=c.status.value,
        monthly_cost_estimate=float(c.monthly_cost_estimate or 0),
        monthly_consumers=c.monthly_consumers or 0,
        source_count=c.source_count or 0,
        created_at=c.created_at,
    )
