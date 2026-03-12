"""
MultinationalDemoSeeder — Enterprise-Scale Demo Data
=====================================================

Creates "Apex Global Group" — a 120K-employee multinational with:
  - 280 Data Products across 7 divisions, 9 regions, 65 BUs, 220 teams
  - 6 hand-crafted anchor narratives (Customer 360, Global Demand Forecast, etc.)
  - 45 decisions, 20 capital events, 12 AI scorecards, 5 pricing policies
  - Full time-series (6 months), value declarations, comments, audit trails
  - ~$9.5M/month portfolio cost, ~2.7x average ROI

Deterministic: all random values seeded from a single integer.
Run: python -m app.seed.multinational_seeder --org "Apex Global Group" --seed 42
"""
import asyncio
import argparse
import json
import logging
import math
import random as _random_module
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

import bcrypt
from sqlalchemy import select

from app.database import async_session_factory
from app.models.ai_scorecard import AIProjectRiskLevel, AIProjectScorecard
from app.models.candidate import CandidateMember, CandidateStatus, CandidateType, ProductCandidate
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.config import (
    BenchmarkData,
    BenchmarkIndustry,
    MarketplaceSubscription,
    Notification,
    NotificationType,
    PolicyCategory,
    PolicyConfig,
)
from app.models.connector import ConnectorConfig, ConnectorStatus, ConnectorType, SourceAsset, AssetMapping
from app.models.connector_depth import AutomationLevel, ConnectorExtractionMeta, ConnectorSyncLog, FieldProvenance, SyncStatus
from app.models.lineage import LineageEdge, LineageEdgeType, LineageNode, LineageNodeType, LineageProvenance
from app.models.data_product import (
    ConsumerTeam,
    CostBreakdown,
    DataProduct,
    LifecycleStage,
    PlatformType,
    ROIBand,
)
from app.models.decision import (
    Decision,
    DecisionAction,
    DecisionComment,
    DecisionEconomicEffect,
    DecisionStatus,
    DecisionType,
)
from app.models.edge import Edge, EdgeType
from app.models.org import BusinessUnit, Organization, Team
from app.models.pricing import PricingPolicy, PricingPolicyStatus, PricingUsageDelta
from app.models.time_series import CostMonthly, PortfolioMonthly, ROIMonthly, UsageMonthly
from app.models.user import User, UserOrgRole, UserRole
from app.models.value import ValueDeclaration, ValueDeclarationVersion, ValueMethod

logger = logging.getLogger(__name__)

# ─── Constants ──────────────────────────────────────────────────────────────────

MONTH_DATES = [
    date(2025, 9, 1),
    date(2025, 10, 1),
    date(2025, 11, 1),
    date(2025, 12, 1),
    date(2026, 1, 1),
    date(2026, 2, 1),
]
MONTH_LABELS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]

# 7 Divisions with their BUs and teams
DIVISIONS = {
    "Global Markets": {
        "bus": [
            "Equities Trading", "Fixed Income", "FX & Commodities",
            "Derivatives", "Prime Brokerage", "Electronic Trading",
            "Research Analytics", "Quantitative Analytics", "Market Risk",
        ],
        "domain": "Trading & Markets",
        "products_target": 55,
    },
    "Retail Banking": {
        "bus": [
            "Deposits & Accounts", "Lending & Mortgages", "Cards & Payments",
            "Customer Intelligence", "Digital Banking", "Branch Operations",
            "Digital Marketing", "Wealth Onboarding", "Collections",
        ],
        "domain": "Retail Finance",
        "products_target": 45,
    },
    "Wealth Management": {
        "bus": [
            "Portfolio Advisory", "Private Banking", "Asset Allocation",
            "Client Reporting", "Trust & Estate", "Alternative Investments",
            "Research & Strategy",
        ],
        "domain": "Wealth & Advisory",
        "products_target": 35,
    },
    "Insurance": {
        "bus": [
            "Underwriting", "Claims Processing", "Actuarial Analytics",
            "Policy Administration", "Reinsurance", "Loss Prevention",
            "Distribution Analytics", "Product Development",
        ],
        "domain": "Insurance Operations",
        "products_target": 40,
    },
    "Technology & Operations": {
        "bus": [
            "Data Engineering", "Cloud Platform", "DevOps & SRE",
            "Data Migration", "Enterprise Architecture", "Integration Services",
            "Testing & QA", "Vendor Management", "IT Security",
        ],
        "domain": "Technology",
        "products_target": 40,
    },
    "Risk & Compliance": {
        "bus": [
            "Credit Risk", "Market Risk Analytics", "Operational Risk",
            "Financial Crime", "Regulatory Affairs", "Model Validation",
            "Audit & Controls", "Sanctions Screening",
        ],
        "domain": "Risk & Compliance",
        "products_target": 35,
    },
    "Corporate Functions": {
        "bus": [
            "Finance & FPA", "Human Resources", "Legal",
            "Corporate Strategy", "Procurement", "Facilities",
            "Investor Relations",
        ],
        "domain": "Corporate",
        "products_target": 30,
    },
}

REGIONS = ["NA-East", "NA-West", "LATAM", "UK", "EU", "MEA", "APAC-North", "APAC-South", "India"]

# Teams per BU (3-4 each, generated from template)
TEAM_SUFFIXES = ["Analytics", "Engineering", "Operations", "Strategy", "Reporting"]

# ─── Product Name Pools ────────────────────────────────────────────────────────

PRODUCT_ADJECTIVES = [
    "Real-Time", "Cross-Border", "Consolidated", "Enriched", "Daily",
    "Streaming", "Historical", "Predictive", "Aggregated", "Unified",
    "Core", "Enterprise", "Regional", "Synthetic", "Federated",
    "Curated", "Normalized", "Multi-Source", "High-Frequency", "Batch",
]

PRODUCT_DOMAINS = [
    "Customer", "Risk", "Market", "Trade", "Payment", "Lending",
    "Insurance", "Wealth", "Compliance", "Operations", "Revenue",
    "Credit", "Claims", "Portfolio", "Underwriting", "Fraud",
    "Settlement", "Pricing", "Position", "Transaction", "Campaign",
    "Employee", "Vendor", "Channel", "Digital", "Regulatory",
]

PRODUCT_NOUNS = [
    "Hub", "Signals", "Events", "Metrics", "Feed", "Pipeline",
    "Model", "Extract", "Report", "Warehouse", "Features",
    "Scorecard", "Dashboard Data", "Analytics", "Intelligence",
    "Dataset", "Lakehouse", "Catalog", "Summary", "Snapshot",
]

# ─── Helpers ────────────────────────────────────────────────────────────────────


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _det_uuid(rng: _random_module.Random) -> uuid.UUID:
    """Generate a deterministic UUID from the seeded RNG."""
    return uuid.UUID(int=rng.getrandbits(128))


def _roi_band(roi: float | None) -> ROIBand | None:
    if roi is None:
        return None
    if roi >= 3.0:
        return ROIBand.high
    if roi >= 1.0:
        return ROIBand.healthy
    if roi >= 0.5:
        return ROIBand.underperforming
    return ROIBand.critical


def _cost_trend_series(base: float, growth_pct: float, rng: _random_module.Random) -> list[dict]:
    """Generate 6-month cost series with slight noise."""
    result = []
    for i in range(6):
        factor = 1 + (growth_pct / 100.0) * i
        noise = rng.uniform(0.97, 1.03)
        cost = round(base * factor * noise, 2)
        result.append({"month": MONTH_DATES[i], "cost": cost})
    return result


def _usage_trend_series(
    base_consumers: int, growth_pct: float, queries_per_consumer: int, rng: _random_module.Random
) -> list[dict]:
    """Generate 6-month usage series."""
    result = []
    for i in range(6):
        factor = max(0, 1 + (growth_pct / 100.0) * i)
        noise = rng.uniform(0.95, 1.05)
        consumers = max(0, round(base_consumers * factor * noise))
        queries = consumers * queries_per_consumer + rng.randint(0, consumers * 5 + 1)
        result.append({"month": MONTH_DATES[i], "consumers": consumers, "queries": queries})
    return result


def _generate_product_name(rng: _random_module.Random, used_names: set[str]) -> str:
    """Generate a unique product name."""
    for _ in range(100):
        adj = rng.choice(PRODUCT_ADJECTIVES)
        domain = rng.choice(PRODUCT_DOMAINS)
        noun = rng.choice(PRODUCT_NOUNS)
        name = f"{adj} {domain} {noun}"
        if name not in used_names:
            used_names.add(name)
            return name
    # Fallback with counter
    name = f"Data Product {len(used_names) + 1}"
    used_names.add(name)
    return name


# ─── User Pool ──────────────────────────────────────────────────────────────────

USERS_DATA = [
    # C-Suite (7)
    {"email": "ceo@apex.com", "name": "Victoria Harrington", "title": "Chief Executive Officer", "role": UserRole.executive_sponsor},
    {"email": "cfo@apex.com", "name": "Marcus Chen", "title": "Chief Financial Officer", "role": UserRole.cfo},
    {"email": "cdo@apex.com", "name": "Dr. Amara Okafor", "title": "Chief Data Officer", "role": UserRole.cdo},
    {"email": "cro@apex.com", "name": "Friedrich Weber", "title": "Chief Risk Officer", "role": UserRole.governance_steward},
    {"email": "cto@apex.com", "name": "Kenji Tanaka", "title": "Chief Technology Officer", "role": UserRole.platform_admin},
    {"email": "coo@apex.com", "name": "Isabella Rodriguez", "title": "Chief Operating Officer", "role": UserRole.executive_sponsor},
    {"email": "chro@apex.com", "name": "David Okonkwo", "title": "Chief Human Resources Officer", "role": UserRole.executive_sponsor},
    # Division Heads (7)
    {"email": "gm.head@apex.com", "name": "James Blackwood", "title": "Head of Global Markets", "role": UserRole.product_owner},
    {"email": "rb.head@apex.com", "name": "Sarah Kim-Patel", "title": "Head of Retail Banking", "role": UserRole.product_owner},
    {"email": "wm.head@apex.com", "name": "Philippe Durand", "title": "Head of Wealth Management", "role": UserRole.product_owner},
    {"email": "ins.head@apex.com", "name": "Rajesh Krishnamurthy", "title": "Head of Insurance", "role": UserRole.product_owner},
    {"email": "tech.head@apex.com", "name": "Lisa Chang", "title": "Head of Technology & Ops", "role": UserRole.platform_admin},
    {"email": "risk.head@apex.com", "name": "Elena Volkov", "title": "Head of Risk & Compliance", "role": UserRole.governance_steward},
    {"email": "corp.head@apex.com", "name": "Thomas Brennan", "title": "Head of Corporate Functions", "role": UserRole.fpa_analyst},
    # BU-Level Owners / Product Owners (15)
    {"email": "owner01@apex.com", "name": "Priya Sharma", "title": "Sr. Data Product Manager — Customer Intelligence", "role": UserRole.product_owner},
    {"email": "owner02@apex.com", "name": "Alex Nguyen", "title": "Sr. Data Product Manager — Trading Analytics", "role": UserRole.product_owner},
    {"email": "owner03@apex.com", "name": "Maria Santos", "title": "Data Product Manager — Payments", "role": UserRole.product_owner},
    {"email": "owner04@apex.com", "name": "Tom Wilson", "title": "Data Product Manager — Insurance Analytics", "role": UserRole.product_owner},
    {"email": "owner05@apex.com", "name": "Jun Park", "title": "Data Product Manager — Risk Models", "role": UserRole.product_owner},
    {"email": "owner06@apex.com", "name": "Sophie Turner", "title": "Data Product Manager — Wealth Analytics", "role": UserRole.product_owner},
    {"email": "owner07@apex.com", "name": "Ahmed Hassan", "title": "Data Product Manager — Compliance", "role": UserRole.product_owner},
    {"email": "owner08@apex.com", "name": "Nina Petrov", "title": "Data Product Manager — Digital Banking", "role": UserRole.product_owner},
    {"email": "owner09@apex.com", "name": "Carlos Mendez", "title": "Data Product Manager — Claims", "role": UserRole.product_owner},
    {"email": "owner10@apex.com", "name": "Wei Zhang", "title": "Data Product Manager — Market Data", "role": UserRole.product_owner},
    {"email": "steward01@apex.com", "name": "Hannah Mueller", "title": "Data Governance Steward — EMEA", "role": UserRole.governance_steward},
    {"email": "steward02@apex.com", "name": "Ravi Kapoor", "title": "Data Governance Steward — APAC", "role": UserRole.governance_steward},
    {"email": "steward03@apex.com", "name": "Claire Dupont", "title": "Data Governance Steward — Americas", "role": UserRole.governance_steward},
    {"email": "steward04@apex.com", "name": "Yuki Watanabe", "title": "Data Quality Lead", "role": UserRole.governance_steward},
    {"email": "steward05@apex.com", "name": "Olga Ivanova", "title": "Data Classification Officer", "role": UserRole.governance_steward},
    # Data Engineers / Platform (10)
    {"email": "eng01@apex.com", "name": "Ryan O'Sullivan", "title": "Principal Data Engineer", "role": UserRole.data_engineer},
    {"email": "eng02@apex.com", "name": "Mei-Lin Wu", "title": "Senior Data Engineer — Snowflake", "role": UserRole.data_engineer},
    {"email": "eng03@apex.com", "name": "Dmitri Popov", "title": "Senior Data Engineer — Databricks", "role": UserRole.data_engineer},
    {"email": "eng04@apex.com", "name": "Fatima Al-Rashid", "title": "Data Platform Lead", "role": UserRole.platform_admin},
    {"email": "eng05@apex.com", "name": "Luca Moretti", "title": "DataOps Engineer", "role": UserRole.dataops_sre},
    {"email": "eng06@apex.com", "name": "Anika Johansson", "title": "DataOps / SRE Lead", "role": UserRole.dataops_sre},
    {"email": "eng07@apex.com", "name": "Kofi Asante", "title": "Integration Engineer", "role": UserRole.data_engineer},
    {"email": "eng08@apex.com", "name": "Ingrid Larsen", "title": "Cloud Infrastructure Lead", "role": UserRole.platform_admin},
    {"email": "eng09@apex.com", "name": "Pablo Reyes", "title": "ETL Pipeline Engineer", "role": UserRole.data_engineer},
    {"email": "eng10@apex.com", "name": "Zara Osei", "title": "Data Mesh Architect", "role": UserRole.data_engineer},
    # Data Scientists / ML (5)
    {"email": "ds01@apex.com", "name": "Dr. James Liu", "title": "Head of AI & Data Science", "role": UserRole.head_of_ai},
    {"email": "ds02@apex.com", "name": "Dr. Emily Park", "title": "Senior ML Engineer — Fraud", "role": UserRole.data_scientist},
    {"email": "ds03@apex.com", "name": "Dr. Arjun Reddy", "title": "Quantitative Analyst", "role": UserRole.data_scientist},
    {"email": "ds04@apex.com", "name": "Dr. Chloe Martin", "title": "NLP Research Scientist", "role": UserRole.data_scientist},
    {"email": "ds05@apex.com", "name": "Dr. Samuel Okeyo", "title": "MLOps Engineer", "role": UserRole.data_scientist},
    # FP&A (3)
    {"email": "fpa01@apex.com", "name": "Kevin Zhao", "title": "FP&A Analyst — Data Costs", "role": UserRole.fpa_analyst},
    {"email": "fpa02@apex.com", "name": "Angela Fischer", "title": "Senior Financial Analyst", "role": UserRole.fpa_analyst},
    {"email": "fpa03@apex.com", "name": "Brian Murphy", "title": "Budget Controller", "role": UserRole.fpa_analyst},
    # Auditors / Service (3)
    {"email": "auditor@apex.com", "name": "Robert Marsh", "title": "External Auditor (Deloitte)", "role": UserRole.external_auditor},
    {"email": "admin@apex.com", "name": "System Administrator", "title": "System Administrator", "role": UserRole.admin},
    {"email": "service@apex.com", "name": "Integration Bot", "title": "Service Account", "role": UserRole.integration_service},
]


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SEEDER
# ═══════════════════════════════════════════════════════════════════════════════

