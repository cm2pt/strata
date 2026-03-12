"""Field-level provenance computation and automation summary."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connector import AssetMapping, ConnectorConfig, SourceAsset
from app.models.connector_depth import AutomationLevel, FieldProvenance
from app.connectors.extractors import get_extractor


# Default provenance for platforms without a dedicated extractor
_DEFAULT_FIELD_PROVENANCE = {
    "monthly_cost": {
        "extraction_method": "Platform API / manual entry",
        "automation_level": "semi_automated",
        "confidence": 0.75,
    },
    "monthly_consumers": {
        "extraction_method": "Platform API / manual entry",
        "automation_level": "semi_automated",
        "confidence": 0.70,
    },
    "composite_value": {
        "extraction_method": "Computed from cost + usage + trust metrics",
        "automation_level": "semi_automated",
        "confidence": 0.70,
    },
    "trust_score": {
        "extraction_method": "Manual assessment or basic checks",
        "automation_level": "manual",
        "confidence": 0.60,
    },
    "usage_trend": {
        "extraction_method": "Platform API / manual entry",
        "automation_level": "semi_automated",
        "confidence": 0.70,
    },
    "cost_trend": {
        "extraction_method": "Platform API / manual entry",
        "automation_level": "semi_automated",
        "confidence": 0.75,
    },
}


async def compute_field_provenance(
    product_id: uuid.UUID,
    org_id: uuid.UUID,
    db: AsyncSession,
) -> float:
    """Compute and upsert field-level provenance for a data product.

    Looks up all linked source assets, determines the primary connector's
    platform, and writes FieldProvenance rows for each core field.

    Returns automation_coverage (fraction of fields that are fully_automated).
    """
    # Find linked source assets via AssetMapping
    result = await db.execute(
        select(AssetMapping, SourceAsset, ConnectorConfig)
        .join(SourceAsset, AssetMapping.source_asset_id == SourceAsset.id)
        .join(ConnectorConfig, SourceAsset.connector_id == ConnectorConfig.id)
        .where(AssetMapping.data_product_id == product_id)
        .limit(5)
    )
    mappings = result.all()

    if not mappings:
        return 0.0

    # Use the first (primary) connector as the provenance source
    _mapping, source_asset, connector = mappings[0]
    platform = connector.connector_type.value
    connector_id = connector.id

    # Get platform-specific provenance mapping
    extractor = get_extractor(platform, {"seed": str(connector.credentials.get("seed", "demo-seed"))})
    if extractor:
        field_map = extractor.field_provenance_mapping()
    else:
        field_map = _DEFAULT_FIELD_PROVENANCE

    now = datetime.now(timezone.utc)
    fully_automated_count = 0
    total_fields = 0

    for field_name, info in field_map.items():
        automation = AutomationLevel(info["automation_level"])
        if automation == AutomationLevel.fully_automated:
            fully_automated_count += 1
        total_fields += 1

        # Upsert: check if exists, update or create
        existing = await db.execute(
            select(FieldProvenance).where(
                FieldProvenance.data_product_id == product_id,
                FieldProvenance.field_name == field_name,
            )
        )
        prov = existing.scalar_one_or_none()

        if prov:
            prov.source_connector_id = connector_id
            prov.source_platform = platform
            prov.extraction_method = info["extraction_method"]
            prov.automation_level = automation
            prov.confidence = info["confidence"]
            prov.last_observed_at = now
            prov.observation_count = prov.observation_count + 1
        else:
            prov = FieldProvenance(
                org_id=org_id,
                data_product_id=product_id,
                field_name=field_name,
                source_connector_id=connector_id,
                source_platform=platform,
                extraction_method=info["extraction_method"],
                automation_level=automation,
                confidence=info["confidence"],
                last_observed_at=now,
                observation_count=1,
            )
            db.add(prov)

    return fully_automated_count / total_fields if total_fields > 0 else 0.0


async def get_automation_summary(org_id: uuid.UUID, db: AsyncSession) -> dict:
    """Aggregate field provenance across all products for an org.

    Returns: {fully_automated, semi_automated, manual, total, coverage_pct}
    """
    result = await db.execute(
        select(
            FieldProvenance.automation_level,
            func.count(FieldProvenance.id),
        )
        .where(FieldProvenance.org_id == org_id)
        .group_by(FieldProvenance.automation_level)
    )
    rows = result.all()

    counts = {"fully_automated": 0, "semi_automated": 0, "manual": 0}
    for level, count in rows:
        counts[level.value] = count

    total = sum(counts.values())
    coverage = counts["fully_automated"] / total if total > 0 else 0.0

    return {
        "fully_automated": counts["fully_automated"],
        "semi_automated": counts["semi_automated"],
        "manual": counts["manual"],
        "total": total,
        "coverage_pct": round(coverage, 4),
    }