async def seed_multinational(
    org_name: str = "Apex Global Group",
    rng_seed: int = 42,
) -> None:
    """Seed the database with enterprise-scale demo data."""
    rng = _random_module.Random(rng_seed)

    async with async_session_factory() as session:
        # Idempotent: skip if any org exists
        result = await session.execute(select(Organization).limit(1))
        if result.scalar_one_or_none():
            logger.info("Database already seeded — skipping multinational seeder.")
            return

        logger.info(f"Seeding multinational demo: {org_name} (seed={rng_seed})...")

        # ============================================================
        # Phase 1: Organization + Business Units + Teams
        # ============================================================
        org = Organization(name=org_name, slug="apex-global", industry="financial_services")
        session.add(org)
        await session.flush()
        org_id = org.id

        bu_map: dict[str, uuid.UUID] = {}  # "Division > BU" -> bu_id
        team_map: dict[str, uuid.UUID] = {}  # "BU > Team" -> team_id
        all_team_names: list[str] = []
        division_bus: dict[str, list[str]] = {}  # division -> [bu_name, ...]

        for div_name, div_info in DIVISIONS.items():
            for bu_name in div_info["bus"]:
                full_bu = f"{div_name} > {bu_name}"
                bu = BusinessUnit(org_id=org_id, name=bu_name)
                session.add(bu)
                await session.flush()
                bu_map[full_bu] = bu.id
                division_bus.setdefault(div_name, []).append(bu_name)

                # 3 teams per BU
                team_suffixes_sample = rng.sample(TEAM_SUFFIXES, min(3, len(TEAM_SUFFIXES)))
                for suffix in team_suffixes_sample:
                    team_name = f"{bu_name} {suffix}"
                    team = Team(org_id=org_id, business_unit_id=bu.id, name=team_name)
                    session.add(team)
                    await session.flush()
                    team_map[team_name] = team.id
                    all_team_names.append(team_name)

        await session.flush()
        logger.info(f"  Phase 1: {len(bu_map)} BUs, {len(team_map)} teams")

        # ============================================================
        # Phase 2: Users + Roles
        # ============================================================
        pw_hash = _hash_password("demo123")
        user_map: dict[str, User] = {}  # email -> User
        owner_user_ids: list[uuid.UUID] = []

        for ud in USERS_DATA:
            u = User(
                email=ud["email"],
                password_hash=pw_hash,
                name=ud["name"],
                title=ud["title"],
            )
            session.add(u)
            await session.flush()
            role = UserOrgRole(user_id=u.id, org_id=org_id, role=ud["role"])
            session.add(role)
            user_map[ud["email"]] = u
            if ud["role"] == UserRole.product_owner:
                owner_user_ids.append(u.id)

        await session.flush()

        # Convenience refs
        ceo = user_map["ceo@apex.com"]
        cfo = user_map["cfo@apex.com"]
        cdo = user_map["cdo@apex.com"]
        cro = user_map["cro@apex.com"]
        head_ai = user_map["ds01@apex.com"]
        all_user_ids = [u.id for u in user_map.values()]

        logger.info(f"  Phase 2: {len(user_map)} users")

        # ============================================================
        # Phase 3: 6 Anchor Data Products (Hand-Crafted)
        # ============================================================
        dp_map: dict[str, DataProduct] = {}  # key -> DataProduct
        used_product_names: set[str] = set()

        anchor_products = [
            # Anchor 1: Customer 360 Platform
            {
                "key": "customer-360",
                "name": "Customer 360 Platform",
                "domain": "Customer Analytics",
                "business_unit": "Customer Intelligence",
                "owner_id": user_map["owner01@apex.com"].id,
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.growth,
                "created_at": datetime(2024, 6, 15, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 14, 30, 0, tzinfo=timezone.utc),
                "monthly_cost": 82000,
                "cost_breakdown": {"compute": 36000, "storage": 12000, "pipeline": 18000, "human_estimate": 16000},
                "declared_value": 310000,
                "usage_implied_value": 248000,
                "monthly_consumers": 1240,
                "total_queries": 55800,
                "consumer_team_count": 18,
                "usage_trend": 15,
                "peak_consumers": 1240,
                "freshness_hours": 1.5,
                "freshness_sla": 4,
                "completeness": 0.994,
                "accuracy": 0.982,
                "trust_score": 0.97,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 24,
                "downstream_products": 8,
                "downstream_models": 5,
                "downstream_dashboards": 18,
                "is_retirement_candidate": False,
                "has_cost_spike": True,
                "has_usage_decline": False,
                "cost_trend": 8,
                "cost_coverage": 0.94,
            },
            # Anchor 2: Global Demand Forecast
            {
                "key": "demand-forecast",
                "name": "Global Demand Forecast",
                "domain": "Quantitative Analytics",
                "business_unit": "Quantitative Analytics",
                "owner_id": user_map["owner02@apex.com"].id,
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.active,
                "created_at": datetime(2025, 1, 10, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 21, 9, 15, 0, tzinfo=timezone.utc),
                "monthly_cost": 145000,
                "cost_breakdown": {"compute": 78000, "storage": 18000, "pipeline": 28000, "human_estimate": 21000},
                "declared_value": 520000,
                "usage_implied_value": 380000,
                "monthly_consumers": 380,
                "total_queries": 17100,
                "consumer_team_count": 12,
                "usage_trend": 10,
                "peak_consumers": 380,
                "freshness_hours": 4,
                "freshness_sla": 8,
                "completeness": 0.98,
                "accuracy": 0.94,
                "trust_score": 0.94,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 16,
                "downstream_products": 8,
                "downstream_models": 6,
                "downstream_dashboards": 12,
                "is_retirement_candidate": False,
                "has_cost_spike": True,
                "has_usage_decline": False,
                "cost_trend": 35,
                "cost_coverage": 0.72,
            },
            # Anchor 3: Fraud Detection Signals
            {
                "key": "fraud-detection",
                "name": "Fraud Detection Signals",
                "domain": "Financial Crime",
                "business_unit": "Financial Crime",
                "owner_id": user_map["owner05@apex.com"].id,
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.active,
                "created_at": datetime(2024, 9, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 18, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 210000,
                "cost_breakdown": {"compute": 115000, "storage": 22000, "pipeline": 42000, "human_estimate": 31000},
                "declared_value": 890000,
                "usage_implied_value": 620000,
                "monthly_consumers": 95,
                "total_queries": 285000,
                "consumer_team_count": 6,
                "usage_trend": 22,
                "peak_consumers": 95,
                "freshness_hours": 0.05,
                "freshness_sla": 0.17,
                "completeness": 0.999,
                "accuracy": 0.996,
                "trust_score": 0.99,
                "is_published": False,
                "is_certified": True,
                "subscription_count": 6,
                "downstream_products": 3,
                "downstream_models": 4,
                "downstream_dashboards": 8,
                "is_retirement_candidate": False,
                "has_cost_spike": True,
                "has_usage_decline": False,
                "cost_trend": 45,
                "cost_coverage": 0.78,
            },
            # Anchor 4: Legacy CRM Extract
            {
                "key": "legacy-crm",
                "name": "Legacy CRM Extract",
                "domain": "Data Migration",
                "business_unit": "Data Migration",
                "owner_id": user_map["eng01@apex.com"].id,
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.decline,
                "created_at": datetime(2021, 3, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 1, 10, 8, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 67000,
                "cost_breakdown": {"compute": 18000, "storage": 32000, "pipeline": 12000, "human_estimate": 5000},
                "declared_value": None,
                "usage_implied_value": 8000,
                "monthly_consumers": 12,
                "total_queries": 180,
                "consumer_team_count": 3,
                "usage_trend": -85,
                "peak_consumers": 890,
                "freshness_hours": 48,
                "freshness_sla": 24,
                "completeness": 0.82,
                "accuracy": 0.75,
                "trust_score": 0.58,
                "is_published": False,
                "is_certified": False,
                "subscription_count": 0,
                "downstream_products": 0,
                "downstream_models": 0,
                "downstream_dashboards": 2,
                "is_retirement_candidate": True,
                "has_cost_spike": False,
                "has_usage_decline": True,
                "cost_trend": 0,
                "cost_coverage": 0.96,
            },
            # Anchor 5: Regulatory Reporting Pack
            {
                "key": "reg-reporting",
                "name": "Regulatory Reporting Pack",
                "domain": "Regulatory Affairs",
                "business_unit": "Regulatory Affairs",
                "owner_id": user_map["owner07@apex.com"].id,
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.mature,
                "created_at": datetime(2023, 1, 15, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 20, 11, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 48000,
                "cost_breakdown": {"compute": 18000, "storage": 10000, "pipeline": 12000, "human_estimate": 8000},
                "declared_value": 48000,
                "usage_implied_value": 32000,
                "monthly_consumers": 42,
                "total_queries": 1890,
                "consumer_team_count": 4,
                "usage_trend": 2,
                "peak_consumers": 48,
                "freshness_hours": 6,
                "freshness_sla": 8,
                "completeness": 0.998,
                "accuracy": 0.997,
                "trust_score": 0.96,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 8,
                "downstream_products": 2,
                "downstream_models": 0,
                "downstream_dashboards": 6,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
                "cost_trend": 3,
                "cost_coverage": 0.92,
            },
            # Anchor 6: Marketing Attribution Hub
            {
                "key": "mktg-attribution",
                "name": "Marketing Attribution Hub",
                "domain": "Digital Marketing",
                "business_unit": "Digital Marketing",
                "owner_id": user_map["owner08@apex.com"].id,
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.growth,
                "created_at": datetime(2025, 4, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 10, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 38000,
                "cost_breakdown": {"compute": 17000, "storage": 5000, "pipeline": 9000, "human_estimate": 7000},
                "declared_value": 142000,
                "usage_implied_value": 104000,
                "monthly_consumers": 520,
                "total_queries": 23400,
                "consumer_team_count": 14,
                "usage_trend": 28,
                "peak_consumers": 520,
                "freshness_hours": 3,
                "freshness_sla": 6,
                "completeness": 0.97,
                "accuracy": 0.93,
                "trust_score": 0.93,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 12,
                "downstream_products": 4,
                "downstream_models": 2,
                "downstream_dashboards": 9,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
                "cost_trend": 12,
                "cost_coverage": 0.88,
            },
        ]

        for ap in anchor_products:
            key = ap.pop("key")
            cb_data = ap.pop("cost_breakdown")
            ct_count = ap.pop("consumer_team_count")
            used_product_names.add(ap["name"])

            dv = ap.get("declared_value")
            uv = ap.get("usage_implied_value", 0)
            if dv is not None:
                cv = 0.7 * dv + 0.3 * uv
            else:
                cv = 0.3 * uv
            roi_val = round(cv / ap["monthly_cost"], 4) if ap["monthly_cost"] else None

            dp = DataProduct(
                org_id=org_id,
                name=ap["name"],
                domain=ap["domain"],
                business_unit=ap["business_unit"],
                owner_id=ap["owner_id"],
                platform=ap["platform"],
                lifecycle_stage=ap["lifecycle_stage"],
                created_at=ap.get("created_at"),
                updated_at=ap.get("updated_at"),
                monthly_cost=ap["monthly_cost"],
                declared_value=ap.get("declared_value"),
                usage_implied_value=uv,
                composite_value=cv,
                roi=roi_val,
                roi_band=_roi_band(roi_val),
                cost_trend=ap.get("cost_trend", 0),
                cost_coverage=ap.get("cost_coverage", 0.85),
                monthly_consumers=ap["monthly_consumers"],
                total_queries=ap["total_queries"],
                usage_trend=ap.get("usage_trend", 0),
                peak_consumers=ap.get("peak_consumers", ap["monthly_consumers"]),
                freshness_hours=ap.get("freshness_hours", 4),
                freshness_sla=ap.get("freshness_sla", 8),
                completeness=ap.get("completeness", 0.95),
                accuracy=ap.get("accuracy", 0.92),
                trust_score=ap.get("trust_score", 0.90),
                is_published=ap.get("is_published", True),
                is_certified=ap.get("is_certified", False),
                subscription_count=ap.get("subscription_count", 0),
                downstream_products=ap.get("downstream_products", 0),
                downstream_models=ap.get("downstream_models", 0),
                downstream_dashboards=ap.get("downstream_dashboards", 0),
                is_retirement_candidate=ap.get("is_retirement_candidate", False),
                has_cost_spike=ap.get("has_cost_spike", False),
                has_usage_decline=ap.get("has_usage_decline", False),
            )
            session.add(dp)
            await session.flush()
            dp_map[key] = dp

            # Cost breakdown
            session.add(CostBreakdown(data_product_id=dp.id, **cb_data))

            # Consumer teams (random selection)
            sample_teams = rng.sample(all_team_names, min(ct_count, len(all_team_names)))
            remaining_consumers = ap["monthly_consumers"]
            for idx, tn in enumerate(sample_teams):
                if idx == len(sample_teams) - 1:
                    ct_consumers = remaining_consumers
                else:
                    ct_consumers = max(1, round(remaining_consumers * rng.uniform(0.05, 0.25)))
                    remaining_consumers -= ct_consumers
                pct = round(ct_consumers / ap["monthly_consumers"] * 100, 1) if ap["monthly_consumers"] else 0
                session.add(ConsumerTeam(
                    data_product_id=dp.id,
                    team_name=tn,
                    consumers=ct_consumers,
                    percentage=pct,
                ))

        await session.flush()
        logger.info(f"  Phase 3: 6 anchor products")

        # ============================================================
        # Phase 4: 274 Generated Data Products
        # ============================================================
        BANDS = [
            # (count, roi_lo, roi_hi, cost_lo, cost_hi, consumers_lo, consumers_hi, stages, is_star)
            (50, 2.5, 6.0, 15000, 120000, 80, 800, [LifecycleStage.growth, LifecycleStage.active], True),  # Stars
            (140, 1.0, 2.5, 5000, 60000, 20, 300, [LifecycleStage.active, LifecycleStage.mature], False),  # Core
            (56, 0.05, 1.0, 3000, 50000, 0, 40, [LifecycleStage.decline], False),  # Declining
            (28, 0.0, 0.0, 1000, 15000, 0, 0, [LifecycleStage.draft], False),  # Draft
        ]

        generated_products: list[DataProduct] = []
        retirement_candidate_ids: list[uuid.UUID] = []
        cost_spike_ids: list[uuid.UUID] = []
        usage_decline_ids: list[uuid.UUID] = []
        all_division_names = list(DIVISIONS.keys())

        # Track how many we've assigned per division for balanced distribution
        div_product_count: dict[str, int] = {d: 0 for d in all_division_names}

        for band_idx, (count, roi_lo, roi_hi, cost_lo, cost_hi, cons_lo, cons_hi, stages, is_star) in enumerate(BANDS):
            for i in range(count):
                name = _generate_product_name(rng, used_product_names)

                # Assign to division with fewest products so far
                div_name = min(all_division_names, key=lambda d: div_product_count[d])
                div_product_count[div_name] += 1
                div_info = DIVISIONS[div_name]
                bu_name = rng.choice(div_info["bus"])

                monthly_cost = round(rng.uniform(cost_lo, cost_hi), 2)
                consumers = rng.randint(cons_lo, cons_hi)
                platform = rng.choices(
                    [PlatformType.snowflake, PlatformType.databricks, PlatformType.s3, PlatformType.power_bi],
                    weights=[45, 30, 15, 10], k=1
                )[0]
                stage = rng.choice(stages)

                # Economics
                if band_idx == 3:  # Draft
                    declared_value = None
                    usage_implied_value = 0
                    roi_val = None
                elif band_idx == 2:  # Declining
                    declared_value = round(rng.uniform(0, monthly_cost * 0.5), 2) if rng.random() < 0.3 else None
                    usage_implied_value = round(consumers * rng.uniform(50, 200), 2)
                    cv = (0.7 * declared_value + 0.3 * usage_implied_value) if declared_value else (0.3 * usage_implied_value)
                    roi_val = round(cv / monthly_cost, 4) if monthly_cost else 0
                else:  # Stars / Core
                    target_roi = rng.uniform(roi_lo, roi_hi)
                    composite_target = monthly_cost * target_roi
                    # 70% declared, 30% usage-implied
                    declared_value = round(composite_target / 0.7 * rng.uniform(0.85, 1.15), 2)
                    usage_implied_value = round(consumers * rng.uniform(80, 300), 2)
                    cv = 0.7 * declared_value + 0.3 * usage_implied_value
                    roi_val = round(cv / monthly_cost, 4) if monthly_cost else 0

                if declared_value is not None:
                    composite_value = 0.7 * declared_value + 0.3 * usage_implied_value
                else:
                    composite_value = 0.3 * usage_implied_value

                # Flags
                is_retirement = band_idx == 2 and i < 15  # first 15 declining
                is_cost_spike = band_idx <= 1 and i < 4  # first 4 in Stars group + first 4 Core = 8 total but cap at 8
                is_usage_decline = band_idx == 2

                # Quality metrics by band
                if band_idx == 0:  # Stars
                    trust = round(rng.uniform(0.90, 0.99), 3)
                    completeness = round(rng.uniform(0.95, 0.999), 4)
                    accuracy = round(rng.uniform(0.92, 0.998), 4)
                    cost_trend_val = round(rng.uniform(5, 25), 1)
                    usage_trend_val = round(rng.uniform(8, 35), 1)
                elif band_idx == 1:  # Core
                    trust = round(rng.uniform(0.80, 0.95), 3)
                    completeness = round(rng.uniform(0.90, 0.98), 4)
                    accuracy = round(rng.uniform(0.88, 0.96), 4)
                    cost_trend_val = round(rng.uniform(-5, 10), 1)
                    usage_trend_val = round(rng.uniform(-3, 12), 1)
                elif band_idx == 2:  # Declining
                    trust = round(rng.uniform(0.45, 0.78), 3)
                    completeness = round(rng.uniform(0.70, 0.92), 4)
                    accuracy = round(rng.uniform(0.65, 0.88), 4)
                    cost_trend_val = round(rng.uniform(-10, 5), 1)
                    usage_trend_val = round(rng.uniform(-90, -15), 1)
                else:  # Draft
                    trust = round(rng.uniform(0.60, 0.85), 3)
                    completeness = round(rng.uniform(0.80, 0.95), 4)
                    accuracy = round(rng.uniform(0.78, 0.92), 4)
                    cost_trend_val = 0
                    usage_trend_val = 0

                dp = DataProduct(
                    org_id=org_id,
                    name=name,
                    domain=div_info["domain"],
                    business_unit=bu_name,
                    owner_id=rng.choice(owner_user_ids) if owner_user_ids else all_user_ids[0],
                    platform=platform,
                    lifecycle_stage=stage,
                    created_at=datetime(rng.randint(2022, 2025), rng.randint(1, 12), rng.randint(1, 28), tzinfo=timezone.utc),
                    updated_at=datetime(2026, 2, rng.randint(15, 25), rng.randint(8, 20), 0, 0, tzinfo=timezone.utc),
                    monthly_cost=monthly_cost,
                    declared_value=declared_value,
                    usage_implied_value=usage_implied_value,
                    composite_value=round(composite_value, 2),
                    roi=roi_val,
                    roi_band=_roi_band(roi_val),
                    cost_trend=cost_trend_val,
                    cost_coverage=round(rng.uniform(0.60, 0.98), 3),
                    monthly_consumers=consumers,
                    total_queries=consumers * rng.randint(20, 80),
                    usage_trend=usage_trend_val,
                    peak_consumers=max(consumers, rng.randint(consumers, max(consumers + 1, consumers * 3))),
                    freshness_hours=round(rng.uniform(0.5, 48), 1),
                    freshness_sla=round(rng.uniform(1, 72), 1),
                    completeness=completeness,
                    accuracy=accuracy,
                    trust_score=trust,
                    is_published=band_idx <= 1,
                    is_certified=is_star and rng.random() < 0.4,
                    subscription_count=rng.randint(2, 20) if band_idx <= 1 else 0,
                    downstream_products=rng.randint(1, 8) if band_idx == 0 else rng.randint(0, 3),
                    downstream_models=rng.randint(0, 4) if band_idx <= 1 else 0,
                    downstream_dashboards=rng.randint(1, 12) if band_idx <= 1 else rng.randint(0, 2),
                    is_retirement_candidate=is_retirement,
                    has_cost_spike=is_cost_spike and band_idx == 0,
                    has_usage_decline=is_usage_decline,
                )
                session.add(dp)
                generated_products.append(dp)

                if is_retirement:
                    retirement_candidate_ids.append(dp.id)
                if dp.has_cost_spike:
                    cost_spike_ids.append(dp.id)
                if is_usage_decline:
                    usage_decline_ids.append(dp.id)

        await session.flush()

        # Add cost breakdowns and consumer teams for generated products (batch)
        for dp in generated_products:
            mc = float(dp.monthly_cost)
            compute_pct = rng.uniform(0.40, 0.55)
            storage_pct = rng.uniform(0.10, 0.25)
            pipeline_pct = rng.uniform(0.15, 0.25)
            human_pct = 1.0 - compute_pct - storage_pct - pipeline_pct
            session.add(CostBreakdown(
                data_product_id=dp.id,
                compute=round(mc * compute_pct, 2),
                storage=round(mc * storage_pct, 2),
                pipeline=round(mc * pipeline_pct, 2),
                human_estimate=round(mc * human_pct, 2),
            ))

            # Consumer teams: 2-5 per product
            n_teams = min(rng.randint(2, 5), len(all_team_names))
            if int(dp.monthly_consumers) > 0 and n_teams > 0:
                sample = rng.sample(all_team_names, n_teams)
                remaining = int(dp.monthly_consumers)
                for idx, tn in enumerate(sample):
                    if idx == len(sample) - 1:
                        ct_c = remaining
                    else:
                        ct_c = max(1, round(remaining * rng.uniform(0.1, 0.4)))
                        remaining -= ct_c
                    pct = round(ct_c / int(dp.monthly_consumers) * 100, 1) if int(dp.monthly_consumers) else 0
                    session.add(ConsumerTeam(
                        data_product_id=dp.id,
                        team_name=tn,
                        consumers=ct_c,
                        percentage=pct,
                    ))

        await session.flush()
        all_products = list(dp_map.values()) + generated_products
        logger.info(f"  Phase 4: {len(generated_products)} generated products (total: {len(all_products)})")

        # ============================================================
        # Phase 5: Time Series
        # ============================================================
        cost_monthly_batch = []
        usage_monthly_batch = []
        roi_monthly_batch = []

        for dp in all_products:
            mc = float(dp.monthly_cost)
            ct = float(dp.cost_trend)
            ut = float(dp.usage_trend)
            consumers = int(dp.monthly_consumers)

            # CostMonthly for all products
            cost_series = _cost_trend_series(mc, ct / 5.0, rng)  # spread over 6 months
            for cs in cost_series:
                cost_monthly_batch.append(CostMonthly(
                    data_product_id=dp.id,
                    month=cs["month"],
                    total_cost=cs["cost"],
                    compute=round(cs["cost"] * rng.uniform(0.40, 0.55), 2),
                    storage=round(cs["cost"] * rng.uniform(0.10, 0.20), 2),
                    pipeline=round(cs["cost"] * rng.uniform(0.15, 0.25), 2),
                    human_estimate=0,
                    coverage_pct=float(dp.cost_coverage),
                ))

            # UsageMonthly for all products
            qpc = max(1, int(dp.total_queries) // max(1, consumers)) if consumers else 0
            usage_series = _usage_trend_series(consumers, ut / 5.0, qpc, rng)
            for us in usage_series:
                usage_monthly_batch.append(UsageMonthly(
                    data_product_id=dp.id,
                    month=us["month"],
                    consumers=us["consumers"],
                    queries=us["queries"],
                    bytes_scanned=rng.randint(0, 10_000_000),
                ))

        # ROIMonthly for anchor products + sample of generated
        roi_products = list(dp_map.values())
        roi_sample = rng.sample(generated_products, min(40, len(generated_products)))
        for dp in roi_products + roi_sample:
            mc = float(dp.monthly_cost)
            cv = float(dp.composite_value)
            roi_base = float(dp.roi) if dp.roi else 0
            for i, md in enumerate(MONTH_DATES):
                drift = rng.uniform(-0.05, 0.05)
                month_roi = round(max(0, roi_base + drift * i), 4)
                month_cost = round(mc * (1 + float(dp.cost_trend) / 100.0 * i / 5.0), 2)
                month_cv = round(month_cost * month_roi, 2)
                roi_monthly_batch.append(ROIMonthly(
                    data_product_id=dp.id,
                    month=md,
                    roi=month_roi,
                    cost=month_cost,
                    composite_value=month_cv,
                ))

        session.add_all(cost_monthly_batch)
        session.add_all(usage_monthly_batch)
        session.add_all(roi_monthly_batch)
        await session.flush()
        logger.info(f"  Phase 5: {len(cost_monthly_batch)} cost, {len(usage_monthly_batch)} usage, {len(roi_monthly_batch)} ROI rows")

        # ============================================================
        # Phase 6: PortfolioMonthly
        # ============================================================
        total_cost_base = sum(float(dp.monthly_cost) for dp in all_products)
        total_value_base = sum(float(dp.composite_value) for dp in all_products)
        total_consumers = sum(int(dp.monthly_consumers) for dp in all_products)

        for i, md in enumerate(MONTH_DATES):
            month_cost = round(total_cost_base * (1 + 0.015 * i), 2)
            month_value = round(total_value_base * (1 + 0.02 * i), 2)
            capital_freed = round(min(180000, i * 36000), 2)
            session.add(PortfolioMonthly(
                org_id=org_id,
                month=md,
                total_products=len(all_products),
                total_cost=month_cost,
                total_value=month_value,
                average_roi=round(month_value / month_cost, 4) if month_cost else 0,
                total_consumers=total_consumers,
                capital_freed_cumulative=capital_freed,
                budget_reallocated=round(capital_freed * 0.6, 2),
                decisions_executed=min(15, i * 3),
            ))
        await session.flush()
        logger.info("  Phase 6: 6 PortfolioMonthly rows")

        # ============================================================
        # Phase 7: Value Declarations + Versions
        # ============================================================
        vd_count = 0
        vdv_count = 0

        # Anchor value declarations
        anchor_vd_data = {
            "customer-360": {
                "declared_by": "Sarah Kim-Patel", "declared_by_title": "Head of Retail Banking",
                "method": ValueMethod.revenue_attribution, "value": 310000,
                "basis": "Drives personalization across 12M retail customers. Estimated $310K/mo attributed revenue lift from cross-sell/upsell optimization.",
                "status": ["peer_reviewed", "cfo_acknowledged"], "declared_at": date(2025, 12, 1),
                "next_review": date(2026, 6, 1), "is_expiring": False,
                "versions": [
                    {"version": 1, "value": 180000, "basis": "Initial estimate from pilot deployment across 2M customers.", "declared_at": date(2025, 1, 15), "change_note": None},
                    {"version": 2, "value": 240000, "basis": "Expanded to 8M customers. Attribution model validated at $240K/mo.", "declared_at": date(2025, 7, 1), "change_note": "Scaled from pilot to 8M customers. ROI validated."},
                    {"version": 3, "value": 310000, "basis": "Full 12M customer deployment. Cross-sell lift proven at $310K/mo.", "declared_at": date(2025, 12, 1), "change_note": "Full-scale rollout with proven attribution across all retail segments."},
                ],
            },
            "demand-forecast": {
                "declared_by": "James Blackwood", "declared_by_title": "Head of Global Markets",
                "method": ValueMethod.revenue_attribution, "value": 520000,
                "basis": "Powers trading desk demand predictions across 4 asset classes. $520K/mo in improved position sizing and reduced slippage.",
                "status": ["peer_reviewed", "cfo_acknowledged"], "declared_at": date(2025, 9, 15),
                "next_review": date(2026, 3, 15), "is_expiring": True,
                "versions": [
                    {"version": 1, "value": 520000, "basis": "Trading desk demand predictions across 4 asset classes.", "declared_at": date(2025, 9, 15), "change_note": None},
                ],
            },
            "fraud-detection": {
                "declared_by": "Elena Volkov", "declared_by_title": "Head of Risk & Compliance",
                "method": ValueMethod.cost_avoidance, "value": 890000,
                "basis": "Prevents estimated $890K/mo in fraudulent transactions. Detection rate 96.8%. Regulatory mandate (PSD2/AML).",
                "status": ["peer_reviewed", "cfo_acknowledged"], "declared_at": date(2025, 11, 1),
                "next_review": date(2026, 5, 1), "is_expiring": False,
                "versions": [
                    {"version": 1, "value": 620000, "basis": "Initial deployment. Detection rate 91%. $620K/mo prevented.", "declared_at": date(2025, 3, 1), "change_note": None},
                    {"version": 2, "value": 890000, "basis": "Model v2 with graph neural networks. Detection rate 96.8%. $890K/mo.", "declared_at": date(2025, 11, 1), "change_note": "GNN model upgrade improved detection rate from 91% to 96.8%."},
                ],
            },
            "reg-reporting": {
                "declared_by": "Friedrich Weber", "declared_by_title": "Chief Risk Officer",
                "method": ValueMethod.compliance, "value": 48000,
                "basis": "Mandatory regulatory reporting (Basel III/IV, DORA). Non-compliance risk: $2.4M/quarter in potential fines. Valued at infrastructure cost.",
                "status": ["peer_reviewed", "cfo_acknowledged"], "declared_at": date(2025, 6, 15),
                "next_review": date(2026, 3, 1), "is_expiring": True,
                "versions": [
                    {"version": 1, "value": 48000, "basis": "Mandatory regulatory reporting valued at infrastructure cost.", "declared_at": date(2025, 6, 15), "change_note": None},
                ],
            },
            "mktg-attribution": {
                "declared_by": "Sarah Kim-Patel", "declared_by_title": "Head of Retail Banking",
                "method": ValueMethod.revenue_attribution, "value": 142000,
                "basis": "Multi-touch attribution across $18M/quarter digital marketing spend. Optimizes ROAS yielding $142K/mo incremental revenue.",
                "status": ["peer_reviewed"], "declared_at": date(2025, 10, 1),
                "next_review": date(2026, 4, 1), "is_expiring": False,
                "versions": [
                    {"version": 1, "value": 142000, "basis": "Multi-touch attribution across $18M/quarter digital marketing spend.", "declared_at": date(2025, 10, 1), "change_note": None},
                ],
            },
        }

        for key, vd_info in anchor_vd_data.items():
            dp = dp_map[key]
            versions = vd_info.pop("versions")
            session.add(ValueDeclaration(
                data_product_id=dp.id,
                declared_by=vd_info["declared_by"],
                declared_by_title=vd_info["declared_by_title"],
                method=vd_info["method"],
                value=vd_info["value"],
                basis=vd_info["basis"],
                status=vd_info["status"],
                declared_at=vd_info["declared_at"],
                next_review=vd_info["next_review"],
                is_expiring=vd_info["is_expiring"],
            ))
            vd_count += 1
            for v in versions:
                session.add(ValueDeclarationVersion(
                    data_product_id=dp.id,
                    version=v["version"],
                    declared_by=vd_info["declared_by"],
                    declared_by_title=vd_info["declared_by_title"],
                    method=vd_info["method"],
                    value=v["value"],
                    basis=v["basis"],
                    declared_at=v["declared_at"],
                    change_note=v.get("change_note"),
                ))
                vdv_count += 1

        # Value declarations for generated products
        value_methods = [ValueMethod.revenue_attribution, ValueMethod.cost_avoidance,
                         ValueMethod.efficiency_gain, ValueMethod.compliance, ValueMethod.strategic]
        value_method_weights = [40, 25, 20, 10, 5]
        expiring_count = 0
        declarers = [(u.name, u.title) for u in user_map.values() if u.title and "Head" in u.title or "Chief" in u.title]
        if not declarers:
            declarers = [("Dr. Amara Okafor", "Chief Data Officer")]

        for dp in generated_products:
            if dp.declared_value is None or float(dp.declared_value) <= 0:
                continue
            # Stars: 100%, Core: 85%, Declining: 30%
            if dp.lifecycle_stage == LifecycleStage.draft:
                continue
            if dp.lifecycle_stage == LifecycleStage.decline and rng.random() > 0.3:
                continue
            if dp.lifecycle_stage in (LifecycleStage.active, LifecycleStage.mature) and rng.random() > 0.85:
                continue

            declarer = rng.choice(declarers)
            method = rng.choices(value_methods, weights=value_method_weights, k=1)[0]
            declared_at = date(2025, rng.randint(1, 12), rng.randint(1, 28))
            next_review = declared_at + timedelta(days=180)
            is_expiring = expiring_count < 12 and next_review <= date(2026, 3, 25)
            if is_expiring:
                expiring_count += 1

            session.add(ValueDeclaration(
                data_product_id=dp.id,
                declared_by=declarer[0],
                declared_by_title=declarer[1],
                method=method,
                value=float(dp.declared_value),
                basis=f"Declared value of ${int(float(dp.declared_value)):,}/mo based on {method.value.replace('_', ' ')} methodology.",
                status=["peer_reviewed"] if rng.random() < 0.7 else ["peer_reviewed", "cfo_acknowledged"],
                declared_at=declared_at,
                next_review=next_review,
                is_expiring=is_expiring,
            ))
            vd_count += 1

        await session.flush()
        logger.info(f"  Phase 7: {vd_count} value declarations, {vdv_count} versions")

        # ============================================================
        # Phase 8: Decisions + Comments + Actions + Economic Effects
        # ============================================================
        decisions: list[Decision] = []
        decision_map: dict[str, Decision] = {}  # key -> Decision for anchors

        # Anchor decisions (hand-crafted)
        anchor_decisions = [
            # Customer 360 — cost investigation (approved)
            {
                "key": "c360-cost-inv",
                "type": DecisionType.cost_investigation,
                "status": DecisionStatus.approved,
                "product_key": "customer-360",
                "title": "Investigate 8% cost spike in Customer 360 Platform",
                "description": "MoM cost increase from $76K to $82K driven by new real-time segmentation pipeline. Usage grew 15% concurrently — cost increase appears proportional to adoption.",
                "initiated_by": "Strata",
                "assigned_to": "Priya Sharma",
                "assigned_to_title": "Sr. Data Product Manager — Customer Intelligence",
                "estimated_impact": -6000,
                "actual_impact": -4200,
                "impact_basis": "Optimized Snowflake warehouse sizing and reduced redundant refreshes. $4.2K/mo savings.",
                "created_at": datetime(2026, 1, 20, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 2, 8, 14, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved. Warehouse auto-scaling tuned. Remaining cost increase justified by 15% usage growth and new real-time pipeline.",
                "capital_freed": 4200,
                "projected_savings_monthly": 6000,
                "projected_savings_annual": 72000,
                "impact_validation_status": "confirmed",
                "validation_start_date": datetime(2026, 2, 8, tzinfo=timezone.utc),
                "impact_confidence_score": 88,
                "actual_savings_measured": 4200,
                "variance_from_projection": 0.70,
            },
            # Customer 360 — pricing activation (approved)
            {
                "key": "c360-pricing",
                "type": DecisionType.pricing_activation,
                "status": DecisionStatus.approved,
                "product_key": "customer-360",
                "title": "Activate usage-based pricing for Customer 360 Platform",
                "description": "18 consumer teams, 1,240 users. Proposed model: $800/mo base + $1.50/query over 1,000 free tier. Projected revenue: $28K/mo.",
                "initiated_by": "Marcus Chen",
                "assigned_to": "Priya Sharma",
                "assigned_to_title": "Sr. Data Product Manager — Customer Intelligence",
                "estimated_impact": 28000,
                "actual_impact": 22000,
                "impact_basis": "Usage-based pricing activated. 14 of 18 teams opted in. Revenue lower than projected due to free tier usage.",
                "created_at": datetime(2025, 12, 1, 10, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2025, 12, 20, 16, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved and activated. Revenue tracking shows $22K/mo actual vs $28K projected. Adjusting free tier in Q2.",
                "capital_freed": 22000,
                "projected_savings_monthly": 28000,
                "projected_savings_annual": 336000,
                "impact_validation_status": "confirmed",
                "validation_start_date": datetime(2025, 12, 20, tzinfo=timezone.utc),
                "impact_confidence_score": 92,
                "actual_savings_measured": 22000,
                "variance_from_projection": 0.79,
            },
            # Global Demand Forecast — cost investigation (under_review)
            {
                "key": "gdf-cost-inv",
                "type": DecisionType.cost_investigation,
                "status": DecisionStatus.under_review,
                "product_key": "demand-forecast",
                "title": "Investigate 35% cost spike in Global Demand Forecast",
                "description": "Cost jumped from $107K to $145K due to model retraining on 3x expanded dataset. Databricks compute scaling driving increase.",
                "initiated_by": "Strata",
                "assigned_to": "Alex Nguyen",
                "assigned_to_title": "Sr. Data Product Manager — Trading Analytics",
                "estimated_impact": -38000,
                "actual_impact": None,
                "impact_basis": "Under investigation. Preliminary analysis suggests $15-25K savings possible through spot instances and caching.",
                "created_at": datetime(2026, 2, 10, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
                "capital_freed": 0,
                "projected_savings_monthly": 38000,
                "projected_savings_annual": 456000,
            },
            # Global Demand Forecast — AI project review (under_review)
            {
                "key": "gdf-ai-review",
                "type": DecisionType.ai_project_review,
                "status": DecisionStatus.under_review,
                "product_key": "demand-forecast",
                "title": "Review AI risk profile of Global Demand Forecast",
                "description": "Composite AI score 48/100. Model dependency risk elevated due to single-vendor retraining pipeline. 6 downstream products affected.",
                "initiated_by": "Dr. James Liu",
                "assigned_to": "Alex Nguyen",
                "assigned_to_title": "Sr. Data Product Manager — Trading Analytics",
                "estimated_impact": 0,
                "actual_impact": None,
                "impact_basis": "Risk assessment in progress. No direct cost impact but exposure to model failure affects $520K/mo value.",
                "created_at": datetime(2026, 2, 15, 10, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
                "capital_freed": 0,
                "projected_savings_monthly": 0,
                "projected_savings_annual": 0,
            },
            # Fraud Detection — cost investigation (approved)
            {
                "key": "fraud-cost-inv",
                "type": DecisionType.cost_investigation,
                "status": DecisionStatus.approved,
                "product_key": "fraud-detection",
                "title": "Investigate 45% cost spike in Fraud Detection Signals",
                "description": "Cost increased from $145K to $210K. Driven by GNN model deployment requiring 3x GPU compute. Detection rate improved from 91% to 96.8%.",
                "initiated_by": "Strata",
                "assigned_to": "Jun Park",
                "assigned_to_title": "Data Product Manager — Risk Models",
                "estimated_impact": -15000,
                "actual_impact": -12000,
                "impact_basis": "Optimized GPU scheduling and batch inference. $12K/mo savings. Remaining increase justified by regulatory mandate.",
                "created_at": datetime(2026, 1, 5, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 1, 25, 14, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved. GPU optimization applied. $65K/mo increase justified: detection rate from 91% to 96.8% prevents additional $270K/mo in fraud.",
                "capital_freed": 12000,
                "projected_savings_monthly": 15000,
                "projected_savings_annual": 180000,
                "impact_validation_status": "confirmed",
                "validation_start_date": datetime(2026, 1, 25, tzinfo=timezone.utc),
                "impact_confidence_score": 95,
                "actual_savings_measured": 12000,
                "variance_from_projection": 0.80,
            },
            # Legacy CRM — retirement (under_review)
            {
                "key": "crm-retire",
                "type": DecisionType.retirement,
                "status": DecisionStatus.under_review,
                "product_key": "legacy-crm",
                "title": "Retire Legacy CRM Extract — 98.6% usage decline, 12 remaining consumers",
                "description": "Peak usage 890 consumers, now 12. $67K/mo cost with 0.12x ROI. All data migrated to Customer 360. 12 holdout users in LATAM branch need transition support.",
                "initiated_by": "Strata",
                "assigned_to": "Ryan O'Sullivan",
                "assigned_to_title": "Principal Data Engineer",
                "estimated_impact": 67000,
                "actual_impact": None,
                "impact_basis": "Full monthly cost elimination. Largest single savings opportunity in portfolio. 12 consumers need migration path.",
                "created_at": datetime(2026, 2, 5, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
                "capital_freed": 0,
                "projected_savings_monthly": 67000,
                "projected_savings_annual": 804000,
            },
            # Legacy CRM — low ROI review (approved earlier)
            {
                "key": "crm-low-roi",
                "type": DecisionType.low_roi_review,
                "status": DecisionStatus.approved,
                "product_key": "legacy-crm",
                "title": "Review critically low ROI (0.12x) for Legacy CRM Extract",
                "description": "ROI has been below 0.5x for 6+ months. Product classified as critical. Migration plan required.",
                "initiated_by": "Strata",
                "assigned_to": "Ryan O'Sullivan",
                "assigned_to_title": "Principal Data Engineer",
                "estimated_impact": 0,
                "actual_impact": 0,
                "impact_basis": "Review confirmed product is obsolete. Retirement decision created separately. No immediate cost action — awaiting consumer migration.",
                "created_at": datetime(2025, 11, 15, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2025, 12, 10, 14, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved. Product confirmed obsolete. Retirement workflow initiated. Consumers notified of migration timeline (Q1 2026).",
                "capital_freed": 0,
                "projected_savings_monthly": 0,
                "projected_savings_annual": 0,
                "impact_validation_status": "confirmed",
                "validation_start_date": datetime(2025, 12, 10, tzinfo=timezone.utc),
                "impact_confidence_score": 100,
                "actual_savings_measured": 0,
                "variance_from_projection": 1.0,
            },
            # Regulatory Reporting — low ROI review (rejected)
            {
                "key": "reg-low-roi",
                "type": DecisionType.low_roi_review,
                "status": DecisionStatus.rejected,
                "product_key": "reg-reporting",
                "title": "Review 1.0x ROI for Regulatory Reporting Pack",
                "description": "ROI at exactly 1.0x. Triggered by low-ROI policy. However, product is compliance-mandated (Basel III/IV, DORA).",
                "initiated_by": "Strata",
                "assigned_to": "Ahmed Hassan",
                "assigned_to_title": "Data Product Manager — Compliance",
                "estimated_impact": 0,
                "actual_impact": 0,
                "impact_basis": "No cost action. Product is regulatory mandate. Non-compliance penalty: $2.4M/quarter.",
                "created_at": datetime(2026, 1, 10, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 1, 18, 11, 0, 0, tzinfo=timezone.utc),
                "resolution": "Rejected. Product is compliance-mandated (Basel III/IV, DORA). ROI methodology not applicable to regulatory requirements. Exemption flag added.",
                "capital_freed": 0,
                "projected_savings_monthly": 0,
                "projected_savings_annual": 0,
            },
            # Regulatory Reporting — value revalidation (under_review)
            {
                "key": "reg-revalidation",
                "type": DecisionType.value_revalidation,
                "status": DecisionStatus.under_review,
                "product_key": "reg-reporting",
                "title": "Revalidate Regulatory Reporting Pack value declaration — expiring Mar 1",
                "description": "Current $48K/mo compliance valuation expires in 4 days. CRO acknowledgment required. Regulatory scope unchanged.",
                "initiated_by": "Strata",
                "assigned_to": "Ahmed Hassan",
                "assigned_to_title": "Data Product Manager — Compliance",
                "estimated_impact": 0,
                "actual_impact": None,
                "impact_basis": "No direct cost impact. Failure to revalidate removes $48K/mo from declared portfolio value.",
                "created_at": datetime(2026, 2, 20, 10, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
                "capital_freed": 0,
                "projected_savings_monthly": 0,
                "projected_savings_annual": 0,
            },
            # Marketing Attribution — pricing activation (approved)
            {
                "key": "mktg-pricing",
                "type": DecisionType.pricing_activation,
                "status": DecisionStatus.approved,
                "product_key": "mktg-attribution",
                "title": "Activate usage-based pricing for Marketing Attribution Hub",
                "description": "520 consumers across 14 teams. Proposed: $600/mo base + $1.00/query over 2,000 free tier. Projected revenue: $18K/mo.",
                "initiated_by": "Marcus Chen",
                "assigned_to": "Nina Petrov",
                "assigned_to_title": "Data Product Manager — Digital Banking",
                "estimated_impact": 18000,
                "actual_impact": 15500,
                "impact_basis": "Pricing activated. 12 of 14 teams opted in. Revenue $15.5K/mo vs $18K projected.",
                "created_at": datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 2, 1, 16, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved and activated. Usage-based pricing live. Early adoption metrics positive.",
                "capital_freed": 15500,
                "projected_savings_monthly": 18000,
                "projected_savings_annual": 216000,
                "impact_validation_status": "validating",
                "validation_start_date": datetime(2026, 2, 1, tzinfo=timezone.utc),
                "impact_confidence_score": 72,
                "actual_savings_measured": 15500,
                "variance_from_projection": 0.86,
            },
        ]

        for ad in anchor_decisions:
            key = ad.pop("key")
            product_key = ad.pop("product_key")
            dp = dp_map[product_key]
            ad["product_id"] = dp.id
            ad["product_name"] = dp.name
            ad.setdefault("updated_at", ad.get("resolved_at") or datetime(2026, 2, 22, 9, 0, 0, tzinfo=timezone.utc))

            dec = Decision(org_id=org_id, **ad)
            session.add(dec)
            decisions.append(dec)
            decision_map[key] = dec

        await session.flush()

        # Generate additional decisions to reach 45 total
        remaining_decisions = 45 - len(anchor_decisions)
        decision_templates = [
            (DecisionType.retirement, DecisionStatus.approved, 2),
            (DecisionType.retirement, DecisionStatus.under_review, 5),
            (DecisionType.retirement, DecisionStatus.rejected, 1),
            (DecisionType.retirement, DecisionStatus.delayed, 1),
            (DecisionType.cost_investigation, DecisionStatus.approved, 2),
            (DecisionType.cost_investigation, DecisionStatus.under_review, 2),
            (DecisionType.cost_investigation, DecisionStatus.rejected, 1),
            (DecisionType.value_revalidation, DecisionStatus.approved, 1),
            (DecisionType.value_revalidation, DecisionStatus.under_review, 3),
            (DecisionType.low_roi_review, DecisionStatus.approved, 1),
            (DecisionType.low_roi_review, DecisionStatus.rejected, 1),
            (DecisionType.low_roi_review, DecisionStatus.under_review, 2),
            (DecisionType.pricing_activation, DecisionStatus.under_review, 1),
            (DecisionType.ai_project_review, DecisionStatus.approved, 1),
            (DecisionType.ai_project_review, DecisionStatus.under_review, 1),
            (DecisionType.ai_project_review, DecisionStatus.rejected, 1),
            (DecisionType.capital_reallocation, DecisionStatus.approved, 1),
            (DecisionType.capital_reallocation, DecisionStatus.under_review, 1),
            (DecisionType.portfolio_change, DecisionStatus.approved, 1),
        ]

        gen_decision_pool = [dp for dp in generated_products if float(dp.monthly_cost) > 5000]
        if not gen_decision_pool:
            gen_decision_pool = generated_products[:remaining_decisions]

        for dt, ds, count in decision_templates:
            for _ in range(count):
                if not gen_decision_pool:
                    break
                target_dp = gen_decision_pool.pop(rng.randint(0, len(gen_decision_pool) - 1))
                is_approved = ds == DecisionStatus.approved
                created = datetime(2026, rng.randint(1, 2), rng.randint(1, 25), rng.randint(8, 17), 0, 0, tzinfo=timezone.utc)
                resolved = created + timedelta(days=rng.randint(5, 20)) if is_approved or ds == DecisionStatus.rejected else None
                assignee = rng.choice(list(user_map.values()))

                dec = Decision(
                    org_id=org_id,
                    type=dt,
                    status=ds,
                    product_id=target_dp.id,
                    product_name=target_dp.name,
                    title=f"{dt.value.replace('_', ' ').title()}: {target_dp.name}",
                    description=f"Auto-generated {dt.value} decision for {target_dp.name}. Monthly cost: ${int(float(target_dp.monthly_cost)):,}.",
                    initiated_by="Strata" if rng.random() < 0.7 else assignee.name,
                    assigned_to=assignee.name,
                    assigned_to_title=assignee.title,
                    estimated_impact=round(float(target_dp.monthly_cost) * rng.uniform(0.1, 0.8), 2),
                    actual_impact=round(float(target_dp.monthly_cost) * rng.uniform(0.05, 0.6), 2) if is_approved else None,
                    impact_basis=f"Impact assessment for {target_dp.name}.",
                    created_at=created,
                    updated_at=resolved or created + timedelta(days=rng.randint(1, 10)),
                    resolved_at=resolved,
                    resolution=f"Decision {ds.value} for {target_dp.name}." if resolved else None,
                    capital_freed=round(float(target_dp.monthly_cost) * rng.uniform(0.05, 0.5), 2) if is_approved else 0,
                    projected_savings_monthly=round(float(target_dp.monthly_cost) * rng.uniform(0.1, 0.6), 2),
                    projected_savings_annual=round(float(target_dp.monthly_cost) * rng.uniform(1.2, 7.2), 2),
                    impact_validation_status=rng.choice(["confirmed", "validating", "underperforming"]) if is_approved else "pending",
                    validation_start_date=resolved if is_approved else None,
                    impact_confidence_score=rng.randint(55, 98) if is_approved else None,
                )
                if ds == DecisionStatus.delayed:
                    dec.delay_reason = "Pending stakeholder alignment and consumer migration plan."
                    dec.delayed_until = datetime(2026, 3, 15, tzinfo=timezone.utc)
                session.add(dec)
                decisions.append(dec)

        await session.flush()

        # Decision comments, actions, economic effects
        comment_count = 0
        action_count = 0
        effect_count = 0

        for dec in decisions:
            user = rng.choice(list(user_map.values()))

            # Actions: every decision gets "created"
            session.add(DecisionAction(
                decision_id=dec.id, user_id=user.id,
                action_type="created", payload=None,
                created_at=dec.created_at,
            ))
            action_count += 1

            # Comments: 1-3 per decision
            n_comments = rng.randint(1, 3)
            for ci in range(n_comments):
                commenter = rng.choice(list(user_map.values()))
                comment_time = dec.created_at + timedelta(hours=rng.randint(1, 72 * (ci + 1)))
                session.add(DecisionComment(
                    decision_id=dec.id, user_id=commenter.id, user_name=commenter.name,
                    comment=f"Review comment {ci + 1} on {dec.product_name}: assessing {dec.type.value} implications.",
                    created_at=comment_time,
                ))
                session.add(DecisionAction(
                    decision_id=dec.id, user_id=commenter.id,
                    action_type="commented", payload=None,
                    created_at=comment_time,
                ))
                comment_count += 1
                action_count += 1

            # Approval/rejection action
            if dec.status in (DecisionStatus.approved, DecisionStatus.rejected):
                session.add(DecisionAction(
                    decision_id=dec.id, user_id=user.id,
                    action_type=dec.status.value, payload=None,
                    created_at=dec.resolved_at or dec.updated_at,
                ))
                action_count += 1

            # Economic effects for approved decisions
            if dec.status == DecisionStatus.approved and float(dec.capital_freed) > 0:
                effect_type = "capital_freed" if dec.type == DecisionType.retirement else "cost_saved"
                monthly = float(dec.capital_freed)
                session.add(DecisionEconomicEffect(
                    decision_id=dec.id,
                    effect_type=effect_type,
                    amount_usd_monthly=monthly,
                    amount_usd_annual=monthly * 12,
                    confidence=round(rng.uniform(0.7, 0.95), 3),
                    calc_explainer=f"{effect_type.replace('_', ' ').title()} from {dec.product_name}: ${int(monthly):,}/mo.",
                    created_at=dec.resolved_at or dec.updated_at,
                ))
                effect_count += 1

        await session.flush()
        logger.info(f"  Phase 8: {len(decisions)} decisions, {comment_count} comments, {action_count} actions, {effect_count} effects")

        # ============================================================
        # Phase 9: Capital Events
        # ============================================================
        capital_event_count = 0
        for dec in decisions:
            if dec.status != DecisionStatus.approved or float(dec.capital_freed) <= 0:
                continue
            event_type_map = {
                DecisionType.retirement: CapitalEventType.retirement_freed,
                DecisionType.cost_investigation: CapitalEventType.cost_optimization,
                DecisionType.pricing_activation: CapitalEventType.pricing_revenue,
                DecisionType.ai_project_review: CapitalEventType.ai_spend_reduced,
                DecisionType.capital_reallocation: CapitalEventType.reallocation,
            }
            ce_type = event_type_map.get(dec.type, CapitalEventType.cost_optimization)
            session.add(CapitalEvent(
                org_id=org_id,
                decision_id=dec.id,
                product_id=dec.product_id,
                event_type=ce_type,
                amount=float(dec.capital_freed),
                description=f"{ce_type.value.replace('_', ' ').title()} from {dec.product_name}: ${int(float(dec.capital_freed)):,}/mo",
                effective_date=(dec.resolved_at or dec.updated_at).date() if (dec.resolved_at or dec.updated_at) else date(2026, 2, 1),
            ))
            capital_event_count += 1

        await session.flush()
        logger.info(f"  Phase 9: {capital_event_count} capital events")

        # ============================================================
        # Phase 10: Connectors + Source Assets + Asset Mappings
        # ============================================================
        connectors_raw = [
            {"name": "Production Snowflake (NA)", "type": ConnectorType.snowflake, "products": 120, "cost_cov": 0.94, "usage_cov": 0.95},
            {"name": "Production Snowflake (EMEA)", "type": ConnectorType.snowflake, "products": 45, "cost_cov": 0.91, "usage_cov": 0.92},
            {"name": "ML Platform (Databricks)", "type": ConnectorType.databricks, "products": 80, "cost_cov": 0.72, "usage_cov": 0.88},
            {"name": "BI Platform (Power BI)", "type": ConnectorType.power_bi, "products": 28, "cost_cov": 0.85, "usage_cov": 0.90},
            {"name": "Data Lake (S3)", "type": ConnectorType.s3, "products": 42, "cost_cov": 0.88, "usage_cov": 0.82},
            {"name": "Discovery Replay", "type": ConnectorType.discovery_replay, "products": 0, "cost_cov": 0.90, "usage_cov": 0.90},
        ]

        connector_ids: list[uuid.UUID] = []
        for cr in connectors_raw:
            conn = ConnectorConfig(
                org_id=org_id,
                name=cr["name"],
                connector_type=cr["type"],
                status=ConnectorStatus.connected,
                last_sync_at=datetime(2026, 2, 22, rng.randint(18, 23), 0, 0, tzinfo=timezone.utc),
                products_found=cr["products"],
                cost_coverage=cr["cost_cov"],
                usage_coverage=cr["usage_cov"],
            )
            session.add(conn)
            await session.flush()
            connector_ids.append(conn.id)

        # Source assets (~200)
        sa_count = 0
        sa_ids: list[uuid.UUID] = []
        schemas = ["ANALYTICS", "FINANCE", "RISK", "OPERATIONS", "MARKETING", "HR", "RAW", "STAGING"]
        table_names_pool = [
            "customer_events", "daily_transactions", "risk_scores", "trade_executions",
            "payment_flows", "claim_submissions", "policy_holders", "market_data",
            "employee_records", "vendor_invoices", "campaign_metrics", "loan_applications",
            "credit_scores", "portfolio_positions", "regulatory_reports", "fraud_alerts",
            "user_sessions", "product_usage", "cost_allocations", "revenue_attribution",
        ]

        for i in range(200):
            conn_id = rng.choice(connector_ids[:5])  # First 5 (not discovery)
            platform = "snowflake" if i < 120 else ("databricks" if i < 170 else ("powerbi" if i < 190 else "s3"))
            schema = rng.choice(schemas)
            tname = rng.choice(table_names_pool) + f"_{i:03d}"
            if platform == "snowflake":
                qn = f"PROD_DW.{schema}.{tname.upper()}"
            elif platform == "databricks":
                qn = f"hive_metastore.{schema.lower()}.{tname}"
            elif platform == "powerbi":
                qn = f"powerbi://workspace/apex-analytics/{tname.replace('_', ' ').title()}"
            else:
                qn = f"s3://apex-data-lake/{schema.lower()}/{tname}.parquet"

            sa_id = _det_uuid(rng)
            sa = SourceAsset(
                id=sa_id,
                connector_id=conn_id,
                org_id=org_id,
                external_id=f"sa-{i:04d}",
                asset_name=tname,
                asset_type="table" if platform in ("snowflake", "databricks") else ("dataset" if platform == "powerbi" else "object"),
                platform=platform,
                qualified_name=qn,
                display_name=tname.replace("_", " ").title(),
                owner_hint=rng.choice([u.email for u in user_map.values()]) if rng.random() < 0.7 else None,
                tags_json=[schema.lower(), platform],
            )
            session.add(sa)
            sa_ids.append(sa_id)
            sa_count += 1

        await session.flush()

        # Asset mappings: link source assets to products
        mapping_count = 0
        for dp in all_products[:150]:  # Map first 150 products
            n_assets = rng.randint(1, 5)
            asset_sample = rng.sample(range(len(sa_ids)), min(n_assets, len(sa_ids)))
            for ai in asset_sample:
                session.add(AssetMapping(
                    source_asset_id=sa_ids[ai],
                    data_product_id=dp.id,
                    mapping_type="primary",
                    mapping_role=rng.choice(["primary", "derived", "consumption"]),
                ))
                mapping_count += 1

        await session.flush()
        logger.info(f"  Phase 10: {len(connector_ids)} connectors, {sa_count} source assets, {mapping_count} mappings")

        # ============================================================
        # Phase 10b: Connector Depth — BigQuery + Sync Logs + Extraction Meta + Field Provenance
        # ============================================================

        # Add BigQuery connector
        bq_conn = ConnectorConfig(
            org_id=org_id,
            name="BigQuery Analytics",
            connector_type=ConnectorType.bigquery,
            status=ConnectorStatus.connected,
            last_sync_at=datetime(2026, 2, 24, 14, 0, 0, tzinfo=timezone.utc),
            products_found=35,
            cost_coverage=0.90,
            usage_coverage=0.87,
            credentials={"seed": "bq-apex-42"},
        )
        session.add(bq_conn)
        await session.flush()
        connector_ids.append(bq_conn.id)

        # BigQuery source assets (35)
        bq_datasets = ["finance", "marketing", "operations", "data_engineering", "ml_platform"]
        bq_tables = [
            "revenue_daily", "customer_segments", "campaign_performance",
            "cost_allocation", "order_events", "product_inventory",
            "user_activity_log", "demand_forecast", "churn_predictions",
            "supply_chain_metrics", "hr_headcount", "compliance_audit",
        ]
        for i in range(35):
            ds = rng.choice(bq_datasets)
            tbl = rng.choice(bq_tables)
            qn = f"apex-analytics.{ds}.{tbl}_{i:03d}"
            sa_id = _det_uuid(rng)
            session.add(SourceAsset(
                id=sa_id,
                connector_id=bq_conn.id,
                org_id=org_id,
                external_id=f"bq-{i:04d}",
                asset_name=f"{tbl}_{i:03d}",
                asset_type="table",
                platform="bigquery",
                qualified_name=qn,
                display_name=f"{tbl}_{i:03d}".replace("_", " ").title(),
                tags_json=[ds, "bigquery"],
            ))
            sa_ids.append(sa_id)

        await session.flush()

        # Sync logs: 5 historical entries per connector (past 30 days)
        sync_log_count = 0
        all_connector_ids = connector_ids  # all 7 now
        for ci, conn_id in enumerate(all_connector_ids):
            for s in range(5):
                days_ago = 28 - (s * 6)  # Spread over past 30 days
                started = datetime(2026, 2, max(1, 26 - days_ago), rng.randint(1, 6), 0, 0, tzinfo=timezone.utc)
                duration = rng.randint(45, 600)  # 45s to 10min
                ended = started + timedelta(seconds=duration)

                # Occasional partial sync (1 in 10)
                status = SyncStatus.success
                errors = None
                if rng.random() < 0.1:
                    status = SyncStatus.partial
                    errors = [{"type": "timeout", "message": f"Timeout fetching batch {rng.randint(3, 12)} of usage events", "timestamp": ended.isoformat()}]

                objects_disc = rng.randint(15, 200)
                objects_upd = rng.randint(0, objects_disc // 3)
                objects_del = rng.randint(0, 3)

                diff_added = [f"asset_{rng.randint(1, 999):04d}" for _ in range(rng.randint(0, 3))]
                diff_removed = [f"asset_{rng.randint(1, 999):04d}" for _ in range(rng.randint(0, 1))]
                diff_changed = [f"asset_{rng.randint(1, 999):04d}" for _ in range(objects_upd)]

                session.add(ConnectorSyncLog(
                    connector_id=conn_id,
                    org_id=org_id,
                    sync_started_at=started,
                    sync_ended_at=ended,
                    status=status,
                    objects_discovered=objects_disc,
                    objects_updated=objects_upd,
                    objects_deleted=objects_del,
                    usage_events_fetched=rng.randint(500, 20000),
                    cost_events_fetched=rng.randint(50, 2000),
                    errors=errors,
                    diff_summary={"added": diff_added, "removed": diff_removed, "changed": diff_changed[:5]},
                ))
                sync_log_count += 1

        await session.flush()

        # Extraction capabilities per connector
        from app.connectors.extractors import get_extractor

        # Map connector type to platform for extractor lookup
        platform_for_connector = {
            0: "snowflake", 1: "snowflake", 2: "databricks",
            3: None, 4: None, 5: None, 6: "bigquery",
        }
        extraction_count = 0
        for ci, conn_id in enumerate(all_connector_ids):
            platform = platform_for_connector.get(ci)
            extractor = get_extractor(platform) if platform else None

            if extractor:
                caps = extractor.generate_capabilities()
            else:
                # Generic capabilities for power_bi, s3, discovery_replay
                caps = [
                    {"capability_category": "schema_metadata", "capability_name": "Table and column discovery", "is_available": True, "requires_elevated_access": False, "extraction_method": "Platform API", "refresh_frequency": "per-sync"},
                    {"capability_category": "usage_metrics", "capability_name": "Access logs and query counts", "is_available": True, "requires_elevated_access": False, "extraction_method": "Platform API", "refresh_frequency": "daily"},
                    {"capability_category": "cost_attribution", "capability_name": "Resource cost tracking", "is_available": ci != 5, "requires_elevated_access": False, "extraction_method": "Platform billing API", "refresh_frequency": "daily"},
                    {"capability_category": "access_control", "capability_name": "Permission and role mapping", "is_available": ci != 4, "requires_elevated_access": False, "extraction_method": "Platform IAM API", "refresh_frequency": "per-sync"},
                ]

            for cap in caps:
                session.add(ConnectorExtractionMeta(
                    connector_id=conn_id,
                    org_id=org_id,
                    capability_category=cap["capability_category"],
                    capability_name=cap["capability_name"],
                    is_available=cap["is_available"],
                    requires_elevated_access=cap.get("requires_elevated_access", False),
                    extraction_method=cap["extraction_method"],
                    refresh_frequency=cap.get("refresh_frequency", "per-sync"),
                ))
                extraction_count += 1

        await session.flush()

        # Field provenance: for each mapped product, create 6 provenance records
        provenance_count = 0
        # Build connector lookup: source_asset_id -> connector
        sa_connector_map: dict[uuid.UUID, tuple[uuid.UUID, str]] = {}
        for i, sa_id_val in enumerate(sa_ids):
            if i < 120:
                plat = "snowflake"
                c_id = connector_ids[0] if i < 60 else connector_ids[1]
            elif i < 170:
                plat = "databricks"
                c_id = connector_ids[2]
            elif i < 190:
                plat = "power_bi"
                c_id = connector_ids[3]
            elif i < 200:
                plat = "s3"
                c_id = connector_ids[4]
            else:  # BigQuery assets
                plat = "bigquery"
                c_id = connector_ids[6]
            sa_connector_map[sa_id_val] = (c_id, plat)

        # Provenance field definitions per platform
        provenance_fields = {
            "snowflake": {
                "monthly_cost": ("SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY", AutomationLevel.fully_automated, 0.95),
                "monthly_consumers": ("SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY", AutomationLevel.fully_automated, 0.92),
                "composite_value": ("Computed from cost + usage + trust metrics", AutomationLevel.fully_automated, 0.90),
                "trust_score": ("SNOWFLAKE.ACCOUNT_USAGE.DATA_QUALITY_MONITORING_RESULTS", AutomationLevel.semi_automated, 0.80),
                "usage_trend": ("SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY", AutomationLevel.fully_automated, 0.88),
                "cost_trend": ("SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY", AutomationLevel.fully_automated, 0.93),
            },
            "databricks": {
                "monthly_cost": ("system.billing.usage (DBU consumption)", AutomationLevel.fully_automated, 0.93),
                "monthly_consumers": ("system.query.history (SQL Warehouse query log)", AutomationLevel.fully_automated, 0.90),
                "composite_value": ("Computed from cost + usage + trust metrics", AutomationLevel.fully_automated, 0.88),
                "trust_score": ("Unity Catalog data quality expectations", AutomationLevel.semi_automated, 0.78),
                "usage_trend": ("system.query.history", AutomationLevel.fully_automated, 0.87),
                "cost_trend": ("system.billing.usage", AutomationLevel.fully_automated, 0.91),
            },
            "bigquery": {
                "monthly_cost": ("Cloud Billing Export to BigQuery", AutomationLevel.fully_automated, 0.94),
                "monthly_consumers": ("INFORMATION_SCHEMA.JOBS (query job history)", AutomationLevel.fully_automated, 0.91),
                "composite_value": ("Computed from cost + usage + trust metrics", AutomationLevel.fully_automated, 0.89),
                "trust_score": ("BigQuery Data Quality Tasks API", AutomationLevel.semi_automated, 0.79),
                "usage_trend": ("INFORMATION_SCHEMA.JOBS", AutomationLevel.fully_automated, 0.86),
                "cost_trend": ("Cloud Billing Export", AutomationLevel.fully_automated, 0.92),
            },
            "power_bi": {
                "monthly_cost": ("Power BI REST API (capacity metrics)", AutomationLevel.semi_automated, 0.78),
                "monthly_consumers": ("Power BI Activity Events API", AutomationLevel.semi_automated, 0.75),
                "composite_value": ("Computed from cost + usage + trust", AutomationLevel.semi_automated, 0.72),
                "trust_score": ("Manual assessment + data quality rules", AutomationLevel.manual, 0.60),
                "usage_trend": ("Power BI Activity Events API", AutomationLevel.semi_automated, 0.73),
                "cost_trend": ("Power BI REST API", AutomationLevel.semi_automated, 0.76),
            },
            "s3": {
                "monthly_cost": ("AWS Cost Explorer API", AutomationLevel.semi_automated, 0.82),
                "monthly_consumers": ("S3 Server Access Logging + CloudTrail", AutomationLevel.semi_automated, 0.70),
                "composite_value": ("Computed from cost + usage + trust", AutomationLevel.semi_automated, 0.72),
                "trust_score": ("AWS Config rules + manual checks", AutomationLevel.manual, 0.55),
                "usage_trend": ("S3 Server Access Logging", AutomationLevel.semi_automated, 0.68),
                "cost_trend": ("AWS Cost Explorer API", AutomationLevel.semi_automated, 0.80),
            },
        }

        now = datetime.now(timezone.utc)
        seen_product_fields: set[tuple[uuid.UUID, str]] = set()

        for dp in all_products[:180]:
            # Find which connector this product maps to (via first asset mapping)
            # Use approximate heuristic based on product index
            dp_idx = all_products.index(dp) if dp in all_products else 0
            # Pick a source asset linked to this product
            if dp_idx < len(sa_ids):
                linked_sa_id = sa_ids[dp_idx % len(sa_ids)]
            else:
                linked_sa_id = rng.choice(sa_ids)

            c_id, plat = sa_connector_map.get(linked_sa_id, (connector_ids[0], "snowflake"))
            fields = provenance_fields.get(plat, provenance_fields["snowflake"])

            for field_name, (method, level, conf) in fields.items():
                key = (dp.id, field_name)
                if key in seen_product_fields:
                    continue
                seen_product_fields.add(key)

                session.add(FieldProvenance(
                    org_id=org_id,
                    data_product_id=dp.id,
                    field_name=field_name,
                    source_connector_id=c_id,
                    source_platform=plat,
                    extraction_method=method,
                    automation_level=level,
                    confidence=conf,
                    last_observed_at=now - timedelta(hours=rng.randint(1, 72)),
                    observation_count=rng.randint(5, 30),
                ))
                provenance_count += 1

        await session.flush()
        logger.info(f"  Phase 10b: 1 BigQuery connector, {sync_log_count} sync logs, {extraction_count} extraction meta, {provenance_count} field provenances")

        # ============================================================
        # Phase 10c: Lineage Graph — Nodes + Edges
        # ============================================================

        # Build a realistic lineage graph:
        #   source_systems → databases → schemas → tables → views/dbt_models → datasets/data_products → dashboards/reports → metrics
        # Each anchor product gets a fully traced lineage chain.

        lineage_node_map: dict[str, uuid.UUID] = {}  # qualified_name -> node_id
        _pending_edges: list[LineageEdge] = []  # collect edges; flush nodes first

        def _add_lineage_node(
            ntype: LineageNodeType, name: str, qname: str, plat: str,
            dom: str | None = None, dp_id: uuid.UUID | None = None, sa_id: uuid.UUID | None = None,
            prov: LineageProvenance = LineageProvenance.automated, conf: float = 1.0,
            owner_id: uuid.UUID | None = None,
        ) -> uuid.UUID:
            nid = _det_uuid(rng)
            session.add(LineageNode(
                id=nid, org_id=org_id, node_type=ntype, name=name, qualified_name=qname,
                platform=plat, domain=dom, owner_user_id=owner_id,
                tags=[plat, ntype.value], provenance=prov, confidence=conf,
                data_product_id=dp_id, source_asset_id=sa_id,
                metadata_json={}, last_synced_at=now - timedelta(hours=rng.randint(1, 48)),
            ))
            lineage_node_map[qname] = nid
            return nid

        def _add_lineage_edge(
            from_qn: str, to_qn: str, etype: LineageEdgeType, plat: str | None = None,
            prov: LineageProvenance = LineageProvenance.automated, conf: float = 1.0,
        ) -> None:
            fid = lineage_node_map.get(from_qn)
            tid = lineage_node_map.get(to_qn)
            if fid and tid:
                _pending_edges.append(LineageEdge(
                    id=_det_uuid(rng), org_id=org_id, from_node_id=fid, to_node_id=tid,
                    edge_type=etype, platform=plat, provenance=prov, confidence=conf,
                    metadata_json={},
                ))

        # --- Source Systems ---
        source_systems = [
            ("Snowflake NA", "snowflake"),
            ("Snowflake EMEA", "snowflake"),
            ("Databricks ML Platform", "databricks"),
            ("Power BI", "power_bi"),
            ("AWS S3 Data Lake", "s3"),
            ("BigQuery Analytics", "bigquery"),
            ("Salesforce CRM", "salesforce"),
            ("SAP Finance", "sap"),
        ]
        for ss_name, ss_plat in source_systems:
            _add_lineage_node(LineageNodeType.source_system, ss_name, f"source://{ss_plat}/{ss_name.lower().replace(' ', '_')}", ss_plat)

        # --- Databases ---
        databases = [
            ("PROD_DW", "snowflake"), ("RAW_VAULT", "snowflake"), ("ANALYTICS", "snowflake"),
            ("hive_metastore", "databricks"), ("main", "databricks"),
            ("apex-analytics", "bigquery"),
        ]
        for db_name, db_plat in databases:
            qn = f"db://{db_plat}/{db_name}"
            _add_lineage_node(LineageNodeType.database, db_name, qn, db_plat)
            # Edge: source_system → database
            ss_qn = [s for s in lineage_node_map if s.startswith(f"source://{db_plat}/")][0]
            _add_lineage_edge(ss_qn, qn, LineageEdgeType.physical_lineage, db_plat)

        # --- Schemas ---
        schema_defs = [
            ("FINANCE", "PROD_DW", "snowflake"), ("MARKETING", "PROD_DW", "snowflake"),
            ("OPERATIONS", "PROD_DW", "snowflake"), ("RISK", "PROD_DW", "snowflake"),
            ("CUSTOMER", "PROD_DW", "snowflake"), ("RAW", "RAW_VAULT", "snowflake"),
            ("STAGING", "RAW_VAULT", "snowflake"), ("GOLD", "ANALYTICS", "snowflake"),
            ("bronze", "hive_metastore", "databricks"), ("silver", "hive_metastore", "databricks"),
            ("gold", "main", "databricks"),
            ("finance", "apex-analytics", "bigquery"), ("marketing", "apex-analytics", "bigquery"),
        ]
        for sch_name, db_nm, plat in schema_defs:
            qn = f"schema://{plat}/{db_nm}.{sch_name}"
            _add_lineage_node(LineageNodeType.schema, sch_name, qn, plat)
            _add_lineage_edge(f"db://{plat}/{db_nm}", qn, LineageEdgeType.physical_lineage, plat)

        # --- Tables (1000+) ---
        table_prefixes = {
            "FINANCE": ["revenue_daily", "cost_center", "gl_journal", "budget_vs_actual", "invoice_line",
                         "vendor_payment", "intercompany_transfer", "fx_rates", "tax_provision", "amortization_schedule"],
            "MARKETING": ["campaign_performance", "lead_conversion", "channel_attribution", "ad_spend",
                           "email_engagement", "social_media_metrics", "seo_rankings", "customer_acquisition"],
            "OPERATIONS": ["trade_execution", "settlement_queue", "kyc_verification", "payment_flow",
                            "reconciliation_break", "wire_transfer", "batch_processing", "service_request"],
            "RISK": ["credit_score", "var_calculation", "fraud_signal", "aml_alert", "exposure_limit",
                      "stress_test_result", "counterparty_risk", "operational_incident"],
            "CUSTOMER": ["customer_profile", "account_summary", "contact_history", "segment_assignment",
                          "lifecycle_event", "satisfaction_score", "churn_prediction", "cross_sell_signal"],
            "RAW": ["raw_event_stream", "raw_crm_extract", "raw_market_feed", "raw_payment_log",
                     "raw_compliance_report", "raw_hr_data", "raw_vendor_feed"],
            "STAGING": ["stg_customer", "stg_transaction", "stg_product", "stg_account", "stg_employee"],
            "GOLD": ["dim_customer", "dim_product", "dim_account", "fact_transaction", "fact_usage",
                      "fact_cost", "agg_daily_revenue", "agg_monthly_roi"],
        }
        databricks_tables = {
            "bronze": ["raw_events", "raw_clickstream", "raw_model_inputs", "raw_feature_store",
                        "raw_experiment_log", "raw_training_data", "raw_inference_log"],
            "silver": ["cleaned_events", "feature_vectors", "model_metrics", "experiment_results",
                        "training_datasets", "inference_results", "prediction_scores"],
            "gold": ["ml_customer_segments", "ml_fraud_predictions", "ml_demand_forecast",
                      "ml_churn_scores", "ml_recommendation_engine", "ml_risk_model"],
        }
        bigquery_tables = {
            "finance": ["billing_summary", "cost_allocation", "budget_tracking", "revenue_forecast",
                         "expense_analysis"],
            "marketing": ["attribution_model", "campaign_roi", "customer_journey", "funnel_analysis"],
        }

        table_node_ids: list[uuid.UUID] = []
        all_table_qnames: list[str] = []

        # Snowflake tables
        for sch_name, tbl_list in table_prefixes.items():
            db_nm = "RAW_VAULT" if sch_name in ("RAW", "STAGING") else ("ANALYTICS" if sch_name == "GOLD" else "PROD_DW")
            for tbl in tbl_list:
                # Base table
                qn = f"snowflake://PROD_DW.{sch_name}.{tbl}".upper() if sch_name not in ("RAW", "STAGING", "GOLD") else f"snowflake://{db_nm}.{sch_name}.{tbl}".upper()
                nid = _add_lineage_node(LineageNodeType.table, tbl.upper(), qn, "snowflake", dom=sch_name.lower())
                table_node_ids.append(nid)
                all_table_qnames.append(qn)
                _add_lineage_edge(f"schema://snowflake/{db_nm}.{sch_name}", qn, LineageEdgeType.physical_lineage, "snowflake")

                # Add numbered variants for volume (e.g., _001 through _010)
                for suffix in range(1, 11):
                    variant_qn = f"{qn}_{suffix:03d}"
                    vid = _add_lineage_node(LineageNodeType.table, f"{tbl.upper()}_{suffix:03d}", variant_qn, "snowflake", dom=sch_name.lower())
                    table_node_ids.append(vid)
                    all_table_qnames.append(variant_qn)
                    _add_lineage_edge(f"schema://snowflake/{db_nm}.{sch_name}", variant_qn, LineageEdgeType.physical_lineage, "snowflake")

        # Databricks tables
        for sch_name, tbl_list in databricks_tables.items():
            db_nm = "hive_metastore" if sch_name in ("bronze", "silver") else "main"
            for tbl in tbl_list:
                qn = f"databricks://{db_nm}.{sch_name}.{tbl}"
                nid = _add_lineage_node(LineageNodeType.table, tbl, qn, "databricks", dom=sch_name)
                table_node_ids.append(nid)
                all_table_qnames.append(qn)
                _add_lineage_edge(f"schema://databricks/{db_nm}.{sch_name}", qn, LineageEdgeType.physical_lineage, "databricks")

        # BigQuery tables
        for sch_name, tbl_list in bigquery_tables.items():
            for tbl in tbl_list:
                qn = f"bigquery://apex-analytics.{sch_name}.{tbl}"
                nid = _add_lineage_node(LineageNodeType.table, tbl, qn, "bigquery", dom=sch_name)
                table_node_ids.append(nid)
                all_table_qnames.append(qn)
                _add_lineage_edge(f"schema://bigquery/apex-analytics.{sch_name}", qn, LineageEdgeType.physical_lineage, "bigquery")

        # --- Views (~50) ---
        view_defs = [
            ("vw_customer_360", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_revenue_summary", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_cost_attribution", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_risk_exposure", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_fraud_overview", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_regulatory_report", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_marketing_funnel", "GOLD", "ANALYTICS", "snowflake"),
            ("vw_portfolio_performance", "GOLD", "ANALYTICS", "snowflake"),
        ]
        for vw_name, sch, db_nm, plat in view_defs:
            vw_qn = f"snowflake://{db_nm}.{sch}.{vw_name}".upper()
            _add_lineage_node(LineageNodeType.view, vw_name.upper(), vw_qn, plat, dom=sch.lower())
            _add_lineage_edge(f"schema://snowflake/{db_nm}.{sch}", vw_qn, LineageEdgeType.physical_lineage, plat)
            # Views derive from 2-4 gold tables
            gold_tables = [q for q in all_table_qnames if "ANALYTICS.GOLD" in q]
            for src_qn in rng.sample(gold_tables, min(rng.randint(2, 4), len(gold_tables))):
                _add_lineage_edge(src_qn, vw_qn, LineageEdgeType.derivation, plat)

        # --- dbt Models (~30) ---
        dbt_models = [
            "stg_customers", "stg_orders", "stg_payments", "stg_products",
            "int_customer_orders", "int_payment_attribution", "int_product_usage",
            "mart_customer_360", "mart_revenue_daily", "mart_cost_center",
            "mart_fraud_signals", "mart_demand_forecast", "mart_marketing_attribution",
            "mart_regulatory_pack", "mart_portfolio_summary",
            "fct_daily_transactions", "fct_monthly_consumers", "fct_cost_allocations",
            "dim_customer", "dim_product", "dim_date", "dim_geography",
            "exposure_customer_360_dashboard", "exposure_executive_summary",
            "exposure_risk_dashboard", "exposure_fraud_monitor",
            "exposure_regulatory_report", "exposure_marketing_analytics",
            "exposure_demand_forecast_app", "exposure_portfolio_review",
        ]
        for dbt_name in dbt_models:
            dbt_qn = f"dbt://apex_analytics.{dbt_name}"
            _add_lineage_node(LineageNodeType.dbt_model, dbt_name, dbt_qn, "dbt",
                              dom="analytics", prov=LineageProvenance.automated, conf=0.98)
            # dbt models transform from tables
            src_tables = rng.sample(all_table_qnames[:80], min(rng.randint(1, 4), 80))
            for src_qn in src_tables:
                _add_lineage_edge(src_qn, dbt_qn, LineageEdgeType.transformation, "dbt")

        # --- ETL Jobs (~20) ---
        etl_jobs = [
            ("etl_customer_sync", "salesforce", "Syncs CRM data to Snowflake"),
            ("etl_market_data_ingest", "snowflake", "Ingests market feed data"),
            ("etl_payment_reconciliation", "snowflake", "Reconciles payment flows"),
            ("etl_risk_scoring_pipeline", "databricks", "Computes risk scores"),
            ("etl_fraud_feature_pipeline", "databricks", "Builds fraud ML features"),
            ("etl_demand_forecast_train", "databricks", "Trains demand forecast model"),
            ("etl_cost_aggregation", "snowflake", "Aggregates cost metrics"),
            ("etl_usage_rollup", "snowflake", "Rolls up usage events"),
            ("etl_compliance_extract", "snowflake", "Extracts regulatory data"),
            ("etl_marketing_attribution", "bigquery", "Computes attribution scores"),
            ("etl_billing_sync", "bigquery", "Syncs billing data"),
            ("etl_hr_data_sync", "sap", "Syncs HR data from SAP"),
            ("etl_vendor_feed_ingest", "s3", "Ingests vendor data from S3"),
            ("etl_clickstream_ingest", "databricks", "Ingests raw clickstream"),
            ("etl_model_inference", "databricks", "Runs model inference pipeline"),
        ]
        for etl_name, plat, desc in etl_jobs:
            etl_qn = f"etl://{plat}/{etl_name}"
            _add_lineage_node(LineageNodeType.etl_job, etl_name, etl_qn, plat,
                              dom="operations", prov=LineageProvenance.automated)
            # ETL reads from raw, writes to staging/gold
            raw_tables = [q for q in all_table_qnames if "RAW" in q.upper() or "bronze" in q.lower()]
            if raw_tables:
                for src in rng.sample(raw_tables, min(rng.randint(1, 3), len(raw_tables))):
                    _add_lineage_edge(src, etl_qn, LineageEdgeType.physical_lineage, plat)
            staging_tables = [q for q in all_table_qnames if "STAGING" in q.upper() or "silver" in q.lower() or "GOLD" in q.upper() or "gold" in q.lower()]
            if staging_tables:
                for tgt in rng.sample(staging_tables, min(rng.randint(1, 2), len(staging_tables))):
                    _add_lineage_edge(etl_qn, tgt, LineageEdgeType.transformation, plat)

        # --- Notebooks (~15) ---
        notebooks = [
            "customer_segmentation_analysis", "fraud_model_exploration", "demand_forecast_prototype",
            "cost_optimization_study", "marketing_attribution_poc", "risk_model_validation",
            "churn_prediction_experiment", "pricing_elasticity_analysis", "portfolio_simulation",
            "data_quality_profiling", "feature_importance_analysis", "model_drift_monitoring",
            "executive_data_review", "compliance_data_audit", "ai_ethics_assessment",
        ]
        for nb_name in notebooks:
            nb_qn = f"notebook://databricks/{nb_name}"
            _add_lineage_node(LineageNodeType.notebook, nb_name, nb_qn, "databricks",
                              dom="analytics", prov=LineageProvenance.inferred, conf=0.85)
            # Notebooks read from silver/gold tables
            silver_gold = [q for q in all_table_qnames if "silver" in q.lower() or "gold" in q.lower() or "GOLD" in q]
            if silver_gold:
                for src in rng.sample(silver_gold, min(rng.randint(2, 5), len(silver_gold))):
                    _add_lineage_edge(src, nb_qn, LineageEdgeType.consumption, "databricks", LineageProvenance.inferred, 0.85)

        # --- Datasets (data products mapped as lineage nodes) ---
        anchor_product_ids = [p.id for p in all_products[:6]]
        anchor_product_names = [p.name for p in all_products[:6]]
        anchor_platforms = ["snowflake", "databricks", "databricks", "snowflake", "snowflake", "snowflake"]

        for idx, (dp_id, dp_name, dp_plat) in enumerate(zip(anchor_product_ids, anchor_product_names, anchor_platforms)):
            dp_qn = f"product://{dp_plat}/{dp_name.lower().replace(' ', '_')}"
            _add_lineage_node(
                LineageNodeType.data_product, dp_name, dp_qn, dp_plat,
                dom=all_products[idx].domain, dp_id=dp_id,
                owner_id=all_products[idx].owner_id,
            )
            # Products derive from dbt models and views
            dbt_qns = [q for q in lineage_node_map if q.startswith("dbt://")]
            view_qns = [q for q in lineage_node_map if "vw_" in q.lower()]
            sources = rng.sample(dbt_qns, min(rng.randint(2, 4), len(dbt_qns)))
            if view_qns:
                sources += rng.sample(view_qns, min(rng.randint(1, 2), len(view_qns)))
            for src_qn in sources:
                _add_lineage_edge(src_qn, dp_qn, LineageEdgeType.derivation, dp_plat)

        # Also add remaining products as lineage nodes (up to 200)
        for dp in all_products[6:200]:
            dp_plat = dp.platform.value
            dp_qn = f"product://{dp_plat}/{dp.name.lower().replace(' ', '_')}_{dp.id.hex[:8]}"
            _add_lineage_node(
                LineageNodeType.data_product, dp.name, dp_qn, dp_plat,
                dom=dp.domain, dp_id=dp.id,
                prov=LineageProvenance.inferred, conf=0.9,
            )
            # Link to random tables
            if all_table_qnames:
                for src in rng.sample(all_table_qnames, min(rng.randint(1, 3), len(all_table_qnames))):
                    _add_lineage_edge(src, dp_qn, LineageEdgeType.derivation, dp_plat, LineageProvenance.inferred, 0.9)

        # --- Dashboards (55) ---
        dashboard_defs = [
            ("Executive KPI Dashboard", "snowflake", "finance"),
            ("Customer 360 Dashboard", "snowflake", "customer"),
            ("Revenue Analytics", "snowflake", "finance"),
            ("Cost Management Console", "snowflake", "finance"),
            ("Fraud Monitoring Dashboard", "databricks", "risk"),
            ("Risk Exposure Heatmap", "snowflake", "risk"),
            ("Marketing Performance Hub", "bigquery", "marketing"),
            ("Demand Forecast Viewer", "databricks", "trading"),
            ("Portfolio Review Board", "snowflake", "finance"),
            ("Regulatory Compliance Tracker", "snowflake", "compliance"),
            ("AI Model Performance", "databricks", "analytics"),
            ("Data Quality Scorecard", "snowflake", "operations"),
            ("Capital Efficiency Dashboard", "snowflake", "finance"),
            ("Product Usage Analytics", "snowflake", "analytics"),
            ("Team Productivity Monitor", "power_bi", "operations"),
            ("HR Analytics Overview", "power_bi", "hr"),
            ("Vendor Cost Analysis", "power_bi", "finance"),
            ("Payment Flow Monitor", "snowflake", "operations"),
            ("Claims Processing Dashboard", "snowflake", "insurance"),
            ("Trading Desk Monitor", "snowflake", "trading"),
        ]
        # Generate 55 dashboards total (20 specific + 35 generated)
        all_dashboard_qnames: list[str] = []
        for dash_name, dash_plat, dash_dom in dashboard_defs:
            dash_qn = f"dashboard://{dash_plat}/{dash_name.lower().replace(' ', '_')}"
            _add_lineage_node(LineageNodeType.dashboard, dash_name, dash_qn, dash_plat, dom=dash_dom)
            all_dashboard_qnames.append(dash_qn)
            # Dashboards consume from data products
            product_qns = [q for q in lineage_node_map if q.startswith("product://")]
            for src in rng.sample(product_qns, min(rng.randint(1, 3), len(product_qns))):
                _add_lineage_edge(src, dash_qn, LineageEdgeType.consumption, dash_plat)

        extra_dashboard_domains = ["finance", "risk", "marketing", "operations", "analytics", "trading", "compliance", "insurance"]
        for i in range(35):
            dom = rng.choice(extra_dashboard_domains)
            plat = rng.choice(["snowflake", "power_bi", "databricks"])
            dash_name = f"{dom.title()} Dashboard {i + 1}"
            dash_qn = f"dashboard://{plat}/{dom}_dashboard_{i + 1}"
            _add_lineage_node(LineageNodeType.dashboard, dash_name, dash_qn, plat, dom=dom,
                              prov=LineageProvenance.inferred, conf=0.88)
            all_dashboard_qnames.append(dash_qn)
            product_qns = [q for q in lineage_node_map if q.startswith("product://")]
            if product_qns:
                for src in rng.sample(product_qns, min(rng.randint(1, 2), len(product_qns))):
                    _add_lineage_edge(src, dash_qn, LineageEdgeType.consumption, plat, LineageProvenance.inferred, 0.88)

        # --- Reports (~20) ---
        report_defs = [
            "Basel III Regulatory Report", "Monthly P&L Summary", "Quarterly Business Review",
            "Risk Assessment Report", "Marketing ROI Report", "Customer Churn Analysis",
            "Data Quality Monthly Report", "AI Ethics Assessment", "Cost Optimization Report",
            "Capital Allocation Summary", "Fraud Investigation Summary", "Compliance Audit Trail",
            "Trading Desk Weekly", "Insurance Claims Summary", "Wealth Management Review",
            "Employee Satisfaction Report", "Vendor Performance Report", "Board Data Pack",
            "Annual Data Strategy Report", "Portfolio Health Check",
        ]
        for rpt_name in report_defs:
            rpt_plat = rng.choice(["snowflake", "power_bi"])
            rpt_qn = f"report://{rpt_plat}/{rpt_name.lower().replace(' ', '_')}"
            _add_lineage_node(LineageNodeType.report, rpt_name, rpt_qn, rpt_plat, dom="reporting")
            # Reports consume from dashboards or products
            for src in rng.sample(all_dashboard_qnames, min(rng.randint(1, 3), len(all_dashboard_qnames))):
                _add_lineage_edge(src, rpt_qn, LineageEdgeType.consumption, rpt_plat)

        # --- Metrics (~30) ---
        metric_defs = [
            ("monthly_cost", "finance"), ("composite_value", "finance"), ("roi", "finance"),
            ("monthly_consumers", "analytics"), ("trust_score", "quality"), ("cost_trend", "finance"),
            ("usage_trend", "analytics"), ("churn_rate", "customer"), ("fraud_detection_rate", "risk"),
            ("revenue_per_customer", "finance"), ("cost_per_query", "operations"),
            ("data_freshness", "quality"), ("completeness_score", "quality"),
            ("pipeline_success_rate", "operations"), ("model_accuracy", "analytics"),
            ("regulatory_compliance_rate", "compliance"), ("budget_variance", "finance"),
            ("customer_satisfaction", "customer"), ("trading_volume", "trading"),
            ("claims_processing_time", "insurance"), ("marketing_roas", "marketing"),
            ("employee_engagement", "hr"), ("vendor_spend_efficiency", "operations"),
            ("capital_freed_monthly", "finance"), ("decision_execution_rate", "governance"),
            ("portfolio_coverage", "analytics"), ("automation_coverage", "operations"),
            ("data_product_count", "analytics"), ("active_consumers", "analytics"),
            ("cost_optimization_savings", "finance"),
        ]
        for metric_name, metric_dom in metric_defs:
            metric_qn = f"metric://strata/{metric_name}"
            _add_lineage_node(LineageNodeType.metric, metric_name, metric_qn, "strata", dom=metric_dom)
            # Metrics derive from data products
            product_qns = [q for q in lineage_node_map if q.startswith("product://")]
            if product_qns:
                for src in rng.sample(product_qns, min(rng.randint(1, 3), len(product_qns))):
                    _add_lineage_edge(src, metric_qn, LineageEdgeType.aggregation, "strata")

        # --- ML Models (~10) ---
        ml_models = [
            ("fraud_detection_xgb", "databricks", "risk"),
            ("churn_prediction_lstm", "databricks", "customer"),
            ("demand_forecast_prophet", "databricks", "trading"),
            ("customer_segmentation_kmeans", "databricks", "marketing"),
            ("risk_scoring_ensemble", "databricks", "risk"),
            ("recommendation_engine_als", "databricks", "customer"),
            ("pricing_elasticity_model", "databricks", "finance"),
            ("anomaly_detection_autoencoder", "databricks", "operations"),
            ("nlp_complaint_classifier", "databricks", "compliance"),
            ("credit_scoring_gradient_boost", "databricks", "risk"),
        ]
        for ml_name, ml_plat, ml_dom in ml_models:
            ml_qn = f"ml_model://{ml_plat}/{ml_name}"
            _add_lineage_node(LineageNodeType.ml_model, ml_name, ml_qn, ml_plat, dom=ml_dom)
            # ML models consume from feature tables
            feature_tables = [q for q in all_table_qnames if "feature" in q.lower() or "silver" in q.lower() or "gold" in q.lower()]
            if feature_tables:
                for src in rng.sample(feature_tables, min(rng.randint(2, 5), len(feature_tables))):
                    _add_lineage_edge(src, ml_qn, LineageEdgeType.transformation, ml_plat)

        # --- API Endpoints (~10) ---
        api_endpoints = [
            ("customer-360-api", "Customer 360 enrichment API"),
            ("fraud-scoring-api", "Real-time fraud scoring"),
            ("demand-forecast-api", "Demand forecast predictions"),
            ("risk-assessment-api", "Risk assessment endpoint"),
            ("pricing-api", "Dynamic pricing engine"),
        ]
        for api_name, api_desc in api_endpoints:
            api_qn = f"api://strata/{api_name}"
            _add_lineage_node(LineageNodeType.api_endpoint, api_name, api_qn, "strata", dom="api")
            # APIs expose data products
            product_qns = [q for q in lineage_node_map if q.startswith("product://")]
            if product_qns:
                src = rng.choice(product_qns)
                _add_lineage_edge(src, api_qn, LineageEdgeType.exposure, "strata")

        # --- Applications (~5) ---
        applications = [
            ("Strata Dashboard", "strata", "analytics"),
            ("Mobile Banking App", "mobile", "retail"),
            ("Trading Platform", "internal", "trading"),
            ("Claims Portal", "internal", "insurance"),
            ("Compliance Reporting Portal", "internal", "compliance"),
        ]
        for app_name, app_plat, app_dom in applications:
            app_qn = f"application://{app_plat}/{app_name.lower().replace(' ', '_')}"
            _add_lineage_node(LineageNodeType.application, app_name, app_qn, app_plat, dom=app_dom)
            # Applications consume dashboards
            if all_dashboard_qnames:
                for src in rng.sample(all_dashboard_qnames, min(rng.randint(2, 5), len(all_dashboard_qnames))):
                    _add_lineage_edge(src, app_qn, LineageEdgeType.consumption, app_plat)

        # --- Column-level lineage for top tables ---
        column_defs = {
            "dim_customer": ["customer_id", "customer_name", "email", "phone", "segment", "lifetime_value", "created_date", "region", "is_active"],
            "fact_transaction": ["transaction_id", "customer_id", "amount", "currency", "transaction_date", "product_id", "channel", "status"],
            "dim_product": ["product_id", "product_name", "category", "price", "cost", "margin", "launch_date"],
            "fact_usage": ["usage_id", "customer_id", "product_id", "event_type", "event_date", "bytes_scanned", "duration_ms"],
            "fact_cost": ["cost_id", "product_id", "cost_type", "amount", "period_start", "period_end", "allocated_to"],
        }
        for tbl_name, columns in column_defs.items():
            parent_qn = f"snowflake://ANALYTICS.GOLD.{tbl_name}".upper()
            if parent_qn not in lineage_node_map:
                continue
            for col in columns:
                col_qn = f"column://snowflake/ANALYTICS.GOLD.{tbl_name.upper()}.{col}"
                _add_lineage_node(LineageNodeType.column, col, col_qn, "snowflake", dom="gold")
                _add_lineage_edge(parent_qn, col_qn, LineageEdgeType.physical_lineage, "snowflake")

        # Flush nodes first so FK references exist, then add edges
        await session.flush()
        for edge in _pending_edges:
            session.add(edge)
        await session.flush()
        lineage_node_count = len(lineage_node_map)
        lineage_edge_count = len(_pending_edges)
        logger.info(f"  Phase 10c: {lineage_node_count} lineage nodes, {lineage_edge_count} edges committed")

        # ============================================================
        # Phase 11: Product Candidates
        # ============================================================
        candidate_configs = [
            {"type": CandidateType.semantic_product, "name": "Trade Execution Analytics", "domain": "Trading & Markets", "confidence": 92, "status": CandidateStatus.new, "cost": 8500, "consumers": 180},
            {"type": CandidateType.semantic_product, "name": "Claims Processing Hub", "domain": "Insurance Operations", "confidence": 85, "status": CandidateStatus.new, "cost": 5200, "consumers": 120},
            {"type": CandidateType.dbt_product, "name": "Credit Risk Aggregation", "domain": "Risk & Compliance", "confidence": 78, "status": CandidateStatus.under_review, "cost": 6800, "consumers": 95},
            {"type": CandidateType.dbt_product, "name": "Wealth Client Reporting", "domain": "Wealth & Advisory", "confidence": 72, "status": CandidateStatus.new, "cost": 3400, "consumers": 64},
            {"type": CandidateType.usage_bundle, "name": "Digital Channel Performance", "domain": "Retail Finance", "confidence": 55, "status": CandidateStatus.new, "cost": 2800, "consumers": 42},
            {"type": CandidateType.usage_bundle, "name": "Vendor Cost Tracking", "domain": "Corporate", "confidence": 48, "status": CandidateStatus.new, "cost": 1500, "consumers": 18},
            {"type": CandidateType.certified_asset, "name": "Regulatory Data Mart", "domain": "Risk & Compliance", "confidence": 52, "status": CandidateStatus.new, "cost": 2200, "consumers": 35},
            {"type": CandidateType.certified_asset, "name": "HR Analytics Snapshot", "domain": "Corporate", "confidence": 38, "status": CandidateStatus.new, "cost": 900, "consumers": 12},
        ]

        for cc in candidate_configs:
            cand = ProductCandidate(
                org_id=org_id,
                candidate_type=cc["type"],
                name_suggested=cc["name"],
                domain_suggested=cc["domain"],
                owner_suggested=rng.choice([u.email for u in user_map.values()]) if cc["confidence"] > 60 else None,
                confidence_score=cc["confidence"],
                confidence_breakdown_json={"usage_score": cc["confidence"] // 3, "evidence_score": cc["confidence"] // 2},
                evidence_json={"source_tables": rng.randint(2, 8)},
                status=cc["status"],
                monthly_cost_estimate=cc["cost"],
                monthly_consumers=cc["consumers"],
                consumer_teams_json=[{"team": rng.choice(all_team_names), "consumers": cc["consumers"]}],
                cost_coverage_pct=round(rng.uniform(0.70, 0.95), 2),
                source_count=rng.randint(2, 7),
            )
            session.add(cand)
            await session.flush()

            # Members
            n_members = min(rng.randint(2, 5), len(sa_ids))
            member_assets = rng.sample(range(len(sa_ids)), n_members)
            for mai in member_assets:
                session.add(CandidateMember(
                    candidate_id=cand.id,
                    source_asset_id=sa_ids[mai],
                    role=rng.choice(["primary", "derived", "consumption"]),
                    inclusion_reason=f"Discovered via {cc['type'].value} analysis.",
                    weight=1.0,
                ))

        await session.flush()
        logger.info(f"  Phase 11: {len(candidate_configs)} candidates")

        # ============================================================
        # Phase 12: Notifications
        # ============================================================
        notifications_raw = [
            {"type": NotificationType.cost_spike, "title": "Cost spike: Fraud Detection Signals", "desc": "Cost increased 45% MoM (+$65K)", "dp": dp_map["fraud-detection"], "read": False},
            {"type": NotificationType.cost_spike, "title": "Cost spike: Global Demand Forecast", "desc": "Cost increased 35% MoM (+$38K)", "dp": dp_map["demand-forecast"], "read": False},
            {"type": NotificationType.cost_spike, "title": "Cost spike: Customer 360 Platform", "desc": "Cost increased 8% MoM (+$6K)", "dp": dp_map["customer-360"], "read": False},
            {"type": NotificationType.usage_drop, "title": "Usage declining: Legacy CRM Extract", "desc": "Usage dropped 98.6% from peak (890 to 12)", "dp": dp_map["legacy-crm"], "read": False},
            {"type": NotificationType.usage_drop, "title": "Usage declining: data product", "desc": "Significant usage decline detected", "dp": generated_products[0] if generated_products else dp_map["legacy-crm"], "read": False},
            {"type": NotificationType.usage_drop, "title": "Usage stabilized", "desc": "Previous usage decline has stabilized", "dp": generated_products[1] if len(generated_products) > 1 else dp_map["legacy-crm"], "read": True},
            {"type": NotificationType.value_expiring, "title": "Value declaration expiring: Global Demand Forecast", "desc": "Declaration expires Mar 15. $520K/mo at risk.", "dp": dp_map["demand-forecast"], "read": False},
            {"type": NotificationType.value_expiring, "title": "Value declaration expiring: Regulatory Reporting Pack", "desc": "Declaration expires Mar 1. Revalidation needed.", "dp": dp_map["reg-reporting"], "read": False},
            {"type": NotificationType.value_expiring, "title": "Value declaration expiring", "desc": "Declaration expiring soon", "dp": generated_products[2] if len(generated_products) > 2 else dp_map["reg-reporting"], "read": False},
            {"type": NotificationType.value_expiring, "title": "Value declaration renewed", "desc": "Previously expiring declaration has been renewed", "dp": generated_products[3] if len(generated_products) > 3 else dp_map["customer-360"], "read": True},
            {"type": NotificationType.retirement_candidate, "title": "Retirement recommended: Legacy CRM Extract", "desc": "12 consumers (was 890). Saving: $67K/mo", "dp": dp_map["legacy-crm"], "read": False},
            {"type": NotificationType.retirement_candidate, "title": "Retirement recommended", "desc": "Low usage product flagged for retirement", "dp": generated_products[4] if len(generated_products) > 4 else dp_map["legacy-crm"], "read": False},
            {"type": NotificationType.retirement_candidate, "title": "Retirement reviewed", "desc": "Retirement candidate reviewed and processed", "dp": generated_products[5] if len(generated_products) > 5 else dp_map["legacy-crm"], "read": True},
            {"type": NotificationType.capital_freed, "title": "Capital freed: Fraud Detection optimization", "desc": "$12K/mo freed from GPU optimization", "dp": dp_map["fraud-detection"], "read": True},
            {"type": NotificationType.capital_freed, "title": "Capital freed: Customer 360 pricing", "desc": "$22K/mo revenue from pricing activation", "dp": dp_map["customer-360"], "read": True},
            {"type": NotificationType.capital_freed, "title": "Capital freed: Marketing Attribution pricing", "desc": "$15.5K/mo revenue from pricing activation", "dp": dp_map["mktg-attribution"], "read": True},
            {"type": NotificationType.pricing_activated, "title": "Pricing activated: Customer 360", "desc": "Usage-based pricing now live. $800 base + $1.50/query", "dp": dp_map["customer-360"], "read": True},
            {"type": NotificationType.pricing_activated, "title": "Pricing activated: Marketing Attribution Hub", "desc": "Usage-based pricing now live. $600 base + $1.00/query", "dp": dp_map["mktg-attribution"], "read": True},
            {"type": NotificationType.pricing_activated, "title": "Pricing policy drafted", "desc": "New pricing policy submitted for review", "dp": dp_map["demand-forecast"], "read": False},
            {"type": NotificationType.ai_project_flagged, "title": "AI risk: Global Demand Forecast", "desc": "Composite score 48/100. Model dependency risk elevated.", "dp": dp_map["demand-forecast"], "read": False},
            {"type": NotificationType.ai_project_flagged, "title": "AI risk flagged", "desc": "AI project requires risk assessment review", "dp": generated_products[6] if len(generated_products) > 6 else dp_map["demand-forecast"], "read": False},
            {"type": NotificationType.ai_project_flagged, "title": "AI risk resolved", "desc": "Previously flagged AI project cleared", "dp": generated_products[7] if len(generated_products) > 7 else dp_map["fraud-detection"], "read": True},
            {"type": NotificationType.lifecycle_change, "title": "Stage transition: Marketing Attribution Hub", "desc": "Moved to Growth stage", "dp": dp_map["mktg-attribution"], "read": True},
            {"type": NotificationType.lifecycle_change, "title": "Stage transition: product", "desc": "Product moved to new lifecycle stage", "dp": generated_products[8] if len(generated_products) > 8 else dp_map["customer-360"], "read": True},
            {"type": NotificationType.lifecycle_change, "title": "Stage transition: product", "desc": "Product lifecycle updated", "dp": generated_products[9] if len(generated_products) > 9 else dp_map["reg-reporting"], "read": True},
        ]

        for i, nr in enumerate(notifications_raw):
            session.add(Notification(
                org_id=org_id,
                type=nr["type"],
                title=nr["title"],
                description=nr["desc"],
                product_id=nr["dp"].id,
                product_name=nr["dp"].name,
                is_read=nr["read"],
                created_at=datetime(2026, 2, 22 - i % 5, i % 24, 30 - i % 30, 0, tzinfo=timezone.utc),
            ))

        await session.flush()
        logger.info(f"  Phase 12: {len(notifications_raw)} notifications")

        # ============================================================
        # Phase 13: Pricing Policies + Usage Deltas
        # ============================================================
        pricing_policies = [
            {
                "dp": dp_map["customer-360"], "model": "usage_based", "status": PricingPolicyStatus.active,
                "params": json.dumps({"baseFee": 800, "perQuery": 1.50, "freeTier": 1000}),
                "projected": 28000, "actual": 22000, "pre_usage": 1100, "post_usage": 1240,
                "activated_at": datetime(2025, 12, 20, tzinfo=timezone.utc), "activated_by": "Marcus Chen",
                "decision_key": "c360-pricing",
                "deltas": [
                    {"month": date(2025, 12, 1), "consumers": 1100, "queries": 48000, "revenue": 18000},
                    {"month": date(2026, 1, 1), "consumers": 1180, "queries": 52000, "revenue": 20500},
                    {"month": date(2026, 2, 1), "consumers": 1240, "queries": 55800, "revenue": 22000},
                ],
            },
            {
                "dp": dp_map["mktg-attribution"], "model": "usage_based", "status": PricingPolicyStatus.active,
                "params": json.dumps({"baseFee": 600, "perQuery": 1.00, "freeTier": 2000}),
                "projected": 18000, "actual": 15500, "pre_usage": 480, "post_usage": 520,
                "activated_at": datetime(2026, 2, 1, tzinfo=timezone.utc), "activated_by": "Marcus Chen",
                "decision_key": "mktg-pricing",
                "deltas": [
                    {"month": date(2026, 2, 1), "consumers": 520, "queries": 23400, "revenue": 15500},
                ],
            },
            {
                "dp": dp_map["demand-forecast"], "model": "cost_plus", "status": PricingPolicyStatus.draft,
                "params": json.dumps({"markup": 30, "baseCost": 145000}),
                "projected": 42000, "actual": None, "pre_usage": 380, "post_usage": None,
                "activated_at": None, "activated_by": None, "decision_key": None, "deltas": [],
            },
        ]

        for pp in pricing_policies:
            dp = pp["dp"]
            dec_id = decision_map[pp["decision_key"]].id if pp.get("decision_key") and pp["decision_key"] in decision_map else None
            policy = PricingPolicy(
                org_id=org_id,
                product_id=dp.id,
                product_name=dp.name,
                version=1,
                model=pp["model"],
                params=pp["params"],
                status=pp["status"],
                projected_revenue=pp["projected"],
                actual_revenue=pp["actual"],
                pre_activation_usage=pp["pre_usage"],
                post_activation_usage=pp["post_usage"],
                activated_at=pp["activated_at"],
                activated_by=pp["activated_by"],
                decision_id=dec_id,
            )
            session.add(policy)
            await session.flush()

            for delta in pp["deltas"]:
                session.add(PricingUsageDelta(
                    policy_id=policy.id,
                    month=delta["month"],
                    consumers=delta["consumers"],
                    queries=delta["queries"],
                    revenue_collected=delta["revenue"],
                ))

        await session.flush()
        logger.info(f"  Phase 13: {len(pricing_policies)} pricing policies")

        # ============================================================
        # Phase 14: AI Project Scorecards
        # ============================================================
        # Select products for AI scorecards
        ai_products = list(dp_map.values())  # Start with anchors
        ai_extra = [dp for dp in generated_products if dp.platform == PlatformType.databricks][:6]
        ai_products.extend(ai_extra)
        ai_products = ai_products[:12]

        ai_scorecards_data = [
            # 2 low risk
            {"composite": 82, "risk": AIProjectRiskLevel.low, "flagged": False},
            {"composite": 78, "risk": AIProjectRiskLevel.low, "flagged": False},
            # 2 medium risk
            {"composite": 62, "risk": AIProjectRiskLevel.medium, "flagged": False},
            {"composite": 55, "risk": AIProjectRiskLevel.medium, "flagged": False},
            # 6 high risk
            {"composite": 48, "risk": AIProjectRiskLevel.high, "flagged": True},
            {"composite": 44, "risk": AIProjectRiskLevel.high, "flagged": True},
            {"composite": 40, "risk": AIProjectRiskLevel.high, "flagged": True},
            {"composite": 36, "risk": AIProjectRiskLevel.high, "flagged": True},
            {"composite": 32, "risk": AIProjectRiskLevel.high, "flagged": True},
            {"composite": 28, "risk": AIProjectRiskLevel.high, "flagged": True},
            # 2 critical (killed)
            {"composite": 22, "risk": AIProjectRiskLevel.critical, "flagged": True},
            {"composite": 18, "risk": AIProjectRiskLevel.critical, "flagged": True},
        ]

        for idx, (dp, ai_data) in enumerate(zip(ai_products, ai_scorecards_data)):
            composite = ai_data["composite"]
            session.add(AIProjectScorecard(
                org_id=org_id,
                product_id=dp.id,
                product_name=dp.name,
                cost_score=round(composite * rng.uniform(0.8, 1.2), 2),
                value_score=round(composite * rng.uniform(0.7, 1.3), 2),
                confidence_score=round(composite * rng.uniform(0.9, 1.1), 2),
                roi_score=round(composite * rng.uniform(0.85, 1.15), 2),
                dependency_risk_score=round(composite * rng.uniform(0.6, 1.0), 2),
                composite_score=composite,
                risk_level=ai_data["risk"],
                monthly_cost=float(dp.monthly_cost),
                monthly_value=float(dp.composite_value),
                roi=float(dp.roi) if dp.roi else 0,
                flagged_for_review=ai_data["flagged"],
            ))

        await session.flush()
        logger.info(f"  Phase 14: {min(len(ai_products), len(ai_scorecards_data))} AI scorecards")

        # ============================================================
        # Phase 15: Benchmarks + Policy Configs + Display Configs
        # ============================================================
        benchmarks = [
            {"industry": BenchmarkIndustry.retail, "label": "Retail & E-Commerce", "median_roi": 2.1, "median_cost_per_consumer": 82, "median_portfolio_roi": 1.8, "p25_roi": 1.2, "p75_roi": 3.4, "sample_size": 142},
            {"industry": BenchmarkIndustry.finance, "label": "Financial Services", "median_roi": 3.2, "median_cost_per_consumer": 145, "median_portfolio_roi": 2.6, "p25_roi": 1.8, "p75_roi": 4.8, "sample_size": 198},
            {"industry": BenchmarkIndustry.saas, "label": "SaaS & Technology", "median_roi": 2.8, "median_cost_per_consumer": 64, "median_portfolio_roi": 2.2, "p25_roi": 1.5, "p75_roi": 4.1, "sample_size": 256},
            {"industry": BenchmarkIndustry.healthcare, "label": "Healthcare & Life Sciences", "median_roi": 1.9, "median_cost_per_consumer": 210, "median_portfolio_roi": 1.5, "p25_roi": 0.8, "p75_roi": 3.0, "sample_size": 87},
        ]
        for b in benchmarks:
            session.add(BenchmarkData(**b))

        # Policy configs (same as existing seeder)
        policies = [
            {"name": "ROI Composite Weight — Declared Value", "desc": "Weight given to declared value in composite formula", "cat": PolicyCategory.valuation, "val": "70%"},
            {"name": "ROI Composite Weight — Usage-Implied Value", "desc": "Weight given to usage-implied value in composite formula", "cat": PolicyCategory.valuation, "val": "30%"},
            {"name": "Retirement Trigger — Usage Threshold", "desc": "Products flagged when usage drops below this % of peak for 90+ days", "cat": PolicyCategory.lifecycle, "val": "20%"},
            {"name": "Cost Spike Alert Threshold", "desc": "MoM cost increase % that triggers investigation", "cat": PolicyCategory.cost, "val": "30%"},
            {"name": "Value Declaration Review Cycle", "desc": "Max days before value declaration must be revalidated", "cat": PolicyCategory.governance, "val": "180 days"},
            {"name": "Minimum Cost Coverage for Confidence", "desc": "Min % of costs tracked by connectors for high-confidence reporting", "cat": PolicyCategory.cost, "val": "85%"},
            {"name": "Low ROI Review Trigger", "desc": "Products with ROI below this for 2+ months trigger review", "cat": PolicyCategory.valuation, "val": "1.0x"},
            {"name": "AI Project Review Threshold", "desc": "Composite score below which AI projects are flagged", "cat": PolicyCategory.valuation, "val": "50"},
        ]
        for p in policies:
            session.add(PolicyConfig(
                org_id=org_id, name=p["name"], description=p["desc"],
                category=p["cat"], current_value=p["val"], default_value=p["val"],
                updated_at=datetime(2025, 9, 15, tzinfo=timezone.utc), updated_by="Marcus Chen",
            ))

        # Display configs
        display_configs = [
            {"name": "Display — ROI Bands", "cat": PolicyCategory.valuation, "val": json.dumps({"high": 3.0, "healthy": 1.0})},
            {"name": "Display — Trust Score Bands", "cat": PolicyCategory.governance, "val": json.dumps({"high": 0.9, "medium": 0.7})},
            {"name": "Display — Confidence Score Bands", "cat": PolicyCategory.governance, "val": json.dumps({"green": 80, "blue": 60, "amber": 40})},
            {"name": "Display — AI Risk Score Bands", "cat": PolicyCategory.governance, "val": json.dumps({"low": 70, "medium": 50, "high": 30})},
            {"name": "Display — Pricing Simulation Defaults", "cat": PolicyCategory.pricing, "val": json.dumps({"markup": 25, "baseFee": 500, "perQuery": 1.25, "freeTier": 500, "adoptionSlider": 12})},
            {"name": "Display — Team Budget Threshold", "cat": PolicyCategory.pricing, "val": json.dumps({"amount": 4500})},
        ]
        for dc in display_configs:
            session.add(PolicyConfig(
                org_id=org_id, name=dc["name"], description=dc["name"],
                category=dc["cat"], current_value=dc["val"], default_value=dc["val"],
                updated_at=datetime(2025, 9, 15, tzinfo=timezone.utc), updated_by="System Default",
            ))

        # CEI weights
        cei_weights = {"roi_coverage": 20, "action_rate": 20, "savings_accuracy": 15, "capital_freed_ratio": 15, "value_governance": 15, "ai_exposure": 15}
        session.add(PolicyConfig(
            org_id=org_id, name="CEI — Component Weights",
            description="Scoring weights for the 6 Capital Efficiency Index components",
            category=PolicyCategory.governance,
            current_value=json.dumps(cei_weights), default_value=json.dumps(cei_weights),
            updated_at=datetime(2025, 9, 15, tzinfo=timezone.utc), updated_by="System Default",
        ))

        await session.flush()
        logger.info(f"  Phase 15: benchmarks, policies, display configs")

        # ============================================================
        # Commit
        # ============================================================
        await session.commit()
        logger.info(
            f"Multinational seeder complete: {len(all_products)} products, "
            f"{len(decisions)} decisions, {capital_event_count} capital events, "
            f"{len(notifications_raw)} notifications"
        )


# ─── CLI Entry Point ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed multinational enterprise demo data")
    parser.add_argument("--org", default="Apex Global Group", help="Organization name")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for determinism")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(seed_multinational(org_name=args.org, rng_seed=args.seed))


if __name__ == "__main__":
    main()
