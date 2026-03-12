"""
Strata — Seed Data
Ports ALL 13 data products from the frontend seed.ts exactly.
"""
import logging
import math
import uuid
from datetime import date, datetime, timezone

import bcrypt
from sqlalchemy import select

from app.database import async_session_factory
from app.models.config import (
    BenchmarkData,
    BenchmarkIndustry,
    Notification,
    NotificationType,
    PolicyCategory,
    PolicyConfig,
)
from app.models.candidate import CandidateMember, CandidateStatus, CandidateType, ProductCandidate
from app.models.connector import ConnectorConfig, ConnectorStatus, ConnectorType, SourceAsset
from app.models.data_product import (
    ConsumerTeam,
    CostBreakdown,
    DataProduct,
    LifecycleStage,
    PlatformType,
    ROIBand,
)
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.org import Organization
from app.models.pricing import PricingPolicy, PricingPolicyStatus
from app.models.time_series import CostMonthly, PortfolioMonthly, ROIMonthly, UsageMonthly
from app.models.user import User, UserOrgRole, UserRole
from app.models.value import ValueDeclaration, ValueDeclarationVersion, ValueMethod

logger = logging.getLogger(__name__)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# ---------- helpers ----------
MONTHS_LABELS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]
MONTH_DATES = [
    date(2025, 9, 1),
    date(2025, 10, 1),
    date(2025, 11, 1),
    date(2025, 12, 1),
    date(2026, 1, 1),
    date(2026, 2, 1),
]


def _cost_trend(base: float, growth: float) -> list[dict]:
    """Mirrors seed.ts costTrend helper."""
    result = []
    for i, m in enumerate(MONTHS_LABELS):
        cost = round(base * (1 + growth * i) * 100) / 100
        # We use a deterministic value multiplier (2.5) instead of random
        value = round(base * (1 + growth * i) * 2.5 * 100) / 100
        result.append({"month": m, "cost": cost, "value": value})
    return result


def _usage_trend(base: float, growth: float) -> list[dict]:
    """Mirrors seed.ts usageTrend helper."""
    result = []
    for i, m in enumerate(MONTHS_LABELS):
        consumers = round(base * (1 + growth * i))
        queries = round(base * (1 + growth * i) * 45)
        result.append({"month": m, "consumers": consumers, "queries": queries})
    return result


async def seed_database() -> None:
    """Seed the database with demo data if organizations table is empty."""
    async with async_session_factory() as session:
        # Check if already seeded
        result = await session.execute(select(Organization).limit(1))
        if result.scalar_one_or_none():
            logger.info("Database already seeded — skipping.")
            return

        logger.info("Seeding database with demo data...")

        # ============================================================
        # 1. Organization
        # ============================================================
        org = Organization(name="Acme Corp", slug="acme", industry="saas")
        session.add(org)
        await session.flush()
        org_id = org.id

        # ============================================================
        # 2. Demo Users
        # ============================================================
        pw_hash = _hash_password("demo123")

        users_data = [
            # Original 5 (preserved for backward compat)
            {"email": "admin@demo.com", "name": "System Administrator", "title": "System Administrator", "role": UserRole.admin},
            {"email": "cfo@demo.com", "name": "Michael Torres", "title": "CFO", "role": UserRole.cfo},
            {"email": "cdo@demo.com", "name": "Sarah Chen", "title": "CDO / Head of Data", "role": UserRole.cdo},
            {"email": "owner@demo.com", "name": "Maria Santos", "title": "Sr. Data Product Manager", "role": UserRole.product_owner},
            {"email": "consumer@demo.com", "name": "Jun Park", "title": "Business Analyst", "role": UserRole.consumer},
            # New 10 personas
            {"email": "ceo@demo.com", "name": "Diana Reeves", "title": "CEO / Executive Sponsor", "role": UserRole.executive_sponsor},
            {"email": "fpa@demo.com", "name": "Kevin Zhao", "title": "FP&A Analyst", "role": UserRole.fpa_analyst},
            {"email": "governance@demo.com", "name": "Priya Kapoor", "title": "Data Governance Lead", "role": UserRole.governance_steward},
            {"email": "platform@demo.com", "name": "Tom Wilson", "title": "Data Platform Admin", "role": UserRole.platform_admin},
            {"email": "engineer@demo.com", "name": "Alex Nguyen", "title": "Senior Data Engineer", "role": UserRole.data_engineer},
            {"email": "dataops@demo.com", "name": "Lucia Fernandez", "title": "DataOps / SRE Lead", "role": UserRole.dataops_sre},
            {"email": "ai@demo.com", "name": "Dr. James Liu", "title": "Head of AI", "role": UserRole.head_of_ai},
            {"email": "scientist@demo.com", "name": "Emily Park", "title": "Senior ML Engineer", "role": UserRole.data_scientist},
            {"email": "auditor@demo.com", "name": "Robert Marsh", "title": "External Auditor", "role": UserRole.external_auditor},
            {"email": "service@demo.com", "name": "Integration Bot", "title": "Service Account", "role": UserRole.integration_service},
        ]

        demo_users: dict[str, User] = {}
        for ud in users_data:
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
            demo_users[ud["email"]] = u

        await session.flush()

        # Convenience references
        admin_user = demo_users["admin@demo.com"]
        cfo_user = demo_users["cfo@demo.com"]
        cdo_user = demo_users["cdo@demo.com"]
        owner_user = demo_users["owner@demo.com"]
        consumer_user = demo_users["consumer@demo.com"]

        # ============================================================
        # 3. Data Products — all 13, matching seed.ts exactly
        # ============================================================

        # We'll store dp references by their frontend id for later use
        dp_map: dict[str, DataProduct] = {}

        products_raw = [
            # dp-001: Customer 360
            {
                "frontend_id": "dp-001",
                "name": "Customer 360",
                "domain": "Customer Analytics",
                "business_unit": "Marketing",
                "owner_id": owner_user.id,  # Maria Santos
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.growth,
                "created_at": datetime(2025, 3, 15, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 14, 30, 0, tzinfo=timezone.utc),
                "monthly_cost": 18400,
                "cost_breakdown": {"compute": 8200, "storage": 2100, "pipeline": 3400, "human_estimate": 4700},
                "declared_value": 62000,
                "usage_implied_value": 48000,
                "composite_value": 0.7 * 62000 + 0.3 * 48000,
                "roi": (0.7 * 62000 + 0.3 * 48000) / 18400,
                "roi_band": ROIBand.high,
                "cost_trend": 5,
                "cost_coverage": 0.92,
                "monthly_consumers": 340,
                "total_queries": 15300,
                "consumer_teams": [
                    {"name": "Marketing Analytics", "consumers": 89, "percentage": 26},
                    {"name": "Sales Ops", "consumers": 72, "percentage": 21},
                    {"name": "Customer Success", "consumers": 58, "percentage": 17},
                    {"name": "Data Science", "consumers": 45, "percentage": 13},
                    {"name": "Product", "consumers": 38, "percentage": 11},
                    {"name": "Finance", "consumers": 22, "percentage": 6},
                    {"name": "Executive", "consumers": 16, "percentage": 5},
                ],
                "usage_trend": 12,
                "peak_consumers": 340,
                "freshness_hours": 2.3,
                "freshness_sla": 4,
                "completeness": 0.992,
                "accuracy": 0.978,
                "trust_score": 0.97,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 12,
                "value_declaration": {
                    "declared_by": "Sarah Chen",
                    "declared_by_title": "VP Marketing",
                    "method": ValueMethod.revenue_attribution,
                    "value": 62000,
                    "basis": "Drives segmentation for $740K/year campaign spend. Estimated 8% lift = $62K/month attributed value.",
                    "status": ["peer_reviewed", "cfo_acknowledged"],
                    "declared_at": date(2025, 12, 10),
                    "next_review": date(2026, 6, 10),
                    "is_expiring": False,
                },
                "downstream_products": 3,
                "downstream_models": 2,
                "downstream_dashboards": 7,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-002: Revenue Analytics Hub
            {
                "frontend_id": "dp-002",
                "name": "Revenue Analytics Hub",
                "domain": "Finance",
                "business_unit": "Finance",
                "owner_id": cfo_user.id,  # James Liu -> closest: CFO user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.mature,
                "created_at": datetime(2024, 8, 20, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 21, 9, 15, 0, tzinfo=timezone.utc),
                "monthly_cost": 24200,
                "cost_breakdown": {"compute": 12100, "storage": 3200, "pipeline": 4900, "human_estimate": 4000},
                "declared_value": 95000,
                "usage_implied_value": 72000,
                "composite_value": 0.7 * 95000 + 0.3 * 72000,
                "roi": (0.7 * 95000 + 0.3 * 72000) / 24200,
                "roi_band": ROIBand.high,
                "cost_trend": 2,
                "cost_coverage": 0.95,
                "monthly_consumers": 180,
                "total_queries": 8100,
                "consumer_teams": [
                    {"name": "Finance", "consumers": 62, "percentage": 34},
                    {"name": "Executive", "consumers": 44, "percentage": 24},
                    {"name": "Sales Ops", "consumers": 38, "percentage": 21},
                    {"name": "Strategy", "consumers": 36, "percentage": 20},
                ],
                "usage_trend": 3,
                "peak_consumers": 195,
                "freshness_hours": 1.2,
                "freshness_sla": 2,
                "completeness": 0.998,
                "accuracy": 0.995,
                "trust_score": 0.99,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 8,
                "value_declaration": {
                    "declared_by": "Michael Torres",
                    "declared_by_title": "CFO",
                    "method": ValueMethod.revenue_attribution,
                    "value": 95000,
                    "basis": "Directly supports $12M quarterly revenue forecasting. Accuracy improvements worth $95K/month in reduced variance.",
                    "status": ["peer_reviewed", "cfo_acknowledged"],
                    "declared_at": date(2025, 9, 15),
                    "next_review": date(2026, 3, 15),
                    "is_expiring": True,
                },
                "downstream_products": 5,
                "downstream_models": 1,
                "downstream_dashboards": 12,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-003: Product Interaction Events
            {
                "frontend_id": "dp-003",
                "name": "Product Interaction Events",
                "domain": "Product Analytics",
                "business_unit": "Product",
                "owner_id": cdo_user.id,  # Aisha Patel -> CDO user
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.growth,
                "created_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 16, 45, 0, tzinfo=timezone.utc),
                "monthly_cost": 14800,
                "cost_breakdown": {"compute": 7200, "storage": 1800, "pipeline": 2800, "human_estimate": 3000},
                "declared_value": 38000,
                "usage_implied_value": 32000,
                "composite_value": 0.7 * 38000 + 0.3 * 32000,
                "roi": (0.7 * 38000 + 0.3 * 32000) / 14800,
                "roi_band": ROIBand.healthy,
                "cost_trend": 8,
                "cost_coverage": 0.78,
                "monthly_consumers": 220,
                "total_queries": 9900,
                "consumer_teams": [
                    {"name": "Product", "consumers": 88, "percentage": 40},
                    {"name": "Data Science", "consumers": 55, "percentage": 25},
                    {"name": "Engineering", "consumers": 44, "percentage": 20},
                    {"name": "Marketing Analytics", "consumers": 33, "percentage": 15},
                ],
                "usage_trend": 18,
                "peak_consumers": 220,
                "freshness_hours": 0.5,
                "freshness_sla": 1,
                "completeness": 0.985,
                "accuracy": 0.96,
                "trust_score": 0.95,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 7,
                "value_declaration": {
                    "declared_by": "David Kim",
                    "declared_by_title": "VP Product",
                    "method": ValueMethod.efficiency_gain,
                    "value": 38000,
                    "basis": "Reduces experiment cycle time by 30%. Saves ~$38K/month in engineering and product time.",
                    "status": ["peer_reviewed"],
                    "declared_at": date(2025, 11, 20),
                    "next_review": date(2026, 5, 20),
                    "is_expiring": False,
                },
                "downstream_products": 2,
                "downstream_models": 3,
                "downstream_dashboards": 5,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-004: Supply Chain Metrics
            {
                "frontend_id": "dp-004",
                "name": "Supply Chain Metrics",
                "domain": "Operations",
                "business_unit": "Operations",
                "owner_id": admin_user.id,  # Robert Chen -> admin user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.mature,
                "created_at": datetime(2024, 4, 10, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 20, 11, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 11200,
                "cost_breakdown": {"compute": 4800, "storage": 2400, "pipeline": 1800, "human_estimate": 2200},
                "declared_value": 28000,
                "usage_implied_value": 18000,
                "composite_value": 0.7 * 28000 + 0.3 * 18000,
                "roi": (0.7 * 28000 + 0.3 * 18000) / 11200,
                "roi_band": ROIBand.healthy,
                "cost_trend": -1,
                "cost_coverage": 0.88,
                "monthly_consumers": 65,
                "total_queries": 2925,
                "consumer_teams": [
                    {"name": "Operations", "consumers": 32, "percentage": 49},
                    {"name": "Procurement", "consumers": 18, "percentage": 28},
                    {"name": "Finance", "consumers": 15, "percentage": 23},
                ],
                "usage_trend": -5,
                "peak_consumers": 82,
                "freshness_hours": 6,
                "freshness_sla": 8,
                "completeness": 0.97,
                "accuracy": 0.94,
                "trust_score": 0.93,
                "is_published": True,
                "is_certified": False,
                "subscription_count": 5,
                "value_declaration": {
                    "declared_by": "Linda Park",
                    "declared_by_title": "VP Operations",
                    "method": ValueMethod.cost_avoidance,
                    "value": 28000,
                    "basis": "Prevents ~$28K/month in supply chain disruption costs through early warning.",
                    "status": ["peer_reviewed", "cfo_acknowledged"],
                    "declared_at": date(2025, 8, 1),
                    "next_review": date(2026, 2, 1),
                    "is_expiring": True,
                },
                "downstream_products": 1,
                "downstream_models": 0,
                "downstream_dashboards": 4,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-005: Fraud Detection Feed
            {
                "frontend_id": "dp-005",
                "name": "Fraud Detection Feed",
                "domain": "Risk & Compliance",
                "business_unit": "Risk",
                "owner_id": cdo_user.id,  # Elena Volkov -> CDO user
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.active,
                "created_at": datetime(2025, 9, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 18, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 34000,
                "cost_breakdown": {"compute": 18000, "storage": 4000, "pipeline": 6000, "human_estimate": 6000},
                "declared_value": 120000,
                "usage_implied_value": 85000,
                "composite_value": 0.7 * 120000 + 0.3 * 85000,
                "roi": (0.7 * 120000 + 0.3 * 85000) / 34000,
                "roi_band": ROIBand.high,
                "cost_trend": 55,
                "cost_coverage": 0.72,
                "monthly_consumers": 28,
                "total_queries": 42000,
                "consumer_teams": [
                    {"name": "Fraud Prevention", "consumers": 12, "percentage": 43},
                    {"name": "Risk Management", "consumers": 8, "percentage": 29},
                    {"name": "Compliance", "consumers": 5, "percentage": 18},
                    {"name": "Data Science", "consumers": 3, "percentage": 11},
                ],
                "usage_trend": 35,
                "peak_consumers": 28,
                "freshness_hours": 0.08,
                "freshness_sla": 0.17,
                "completeness": 0.999,
                "accuracy": 0.992,
                "trust_score": 0.98,
                "is_published": False,
                "is_certified": False,
                "subscription_count": 4,
                "value_declaration": {
                    "declared_by": "Tom Reed",
                    "declared_by_title": "Chief Risk Officer",
                    "method": ValueMethod.cost_avoidance,
                    "value": 120000,
                    "basis": "Prevents est. $120K/month in fraudulent transactions. Based on Q3 detection rate of 94%.",
                    "status": ["peer_reviewed", "cfo_acknowledged"],
                    "declared_at": date(2025, 12, 1),
                    "next_review": date(2026, 6, 1),
                    "is_expiring": False,
                },
                "downstream_products": 0,
                "downstream_models": 2,
                "downstream_dashboards": 3,
                "is_retirement_candidate": False,
                "has_cost_spike": True,
                "has_usage_decline": False,
            },
            # dp-006: Legacy Campaign DB
            {
                "frontend_id": "dp-006",
                "name": "Legacy Campaign DB",
                "domain": "Marketing",
                "business_unit": "Marketing",
                "owner_id": owner_user.id,  # Jennifer Wu -> owner user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.decline,
                "created_at": datetime(2023, 6, 15, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 1, 10, 8, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 14200,
                "cost_breakdown": {"compute": 6100, "storage": 4200, "pipeline": 2400, "human_estimate": 1500},
                "declared_value": None,
                "usage_implied_value": 3200,
                "composite_value": 0.3 * 3200,
                "roi": (0.3 * 3200) / 14200,
                "roi_band": ROIBand.critical,
                "cost_trend": 0,
                "cost_coverage": 0.95,
                "monthly_consumers": 3,
                "total_queries": 45,
                "consumer_teams": [
                    {"name": "Marketing Ops", "consumers": 2, "percentage": 67},
                    {"name": "Analytics", "consumers": 1, "percentage": 33},
                ],
                "usage_trend": -78,
                "peak_consumers": 89,
                "freshness_hours": 24,
                "freshness_sla": 12,
                "completeness": 0.88,
                "accuracy": 0.82,
                "trust_score": 0.72,
                "is_published": False,
                "is_certified": False,
                "subscription_count": 0,
                "value_declaration": None,
                "downstream_products": 0,
                "downstream_models": 0,
                "downstream_dashboards": 1,
                "is_retirement_candidate": True,
                "has_cost_spike": False,
                "has_usage_decline": True,
            },
            # dp-007: Old Product Catalog
            {
                "frontend_id": "dp-007",
                "name": "Old Product Catalog",
                "domain": "Product",
                "business_unit": "Product",
                "owner_id": consumer_user.id,  # Kevin Zhang -> consumer user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.decline,
                "created_at": datetime(2023, 9, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2025, 12, 15, 10, 30, 0, tzinfo=timezone.utc),
                "monthly_cost": 8700,
                "cost_breakdown": {"compute": 3200, "storage": 3100, "pipeline": 1200, "human_estimate": 1200},
                "declared_value": None,
                "usage_implied_value": 2100,
                "composite_value": 0.3 * 2100,
                "roi": (0.3 * 2100) / 8700,
                "roi_band": ROIBand.critical,
                "cost_trend": -2,
                "cost_coverage": 0.91,
                "monthly_consumers": 7,
                "total_queries": 120,
                "consumer_teams": [
                    {"name": "Product", "consumers": 4, "percentage": 57},
                    {"name": "Engineering", "consumers": 3, "percentage": 43},
                ],
                "usage_trend": -62,
                "peak_consumers": 124,
                "freshness_hours": 48,
                "freshness_sla": 24,
                "completeness": 0.91,
                "accuracy": 0.85,
                "trust_score": 0.74,
                "is_published": False,
                "is_certified": False,
                "subscription_count": 0,
                "value_declaration": None,
                "downstream_products": 0,
                "downstream_models": 0,
                "downstream_dashboards": 2,
                "is_retirement_candidate": True,
                "has_cost_spike": False,
                "has_usage_decline": True,
            },
            # dp-008: Employee Analytics
            {
                "frontend_id": "dp-008",
                "name": "Employee Analytics",
                "domain": "People",
                "business_unit": "HR",
                "owner_id": admin_user.id,  # Patricia Moore -> admin user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.active,
                "created_at": datetime(2025, 7, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 12, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 6800,
                "cost_breakdown": {"compute": 2800, "storage": 1200, "pipeline": 1300, "human_estimate": 1500},
                "declared_value": 22000,
                "usage_implied_value": 14000,
                "composite_value": 0.7 * 22000 + 0.3 * 14000,
                "roi": (0.7 * 22000 + 0.3 * 14000) / 6800,
                "roi_band": ROIBand.high,
                "cost_trend": 3,
                "cost_coverage": 0.85,
                "monthly_consumers": 42,
                "total_queries": 1890,
                "consumer_teams": [
                    {"name": "HR", "consumers": 18, "percentage": 43},
                    {"name": "Executive", "consumers": 12, "percentage": 29},
                    {"name": "Finance", "consumers": 8, "percentage": 19},
                    {"name": "Legal", "consumers": 4, "percentage": 10},
                ],
                "usage_trend": 8,
                "peak_consumers": 42,
                "freshness_hours": 12,
                "freshness_sla": 24,
                "completeness": 0.96,
                "accuracy": 0.94,
                "trust_score": 0.92,
                "is_published": True,
                "is_certified": False,
                "subscription_count": 4,
                "value_declaration": {
                    "declared_by": "Nancy Evans",
                    "declared_by_title": "CHRO",
                    "method": ValueMethod.efficiency_gain,
                    "value": 22000,
                    "basis": "Automates quarterly people reports, saving 120 analyst hours/quarter = ~$22K/month.",
                    "status": ["peer_reviewed"],
                    "declared_at": date(2025, 10, 15),
                    "next_review": date(2026, 4, 15),
                    "is_expiring": False,
                },
                "downstream_products": 1,
                "downstream_models": 0,
                "downstream_dashboards": 3,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-009: Pricing Elasticity Model
            {
                "frontend_id": "dp-009",
                "name": "Pricing Elasticity Model",
                "domain": "Pricing",
                "business_unit": "Strategy",
                "owner_id": cfo_user.id,  # Alex Rivera -> CFO user
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.growth,
                "created_at": datetime(2025, 10, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 21, 15, 30, 0, tzinfo=timezone.utc),
                "monthly_cost": 9400,
                "cost_breakdown": {"compute": 5200, "storage": 800, "pipeline": 1600, "human_estimate": 1800},
                "declared_value": 45000,
                "usage_implied_value": 28000,
                "composite_value": 0.7 * 45000 + 0.3 * 28000,
                "roi": (0.7 * 45000 + 0.3 * 28000) / 9400,
                "roi_band": ROIBand.high,
                "cost_trend": 12,
                "cost_coverage": 0.68,
                "monthly_consumers": 18,
                "total_queries": 810,
                "consumer_teams": [
                    {"name": "Strategy", "consumers": 8, "percentage": 44},
                    {"name": "Sales Ops", "consumers": 6, "percentage": 33},
                    {"name": "Finance", "consumers": 4, "percentage": 22},
                ],
                "usage_trend": 25,
                "peak_consumers": 18,
                "freshness_hours": 24,
                "freshness_sla": 48,
                "completeness": 0.98,
                "accuracy": 0.92,
                "trust_score": 0.91,
                "is_published": True,
                "is_certified": False,
                "subscription_count": 3,
                "value_declaration": {
                    "declared_by": "Rachel Kim",
                    "declared_by_title": "VP Strategy",
                    "method": ValueMethod.revenue_attribution,
                    "value": 45000,
                    "basis": "Optimized pricing across 3 product lines yielding $45K/month incremental margin.",
                    "status": ["peer_reviewed"],
                    "declared_at": date(2026, 1, 10),
                    "next_review": date(2026, 7, 10),
                    "is_expiring": False,
                },
                "downstream_products": 0,
                "downstream_models": 1,
                "downstream_dashboards": 2,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-010: Marketing Attribution
            {
                "frontend_id": "dp-010",
                "name": "Marketing Attribution",
                "domain": "Marketing",
                "business_unit": "Marketing",
                "owner_id": owner_user.id,  # Sophie Turner -> owner user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.growth,
                "created_at": datetime(2025, 8, 15, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 10, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 12600,
                "cost_breakdown": {"compute": 5800, "storage": 1600, "pipeline": 2800, "human_estimate": 2400},
                "declared_value": 52000,
                "usage_implied_value": 38000,
                "composite_value": 0.7 * 52000 + 0.3 * 38000,
                "roi": (0.7 * 52000 + 0.3 * 38000) / 12600,
                "roi_band": ROIBand.high,
                "cost_trend": 6,
                "cost_coverage": 0.89,
                "monthly_consumers": 95,
                "total_queries": 4275,
                "consumer_teams": [
                    {"name": "Growth Marketing", "consumers": 42, "percentage": 44},
                    {"name": "Marketing Ops", "consumers": 28, "percentage": 29},
                    {"name": "Finance", "consumers": 15, "percentage": 16},
                    {"name": "Executive", "consumers": 10, "percentage": 11},
                ],
                "usage_trend": 22,
                "peak_consumers": 95,
                "freshness_hours": 4,
                "freshness_sla": 6,
                "completeness": 0.97,
                "accuracy": 0.93,
                "trust_score": 0.94,
                "is_published": True,
                "is_certified": True,
                "subscription_count": 6,
                "value_declaration": {
                    "declared_by": "Sarah Chen",
                    "declared_by_title": "VP Marketing",
                    "method": ValueMethod.revenue_attribution,
                    "value": 52000,
                    "basis": "Enables $52K/month in marketing spend optimization through multi-touch attribution.",
                    "status": ["peer_reviewed", "cfo_acknowledged"],
                    "declared_at": date(2025, 11, 1),
                    "next_review": date(2026, 5, 1),
                    "is_expiring": False,
                },
                "downstream_products": 2,
                "downstream_models": 1,
                "downstream_dashboards": 4,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-011: Test Env Dataset
            {
                "frontend_id": "dp-011",
                "name": "Test Env Dataset",
                "domain": "Engineering",
                "business_unit": "Engineering",
                "owner_id": consumer_user.id,  # Mike Johnson -> consumer user
                "platform": PlatformType.snowflake,
                "lifecycle_stage": LifecycleStage.decline,
                "created_at": datetime(2024, 11, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2025, 11, 1, 8, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 6100,
                "cost_breakdown": {"compute": 1200, "storage": 3800, "pipeline": 600, "human_estimate": 500},
                "declared_value": None,
                "usage_implied_value": 0,
                "composite_value": 0,
                "roi": 0,
                "roi_band": ROIBand.critical,
                "cost_trend": 0,
                "cost_coverage": 0.98,
                "monthly_consumers": 0,
                "total_queries": 0,
                "consumer_teams": [],
                "usage_trend": -100,
                "peak_consumers": 45,
                "freshness_hours": 720,
                "freshness_sla": 24,
                "completeness": 0.65,
                "accuracy": 0.6,
                "trust_score": 0.45,
                "is_published": False,
                "is_certified": False,
                "subscription_count": 0,
                "value_declaration": None,
                "downstream_products": 0,
                "downstream_models": 0,
                "downstream_dashboards": 0,
                "is_retirement_candidate": True,
                "has_cost_spike": False,
                "has_usage_decline": True,
            },
            # dp-012: Inventory Forecast
            {
                "frontend_id": "dp-012",
                "name": "Inventory Forecast",
                "domain": "Operations",
                "business_unit": "Operations",
                "owner_id": admin_user.id,  # Karen White -> admin user
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.active,
                "created_at": datetime(2025, 11, 1, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 8, 30, 0, tzinfo=timezone.utc),
                "monthly_cost": 7800,
                "cost_breakdown": {"compute": 4200, "storage": 900, "pipeline": 1200, "human_estimate": 1500},
                "declared_value": 18000,
                "usage_implied_value": 12000,
                "composite_value": 0.7 * 18000 + 0.3 * 12000,
                "roi": (0.7 * 18000 + 0.3 * 12000) / 7800,
                "roi_band": ROIBand.healthy,
                "cost_trend": 4,
                "cost_coverage": 0.65,
                "monthly_consumers": 24,
                "total_queries": 1080,
                "consumer_teams": [
                    {"name": "Operations", "consumers": 14, "percentage": 58},
                    {"name": "Procurement", "consumers": 6, "percentage": 25},
                    {"name": "Finance", "consumers": 4, "percentage": 17},
                ],
                "usage_trend": 15,
                "peak_consumers": 24,
                "freshness_hours": 4,
                "freshness_sla": 8,
                "completeness": 0.95,
                "accuracy": 0.91,
                "trust_score": 0.9,
                "is_published": True,
                "is_certified": False,
                "subscription_count": 3,
                "value_declaration": {
                    "declared_by": "Linda Park",
                    "declared_by_title": "VP Operations",
                    "method": ValueMethod.cost_avoidance,
                    "value": 18000,
                    "basis": "Reduces inventory holding costs by $18K/month through demand forecasting accuracy.",
                    "status": ["peer_reviewed"],
                    "declared_at": date(2026, 1, 15),
                    "next_review": date(2026, 7, 15),
                    "is_expiring": False,
                },
                "downstream_products": 1,
                "downstream_models": 1,
                "downstream_dashboards": 2,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
            # dp-013: Churn Predictor Features
            {
                "frontend_id": "dp-013",
                "name": "Churn Predictor Features",
                "domain": "Customer Analytics",
                "business_unit": "Marketing",
                "owner_id": consumer_user.id,  # Jun Park
                "platform": PlatformType.databricks,
                "lifecycle_stage": LifecycleStage.draft,
                "created_at": datetime(2025, 12, 10, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 20, 14, 0, 0, tzinfo=timezone.utc),
                "monthly_cost": 3200,
                "cost_breakdown": {"compute": 1800, "storage": 400, "pipeline": 500, "human_estimate": 500},
                "declared_value": None,
                "usage_implied_value": 0,
                "composite_value": 0,
                "roi": None,
                "roi_band": None,
                "cost_trend": 0,
                "cost_coverage": 0.6,
                "monthly_consumers": 0,
                "total_queries": 0,
                "consumer_teams": [],
                "usage_trend": 0,
                "peak_consumers": 0,
                "freshness_hours": 12,
                "freshness_sla": 24,
                "completeness": 0.9,
                "accuracy": 0.88,
                "trust_score": 0.8,
                "is_published": False,
                "is_certified": False,
                "subscription_count": 0,
                "value_declaration": None,
                "downstream_products": 0,
                "downstream_models": 0,
                "downstream_dashboards": 0,
                "is_retirement_candidate": False,
                "has_cost_spike": False,
                "has_usage_decline": False,
            },
        ]

        for p in products_raw:
            fid = p.pop("frontend_id")
            cb_data = p.pop("cost_breakdown")
            ct_data = p.pop("consumer_teams")
            vd_data = p.pop("value_declaration")

            dp = DataProduct(org_id=org_id, **p)
            session.add(dp)
            await session.flush()

            dp_map[fid] = dp

            # Cost breakdown
            session.add(CostBreakdown(data_product_id=dp.id, **cb_data))

            # Consumer teams
            for ct in ct_data:
                session.add(ConsumerTeam(
                    data_product_id=dp.id,
                    team_name=ct["name"],
                    consumers=ct["consumers"],
                    percentage=ct["percentage"],
                ))

            # Value declaration
            if vd_data:
                session.add(ValueDeclaration(data_product_id=dp.id, **vd_data))

        await session.flush()

        # ============================================================
        # 4. Portfolio Cost Trend (portfolio_monthly)
        # ============================================================
        portfolio_cost_trend = [
            {"month": date(2025, 9, 1), "cost": 148000, "value": 412000, "capital_freed": 0, "budget_realloc": 0, "decisions_exec": 0},
            {"month": date(2025, 10, 1), "cost": 152000, "value": 428000, "capital_freed": 0, "budget_realloc": 0, "decisions_exec": 0},
            {"month": date(2025, 11, 1), "cost": 158000, "value": 445000, "capital_freed": 9800, "budget_realloc": 0, "decisions_exec": 1},
            {"month": date(2025, 12, 1), "cost": 162000, "value": 460000, "capital_freed": 9800, "budget_realloc": 0, "decisions_exec": 1},
            {"month": date(2026, 1, 1), "cost": 167000, "value": 478000, "capital_freed": 15900, "budget_realloc": 0, "decisions_exec": 2},
            {"month": date(2026, 2, 1), "cost": 171400, "value": 495000, "capital_freed": 21900, "budget_realloc": 0, "decisions_exec": 4},
        ]
        for pt in portfolio_cost_trend:
            session.add(PortfolioMonthly(
                org_id=org_id,
                month=pt["month"],
                total_products=13,
                total_cost=pt["cost"],
                total_value=pt["value"],
                average_roi=round(pt["value"] / pt["cost"], 4) if pt["cost"] else 0,
                total_consumers=2140,
                capital_freed_cumulative=pt["capital_freed"],
                budget_reallocated=pt["budget_realloc"],
                decisions_executed=pt["decisions_exec"],
            ))

        # ============================================================
        # 5. Per-product ROI history (roi_monthly)
        # ============================================================
        # dp-001 ROI history
        dp001_roi = [
            {"month": date(2025, 9, 1), "roi": 2.9, "cost": 16000, "composite_value": 46400},
            {"month": date(2025, 10, 1), "roi": 3.0, "cost": 16400, "composite_value": 49200},
            {"month": date(2025, 11, 1), "roi": 3.1, "cost": 16800, "composite_value": 52080},
            {"month": date(2025, 12, 1), "roi": 3.2, "cost": 17200, "composite_value": 55040},
            {"month": date(2026, 1, 1), "roi": 3.3, "cost": 17800, "composite_value": 58740},
            {"month": date(2026, 2, 1), "roi": 3.4, "cost": 18400, "composite_value": 57800},
        ]
        for r in dp001_roi:
            session.add(ROIMonthly(data_product_id=dp_map["dp-001"].id, **r))

        # dp-002 ROI history
        dp002_roi = [
            {"month": date(2025, 9, 1), "roi": 3.3, "cost": 23000, "composite_value": 75900},
            {"month": date(2025, 10, 1), "roi": 3.4, "cost": 23200, "composite_value": 78880},
            {"month": date(2025, 11, 1), "roi": 3.5, "cost": 23400, "composite_value": 81900},
            {"month": date(2025, 12, 1), "roi": 3.5, "cost": 23600, "composite_value": 82600},
            {"month": date(2026, 1, 1), "roi": 3.6, "cost": 23900, "composite_value": 86040},
            {"month": date(2026, 2, 1), "roi": 3.6, "cost": 24200, "composite_value": 88100},
        ]
        for r in dp002_roi:
            session.add(ROIMonthly(data_product_id=dp_map["dp-002"].id, **r))

        # dp-006 ROI history
        dp006_roi = [
            {"month": date(2025, 9, 1), "roi": 0.4, "cost": 14200, "composite_value": 5680},
            {"month": date(2025, 10, 1), "roi": 0.3, "cost": 14200, "composite_value": 4260},
            {"month": date(2025, 11, 1), "roi": 0.2, "cost": 14200, "composite_value": 2840},
            {"month": date(2025, 12, 1), "roi": 0.1, "cost": 14200, "composite_value": 1420},
            {"month": date(2026, 1, 1), "roi": 0.08, "cost": 14200, "composite_value": 1136},
            {"month": date(2026, 2, 1), "roi": 0.07, "cost": 14200, "composite_value": 960},
        ]
        for r in dp006_roi:
            session.add(ROIMonthly(data_product_id=dp_map["dp-006"].id, **r))

        # Portfolio-level ROI history
        portfolio_roi = [
            {"month": date(2025, 9, 1), "roi": 2.4, "cost": 148000, "composite_value": 355200},
            {"month": date(2025, 10, 1), "roi": 2.5, "cost": 152000, "composite_value": 380000},
            {"month": date(2025, 11, 1), "roi": 2.6, "cost": 158000, "composite_value": 410800},
            {"month": date(2025, 12, 1), "roi": 2.7, "cost": 162000, "composite_value": 437400},
            {"month": date(2026, 1, 1), "roi": 2.7, "cost": 167000, "composite_value": 450900},
            {"month": date(2026, 2, 1), "roi": 2.8, "cost": 171400, "composite_value": 479920},
        ]
        # Store portfolio ROI as a special "portfolio" entry — use dp-001's id as placeholder
        # or create a separate mechanism. We'll store in ROIMonthly with the first product as a marker.
        # Actually, portfolio-level ROI is already in PortfolioMonthly above. Skip duplicate.

        # ============================================================
        # 6. Per-product cost trends (cost_monthly)
        # ============================================================
        product_cost_trends = {
            "dp-001": _cost_trend(16000, 0.025),
            "dp-002": _cost_trend(23000, 0.008),
            "dp-005": _cost_trend(22000, 0.08),
        }
        for fid, trend in product_cost_trends.items():
            dp_id = dp_map[fid].id
            for i, pt in enumerate(trend):
                session.add(CostMonthly(
                    data_product_id=dp_id,
                    month=MONTH_DATES[i],
                    total_cost=pt["cost"],
                    compute=0,
                    storage=0,
                    pipeline=0,
                    human_estimate=0,
                    coverage_pct=0,
                ))

        # ============================================================
        # 7. Per-product usage trends (usage_monthly)
        # ============================================================
        product_usage_trends_computed = {
            "dp-001": _usage_trend(280, 0.035),
            "dp-002": _usage_trend(170, 0.01),
        }
        # dp-006 has explicit usage trend
        dp006_usage = [
            {"month": "Sep", "consumers": 52, "queries": 2340},
            {"month": "Oct", "consumers": 38, "queries": 1710},
            {"month": "Nov", "consumers": 24, "queries": 1080},
            {"month": "Dec", "consumers": 12, "queries": 540},
            {"month": "Jan", "consumers": 5, "queries": 120},
            {"month": "Feb", "consumers": 3, "queries": 45},
        ]
        product_usage_trends_computed["dp-006"] = dp006_usage

        for fid, trend in product_usage_trends_computed.items():
            dp_id = dp_map[fid].id
            for i, ut in enumerate(trend):
                session.add(UsageMonthly(
                    data_product_id=dp_id,
                    month=MONTH_DATES[i],
                    consumers=ut["consumers"],
                    queries=ut["queries"],
                    bytes_scanned=0,
                ))

        # ============================================================
        # 8. Value Declaration Versions
        # ============================================================
        # dp-001: 2 versions
        vdv_dp001 = [
            {
                "version": 1,
                "declared_by": "Sarah Chen",
                "declared_by_title": "VP Marketing",
                "method": ValueMethod.revenue_attribution,
                "value": 45000,
                "basis": "Initial estimate based on campaign ROI lift from segmentation.",
                "declared_at": date(2025, 6, 1),
                "change_note": None,
            },
            {
                "version": 2,
                "declared_by": "Sarah Chen",
                "declared_by_title": "VP Marketing",
                "method": ValueMethod.revenue_attribution,
                "value": 62000,
                "basis": "Drives segmentation for $740K/year campaign spend. Estimated 8% lift = $62K/month attributed value.",
                "declared_at": date(2025, 12, 10),
                "change_note": "Updated based on Q3/Q4 actual campaign performance. Value increased 38% reflecting proven attribution.",
            },
        ]
        for v in vdv_dp001:
            session.add(ValueDeclarationVersion(data_product_id=dp_map["dp-001"].id, **v))

        # dp-002: 2 versions
        vdv_dp002 = [
            {
                "version": 1,
                "declared_by": "Michael Torres",
                "declared_by_title": "CFO",
                "method": ValueMethod.revenue_attribution,
                "value": 80000,
                "basis": "Supports $10M quarterly forecasting. Estimated $80K/mo in variance reduction.",
                "declared_at": date(2025, 3, 15),
                "change_note": None,
            },
            {
                "version": 2,
                "declared_by": "Michael Torres",
                "declared_by_title": "CFO",
                "method": ValueMethod.revenue_attribution,
                "value": 95000,
                "basis": "Directly supports $12M quarterly revenue forecasting. Accuracy improvements worth $95K/month in reduced variance.",
                "declared_at": date(2025, 9, 15),
                "change_note": "Revenue forecasting scope expanded to $12M quarterly. Variance reduction proved out at $95K/mo.",
            },
        ]
        for v in vdv_dp002:
            session.add(ValueDeclarationVersion(data_product_id=dp_map["dp-002"].id, **v))

        # dp-005: 1 version
        session.add(ValueDeclarationVersion(
            data_product_id=dp_map["dp-005"].id,
            version=1,
            declared_by="Tom Reed",
            declared_by_title="Chief Risk Officer",
            method=ValueMethod.cost_avoidance,
            value=120000,
            basis="Prevents est. $120K/month in fraudulent transactions. Based on Q3 detection rate of 94%.",
            declared_at=date(2025, 12, 1),
            change_note=None,
        ))

        # ============================================================
        # 9. Decisions — all 8
        # ============================================================
        # For dec-008, productId is "dp-legacy-1" which doesn't exist in our dp_map.
        # We'll create a reference to dp-001 since it's the successor.
        # Actually, we need a real product_id. Let's use dp-001 as the linked product
        # since the description says it was migrated to Customer 360.

        decisions_raw = [
            {
                "type": DecisionType.retirement,
                "status": DecisionStatus.approved,
                "product_id": dp_map["dp-011"].id,
                "product_name": "Test Env Dataset",
                "title": "Retire Test Env Dataset \u2014 zero consumers for 90+ days",
                "description": "Product has had 0 consumers since Nov 2025. Storage costs $3.8K/mo with no value. All downstream dashboards migrated.",
                "initiated_by": "Strata",
                "assigned_to": "Mike Johnson",
                "assigned_to_title": "Data Engineer",
                "estimated_impact": 6100,
                "actual_impact": 6100,
                "impact_basis": "Full monthly cost eliminated. No consumers affected.",
                "created_at": datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 1, 28, 14, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 1, 28, 14, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved. Data archived to cold storage. Compute and pipeline shut down. Savings realized from Feb 1.",
            },
            {
                "type": DecisionType.cost_investigation,
                "status": DecisionStatus.approved,
                "product_id": dp_map["dp-005"].id,
                "product_name": "Fraud Detection Feed",
                "title": "Investigate 55% cost spike in Fraud Detection Feed",
                "description": "MoM cost increase from $22K to $34K. Driven by compute scaling for new real-time fraud patterns. High ROI (3.2x) but cost trajectory unsustainable.",
                "initiated_by": "Strata",
                "assigned_to": "Elena Volkov",
                "assigned_to_title": "Risk Analytics Lead",
                "estimated_impact": -8000,
                "actual_impact": -5200,
                "impact_basis": "Optimized query patterns reduced compute by $5.2K/mo while maintaining detection rate. Remaining increase justified by new fraud vectors.",
                "created_at": datetime(2026, 2, 1, 10, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 18, 16, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 2, 18, 16, 0, 0, tzinfo=timezone.utc),
                "resolution": "Compute optimizations applied. Remaining $6.8K increase approved as justified by 3 new fraud pattern detections worth ~$40K/mo in prevented losses.",
            },
            {
                "type": DecisionType.retirement,
                "status": DecisionStatus.under_review,
                "product_id": dp_map["dp-006"].id,
                "product_name": "Legacy Campaign DB",
                "title": "Retire Legacy Campaign DB \u2014 97% usage decline from peak",
                "description": "3 remaining consumers (down from 89). No declared value. $14.2K/mo cost with 0.07x ROI. Marketing team confirms migration to Marketing Attribution complete.",
                "initiated_by": "Strata",
                "assigned_to": "Jennifer Wu",
                "assigned_to_title": "Marketing Ops",
                "estimated_impact": 14200,
                "actual_impact": None,
                "impact_basis": "Full monthly cost elimination. 3 remaining consumers to be migrated to Marketing Attribution (dp-010).",
                "created_at": datetime(2026, 2, 10, 9, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 20, 11, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
            },
            {
                "type": DecisionType.retirement,
                "status": DecisionStatus.under_review,
                "product_id": dp_map["dp-007"].id,
                "product_name": "Old Product Catalog",
                "title": "Retire Old Product Catalog \u2014 replaced by Product Interaction Events",
                "description": "7 consumers remaining (down from 124). Usage declined 62% from peak. No declared value. Product team confirms Product Interaction Events (dp-003) is the successor.",
                "initiated_by": "Strata",
                "assigned_to": "Kevin Zhang",
                "assigned_to_title": "Product Data Engineer",
                "estimated_impact": 8700,
                "actual_impact": None,
                "impact_basis": "Full monthly cost elimination. 7 consumers to migrate to Product Interaction Events.",
                "created_at": datetime(2026, 2, 12, 9, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 19, 15, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
            },
            {
                "type": DecisionType.value_revalidation,
                "status": DecisionStatus.under_review,
                "product_id": dp_map["dp-002"].id,
                "product_name": "Revenue Analytics Hub",
                "title": "Revalidate Revenue Analytics Hub value declaration \u2014 expiring Mar 15",
                "description": "Current $95K/mo declared value expires in 3 weeks. CFO-acknowledged. 180 consumers, 3.6x ROI. Revalidation critical for board reporting accuracy.",
                "initiated_by": "Strata",
                "assigned_to": "James Liu",
                "assigned_to_title": "Finance Data Lead",
                "estimated_impact": 0,
                "actual_impact": None,
                "impact_basis": "No direct cost impact. Failure to revalidate reduces portfolio confidence score and removes $95K/mo from declared value totals.",
                "created_at": datetime(2026, 2, 15, 10, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 22, 9, 0, 0, tzinfo=timezone.utc),
                "resolved_at": None,
                "resolution": None,
            },
            {
                "type": DecisionType.low_roi_review,
                "status": DecisionStatus.rejected,
                "product_id": dp_map["dp-004"].id,
                "product_name": "Supply Chain Metrics",
                "title": "Review declining usage of Supply Chain Metrics",
                "description": "Usage down 5% MoM. 65 consumers (peak 82). ROI still healthy at 2.2x but trajectory concerning. Operations team asked to confirm continued strategic value.",
                "initiated_by": "Strata",
                "assigned_to": "Robert Chen",
                "assigned_to_title": "Operations Data Lead",
                "estimated_impact": 0,
                "actual_impact": 0,
                "impact_basis": "No cost action. Seasonal procurement cycle explains usage dip. Q2 forecast shows recovery to 78 consumers.",
                "created_at": datetime(2026, 1, 20, 9, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 5, 14, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 2, 5, 14, 0, 0, tzinfo=timezone.utc),
                "resolution": "Rejected \u2014 usage decline is seasonal. Procurement cycle normalizes in March. No action needed. Will re-evaluate if Q2 usage stays below 60.",
            },
            {
                "type": DecisionType.cost_investigation,
                "status": DecisionStatus.approved,
                "product_id": dp_map["dp-003"].id,
                "product_name": "Product Interaction Events",
                "title": "Investigate 8% MoM cost increase in Product Interaction Events",
                "description": "Cost grew from $13.7K to $14.8K. Driven by 18% usage growth and new event types. Growth-stage product with strong adoption trajectory.",
                "initiated_by": "Strata",
                "assigned_to": "Aisha Patel",
                "assigned_to_title": "Product Analytics Manager",
                "estimated_impact": -1100,
                "actual_impact": -800,
                "impact_basis": "Switched to reserved compute instances. $800/mo savings. Remaining growth-driven cost increase accepted.",
                "created_at": datetime(2026, 1, 25, 9, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 10, 11, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2026, 2, 10, 11, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved. Reserved instance migration saved $800/mo. Remaining cost growth proportional to 18% usage increase \u2014 healthy growth trajectory.",
            },
            {
                "type": DecisionType.retirement,
                "status": DecisionStatus.approved,
                "product_id": dp_map["dp-001"].id,  # dp-legacy-1 -> linked to Customer 360 as successor
                "product_name": "Legacy CRM Extract",
                "title": "Retire Legacy CRM Extract \u2014 migrated to Customer 360",
                "description": "Fully migrated to Customer 360 in Q3 2025. Zero consumers since October. $9.8K/mo wasted spend.",
                "initiated_by": "Maria Santos",
                "assigned_to": "Maria Santos",
                "assigned_to_title": "Sr. Data Product Manager",
                "estimated_impact": 9800,
                "actual_impact": 9800,
                "impact_basis": "Full cost elimination. All consumers successfully migrated to Customer 360.",
                "created_at": datetime(2025, 10, 15, 9, 0, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2025, 11, 1, 14, 0, 0, tzinfo=timezone.utc),
                "resolved_at": datetime(2025, 11, 1, 14, 0, 0, tzinfo=timezone.utc),
                "resolution": "Approved and executed. Data archived. Compute terminated. $9.8K/mo savings realized from Nov 1.",
            },
        ]

        for d in decisions_raw:
            session.add(Decision(org_id=org_id, **d))

        # ============================================================
        # 10. Notifications — 5
        # ============================================================
        notifications_raw = [
            {
                "type": NotificationType.cost_spike,
                "title": "Cost spike detected",
                "description": "Fraud Detection Feed cost increased 55% MoM (+$12K)",
                "product_id": dp_map["dp-005"].id,
                "product_name": "Fraud Detection Feed",
                "is_read": False,
                "created_at": datetime(2026, 2, 22, 18, 0, 0, tzinfo=timezone.utc),
            },
            {
                "type": NotificationType.retirement_candidate,
                "title": "Retirement recommended",
                "description": "Legacy Campaign DB has 3 consumers (was 89). Saving: $14.2K/mo",
                "product_id": dp_map["dp-006"].id,
                "product_name": "Legacy Campaign DB",
                "is_read": False,
                "created_at": datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc),
            },
            {
                "type": NotificationType.value_expiring,
                "title": "Value declaration expiring",
                "description": "Revenue Analytics Hub declaration expires Mar 15. Revalidation needed.",
                "product_id": dp_map["dp-002"].id,
                "product_name": "Revenue Analytics Hub",
                "is_read": False,
                "created_at": datetime(2026, 2, 20, 10, 0, 0, tzinfo=timezone.utc),
            },
            {
                "type": NotificationType.usage_drop,
                "title": "Usage declining",
                "description": "Old Product Catalog usage dropped 62% from peak",
                "product_id": dp_map["dp-007"].id,
                "product_name": "Old Product Catalog",
                "is_read": True,
                "created_at": datetime(2026, 2, 19, 14, 0, 0, tzinfo=timezone.utc),
            },
            {
                "type": NotificationType.lifecycle_change,
                "title": "Stage transition",
                "description": "Marketing Attribution moved to Growth stage",
                "product_id": dp_map["dp-010"].id,
                "product_name": "Marketing Attribution",
                "is_read": True,
                "created_at": datetime(2026, 2, 18, 11, 0, 0, tzinfo=timezone.utc),
            },
        ]
        for n in notifications_raw:
            session.add(Notification(org_id=org_id, **n))

        # ============================================================
        # 11. Connectors — 2
        # ============================================================
        session.add(ConnectorConfig(
            org_id=org_id,
            name="Production Snowflake",
            connector_type=ConnectorType.snowflake,
            status=ConnectorStatus.connected,
            last_sync_at=datetime(2026, 2, 22, 20, 0, 0, tzinfo=timezone.utc),
            products_found=9,
            cost_coverage=0.92,
            usage_coverage=0.95,
        ))
        session.add(ConnectorConfig(
            org_id=org_id,
            name="ML Workspace",
            connector_type=ConnectorType.databricks,
            status=ConnectorStatus.connected,
            last_sync_at=datetime(2026, 2, 22, 19, 30, 0, tzinfo=timezone.utc),
            products_found=4,
            cost_coverage=0.68,
            usage_coverage=0.88,
        ))

        # ============================================================
        # 12. Benchmark Data — 4 industries
        # ============================================================
        benchmarks_raw = [
            {
                "industry": BenchmarkIndustry.retail,
                "label": "Retail & E-Commerce",
                "median_roi": 2.1,
                "median_cost_per_consumer": 82,
                "median_portfolio_roi": 1.8,
                "p25_roi": 1.2,
                "p75_roi": 3.4,
                "sample_size": 142,
            },
            {
                "industry": BenchmarkIndustry.finance,
                "label": "Financial Services",
                "median_roi": 3.2,
                "median_cost_per_consumer": 145,
                "median_portfolio_roi": 2.6,
                "p25_roi": 1.8,
                "p75_roi": 4.8,
                "sample_size": 198,
            },
            {
                "industry": BenchmarkIndustry.saas,
                "label": "SaaS & Technology",
                "median_roi": 2.8,
                "median_cost_per_consumer": 64,
                "median_portfolio_roi": 2.2,
                "p25_roi": 1.5,
                "p75_roi": 4.1,
                "sample_size": 256,
            },
            {
                "industry": BenchmarkIndustry.healthcare,
                "label": "Healthcare & Life Sciences",
                "median_roi": 1.9,
                "median_cost_per_consumer": 210,
                "median_portfolio_roi": 1.5,
                "p25_roi": 0.8,
                "p75_roi": 3.0,
                "sample_size": 87,
            },
        ]
        for b in benchmarks_raw:
            session.add(BenchmarkData(**b))

        # ============================================================
        # 13. Policy Configs — 7
        # ============================================================
        policies_raw = [
            {
                "name": "ROI Composite Weight \u2014 Declared Value",
                "description": "Weight given to declared (human-asserted) value in the composite value formula",
                "category": PolicyCategory.valuation,
                "current_value": "70%",
                "default_value": "70%",
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "Michael Torres",
            },
            {
                "name": "ROI Composite Weight \u2014 Usage-Implied Value",
                "description": "Weight given to usage-implied (system-calculated) value in the composite value formula",
                "category": PolicyCategory.valuation,
                "current_value": "30%",
                "default_value": "30%",
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "Michael Torres",
            },
            {
                "name": "Retirement Trigger \u2014 Usage Threshold",
                "description": "Products are flagged for retirement when usage drops below this % of peak for 90+ days",
                "category": PolicyCategory.lifecycle,
                "current_value": "20%",
                "default_value": "20%",
                "updated_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Cost Spike Alert Threshold",
                "description": "MoM cost increase percentage that triggers a cost investigation workflow",
                "category": PolicyCategory.cost,
                "current_value": "30%",
                "default_value": "30%",
                "updated_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Value Declaration Review Cycle",
                "description": "Maximum days before a value declaration must be revalidated",
                "category": PolicyCategory.governance,
                "current_value": "180 days",
                "default_value": "180 days",
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "Michael Torres",
            },
            {
                "name": "Minimum Cost Coverage for Confidence",
                "description": "Minimum % of costs that must be tracked by connectors for high-confidence reporting",
                "category": PolicyCategory.cost,
                "current_value": "85%",
                "default_value": "80%",
                "updated_at": datetime(2026, 1, 10, tzinfo=timezone.utc),
                "updated_by": "Michael Torres",
            },
            {
                "name": "Low ROI Review Trigger",
                "description": "Products with ROI below this threshold for 2+ months trigger a review workflow",
                "category": PolicyCategory.valuation,
                "current_value": "1.0x",
                "default_value": "1.0x",
                "updated_at": datetime(2025, 6, 1, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
        ]
        for pol in policies_raw:
            session.add(PolicyConfig(org_id=org_id, **pol))

        # ============================================================
        # 13b. Display Config — 6 entries for frontend threshold bands
        # ============================================================
        import json as _json

        display_configs_raw = [
            {
                "name": "Display — ROI Bands",
                "description": "ROI thresholds for color-coding: high (green) and healthy (neutral) bands",
                "category": PolicyCategory.valuation,
                "current_value": _json.dumps({"high": 3.0, "healthy": 1.0}),
                "default_value": _json.dumps({"high": 3.0, "healthy": 1.0}),
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Display — Trust Score Bands",
                "description": "Trust score thresholds for color-coding: high (green) and medium (neutral) bands",
                "category": PolicyCategory.governance,
                "current_value": _json.dumps({"high": 0.9, "medium": 0.7}),
                "default_value": _json.dumps({"high": 0.9, "medium": 0.7}),
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Display — Confidence Score Bands",
                "description": "Candidate confidence score thresholds for color bands (green/blue/amber/red)",
                "category": PolicyCategory.governance,
                "current_value": _json.dumps({"green": 80, "blue": 60, "amber": 40}),
                "default_value": _json.dumps({"green": 80, "blue": 60, "amber": 40}),
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Display — AI Risk Score Bands",
                "description": "AI project composite score thresholds for risk level classification",
                "category": PolicyCategory.governance,
                "current_value": _json.dumps({"low": 70, "medium": 50, "high": 30}),
                "default_value": _json.dumps({"low": 70, "medium": 50, "high": 30}),
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Display — Pricing Simulation Defaults",
                "description": "Default parameter values for the pricing simulation page",
                "category": PolicyCategory.pricing,
                "current_value": _json.dumps({"markup": 25, "baseFee": 500, "perQuery": 1.25, "freeTier": 500, "adoptionSlider": 12}),
                "default_value": _json.dumps({"markup": 25, "baseFee": 500, "perQuery": 1.25, "freeTier": 500, "adoptionSlider": 12}),
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
            {
                "name": "Display — Team Budget Threshold",
                "description": "Monthly budget threshold per team for over-budget warnings in pricing simulation",
                "category": PolicyCategory.pricing,
                "current_value": _json.dumps({"amount": 4500}),
                "default_value": _json.dumps({"amount": 4500}),
                "updated_at": datetime(2025, 9, 15, tzinfo=timezone.utc),
                "updated_by": "System Default",
            },
        ]
        for dc in display_configs_raw:
            session.add(PolicyConfig(org_id=org_id, **dc))

        # CEI Component Weights — configurable scoring weights for Capital Efficiency Index
        cei_weights = {
            "roi_coverage": 20,
            "action_rate": 20,
            "savings_accuracy": 15,
            "capital_freed_ratio": 15,
            "value_governance": 15,
            "ai_exposure": 15,
        }
        session.add(PolicyConfig(
            org_id=org_id,
            name="CEI — Component Weights",
            description="Scoring weights for the 6 Capital Efficiency Index components (must sum to 100)",
            category=PolicyCategory.governance,
            current_value=_json.dumps(cei_weights),
            default_value=_json.dumps(cei_weights),
            updated_at=datetime(2025, 9, 15, tzinfo=timezone.utc),
            updated_by="System Default",
        ))

        # ============================================================
        # 14. Capital Events — linked to approved decisions
        # ============================================================
        # We need to flush decisions first to get their IDs
        await session.flush()

        # Query back approved decisions for linking
        dec_result = await session.execute(
            select(Decision).where(
                Decision.org_id == org_id,
                Decision.status == DecisionStatus.approved,
            )
        )
        approved_decisions = {d.product_name: d for d in dec_result.scalars().all()}

        # dec-001 (Test Env Dataset retirement) → $6,100/mo freed
        if "Test Env Dataset" in approved_decisions:
            dec = approved_decisions["Test Env Dataset"]
            session.add(CapitalEvent(
                org_id=org_id,
                decision_id=dec.id,
                product_id=dp_map["dp-011"].id,
                event_type=CapitalEventType.retirement_freed,
                amount=6100,
                description="Retired Test Env Dataset: $6,100/mo compute and storage eliminated",
                effective_date=date(2026, 1, 28),
            ))

        # dec-002 (Fraud Detection Feed cost optimization) → $5,200/mo saved
        if "Fraud Detection Feed" in approved_decisions:
            dec = approved_decisions["Fraud Detection Feed"]
            session.add(CapitalEvent(
                org_id=org_id,
                decision_id=dec.id,
                product_id=dp_map["dp-005"].id,
                event_type=CapitalEventType.cost_optimization,
                amount=5200,
                description="Optimized Fraud Detection Feed queries: $5,200/mo compute savings",
                effective_date=date(2026, 2, 18),
            ))

        # dec-007 (Product Interaction Events cost optimization) → $800/mo saved
        if "Product Interaction Events" in approved_decisions:
            dec = approved_decisions["Product Interaction Events"]
            session.add(CapitalEvent(
                org_id=org_id,
                decision_id=dec.id,
                product_id=dp_map["dp-003"].id,
                event_type=CapitalEventType.cost_optimization,
                amount=800,
                description="Reserved compute for Product Interaction Events: $800/mo savings",
                effective_date=date(2026, 2, 10),
            ))

        # dec-008 (Legacy CRM Extract retirement) → $9,800/mo freed
        if "Legacy CRM Extract" in approved_decisions:
            dec = approved_decisions["Legacy CRM Extract"]
            session.add(CapitalEvent(
                org_id=org_id,
                decision_id=dec.id,
                product_id=dp_map["dp-001"].id,
                event_type=CapitalEventType.retirement_freed,
                amount=9800,
                description="Retired Legacy CRM Extract: $9,800/mo freed after migration to Customer 360",
                effective_date=date(2025, 11, 1),
            ))

        # ============================================================
        # 15. Pricing Policy — 1 draft for Customer 360
        # ============================================================
        session.add(PricingPolicy(
            org_id=org_id,
            product_id=dp_map["dp-001"].id,
            product_name="Customer 360",
            version=1,
            model="usage_based",
            params='{"baseFee": 500, "perQuery": 1.25, "freeTier": 500}',
            status=PricingPolicyStatus.draft,
            projected_revenue=12000,
            pre_activation_usage=340,
        ))

        # ============================================================
        # 16. AI Project Review Threshold — Policy Config
        # ============================================================
        session.add(PolicyConfig(
            org_id=org_id,
            name="AI Project Review Threshold",
            description="Composite score below which AI/data projects are flagged for review",
            category=PolicyCategory.valuation,
            current_value="50",
            default_value="50",
            updated_at=datetime(2026, 2, 15, tzinfo=timezone.utc),
            updated_by="Michael Torres",
        ))

        # ============================================================
        # 17. Discovery Connector + Source Assets + Candidates
        # ============================================================
        # Create a discovery_replay connector for the demo data packs
        disc_connector = ConnectorConfig(
            org_id=org_id,
            name="Discovery Replay",
            connector_type=ConnectorType.discovery_replay,
            status=ConnectorStatus.connected,
            last_sync_at=datetime(2026, 2, 22, 21, 0, 0, tzinfo=timezone.utc),
            products_found=0,
            cost_coverage=0.85,
            usage_coverage=0.90,
            config_json={"data_path": "/demo-data"},
        )
        session.add(disc_connector)
        await session.flush()
        disc_conn_id = disc_connector.id

        # Source assets — key assets across 5 platforms used by candidates
        source_assets_raw = [
            # Snowflake
            {"ext": "sf-customer-events", "name": "customer_events", "type": "table", "platform": "snowflake",
             "qn": "PROD_WAREHOUSE.ANALYTICS.CUSTOMER_EVENTS", "display": "Customer Events",
             "owner": "analytics-eng@acme.com", "tags": ["analytics", "customer"]},
            {"ext": "sf-user-profiles", "name": "user_profiles", "type": "table", "platform": "snowflake",
             "qn": "PROD_WAREHOUSE.ANALYTICS.USER_PROFILES", "display": "User Profiles",
             "owner": "analytics-eng@acme.com", "tags": ["analytics", "customer"]},
            {"ext": "sf-customer-360-summary", "name": "customer_360_summary", "type": "table", "platform": "snowflake",
             "qn": "PROD_WAREHOUSE.ANALYTICS.CUSTOMER_360_SUMMARY", "display": "Customer 360 Summary",
             "owner": "analytics-eng@acme.com", "tags": ["analytics", "customer", "certified"]},
            {"ext": "sf-daily-revenue", "name": "daily_revenue", "type": "table", "platform": "snowflake",
             "qn": "PROD_WAREHOUSE.FINANCE.DAILY_REVENUE", "display": "Daily Revenue",
             "owner": "finance-data@acme.com", "tags": ["finance", "revenue", "certified"]},
            {"ext": "sf-monthly-arr", "name": "monthly_arr", "type": "table", "platform": "snowflake",
             "qn": "PROD_WAREHOUSE.FINANCE.MONTHLY_ARR", "display": "Monthly ARR",
             "owner": "finance-data@acme.com", "tags": ["finance", "revenue"]},
            {"ext": "sf-legacy-crm-extract", "name": "legacy_crm_extract", "type": "table", "platform": "snowflake",
             "qn": "PROD_WAREHOUSE.RAW.LEGACY_CRM_EXTRACT", "display": "Legacy CRM Extract",
             "owner": None, "tags": ["legacy", "crm"]},
            # dbt
            {"ext": "dbt-customer-360", "name": "customer_360", "type": "exposure", "platform": "dbt",
             "qn": "exposure:customer_360", "display": "Customer 360 (dbt exposure)",
             "owner": "analytics-eng@acme.com", "tags": ["dbt", "exposure", "customer"]},
            {"ext": "dbt-revenue-reporting", "name": "revenue_reporting", "type": "exposure", "platform": "dbt",
             "qn": "exposure:revenue_reporting", "display": "Revenue Reporting (dbt exposure)",
             "owner": "finance-data@acme.com", "tags": ["dbt", "exposure", "finance"]},
            # Power BI
            {"ext": "pbi-customer-360-overview", "name": "Customer 360 Overview", "type": "dataset", "platform": "powerbi",
             "qn": "powerbi://workspace/acme-analytics/Customer 360 Overview", "display": "Customer 360 Overview",
             "owner": "bi-team@acme.com", "tags": ["powerbi", "customer"]},
            {"ext": "pbi-revenue-dashboard", "name": "Revenue Dashboard", "type": "dataset", "platform": "powerbi",
             "qn": "powerbi://workspace/acme-analytics/Revenue Dashboard", "display": "Revenue Dashboard",
             "owner": "bi-team@acme.com", "tags": ["powerbi", "finance"]},
            # Databricks
            {"ext": "dbx-customer-segments", "name": "customer_segments", "type": "table", "platform": "databricks",
             "qn": "hive_metastore.ml_features.customer_segments", "display": "Customer Segments",
             "owner": "ml-team@acme.com", "tags": ["ml", "customer"]},
            # S3
            {"ext": "s3-crm-export-full", "name": "crm-export-full.parquet", "type": "object", "platform": "s3",
             "qn": "s3://acme-data-lake/raw/crm/crm-export-full.parquet", "display": "CRM Export Full",
             "owner": None, "tags": ["legacy", "crm"]},
        ]

        sa_map: dict[str, SourceAsset] = {}
        for sa_data in source_assets_raw:
            sa = SourceAsset(
                connector_id=disc_conn_id,
                org_id=org_id,
                external_id=sa_data["ext"],
                asset_name=sa_data["name"],
                asset_type=sa_data["type"],
                platform=sa_data["platform"],
                qualified_name=sa_data["qn"],
                display_name=sa_data["display"],
                owner_hint=sa_data["owner"],
                tags_json=sa_data["tags"],
            )
            session.add(sa)
            sa_map[sa_data["ext"]] = sa

        await session.flush()

        # --- Product Candidates ---
        candidates_raw = [
            {
                "candidate_type": CandidateType.semantic_product,
                "name_suggested": "Customer 360",
                "domain_suggested": "Customer Analytics",
                "owner_suggested": "analytics-eng@acme.com",
                "confidence_score": 95,
                "confidence_breakdown_json": {
                    "powerbi_dataset": 45, "dbt_exposure": 35,
                    "usage_score": 25, "no_owner_penalty": 0, "cost_coverage_penalty": -10,
                },
                "evidence_json": {
                    "powerbi_dataset": "Customer 360 Overview",
                    "dbt_exposure": "customer_360",
                    "certified_asset": True,
                    "warehouse_tables": [
                        "PROD_WAREHOUSE.ANALYTICS.CUSTOMER_EVENTS",
                        "PROD_WAREHOUSE.ANALYTICS.USER_PROFILES",
                        "PROD_WAREHOUSE.ANALYTICS.CUSTOMER_360_SUMMARY",
                    ],
                },
                "status": CandidateStatus.new,
                "monthly_cost_estimate": 4200,
                "monthly_consumers": 156,
                "consumer_teams_json": [
                    {"team": "Data Analytics", "consumers": 64},
                    {"team": "BI Platform", "consumers": 42},
                    {"team": "Customer Success", "consumers": 30},
                    {"team": "Executive", "consumers": 20},
                ],
                "cost_coverage_pct": 0.88,
                "source_count": 7,
                "members": [
                    ("pbi-customer-360-overview", "primary", "Power BI dataset — primary consumption layer"),
                    ("dbt-customer-360", "primary", "dbt exposure — declared product boundary"),
                    ("sf-customer-events", "primary", "Warehouse source table"),
                    ("sf-user-profiles", "primary", "Warehouse source table"),
                    ("sf-customer-360-summary", "primary", "Certified summary table"),
                    ("dbx-customer-segments", "derived", "ML feature table derived from customer data"),
                    ("s3-crm-export-full", "consumption", "Legacy CRM data feeding warehouse tables"),
                ],
            },
            {
                "candidate_type": CandidateType.dbt_product,
                "name_suggested": "Revenue Reporting",
                "domain_suggested": "Finance",
                "owner_suggested": "finance-data@acme.com",
                "confidence_score": 75,
                "confidence_breakdown_json": {
                    "dbt_exposure": 35, "usage_score": 20,
                    "no_owner_penalty": 0, "cost_coverage_penalty": -5,
                },
                "evidence_json": {
                    "dbt_exposure": "revenue_reporting",
                    "warehouse_tables": [
                        "PROD_WAREHOUSE.FINANCE.DAILY_REVENUE",
                        "PROD_WAREHOUSE.FINANCE.MONTHLY_ARR",
                    ],
                },
                "status": CandidateStatus.new,
                "monthly_cost_estimate": 2800,
                "monthly_consumers": 84,
                "consumer_teams_json": [
                    {"team": "Finance", "consumers": 48},
                    {"team": "Executive", "consumers": 22},
                    {"team": "Sales Ops", "consumers": 14},
                ],
                "cost_coverage_pct": 0.92,
                "source_count": 4,
                "members": [
                    ("dbt-revenue-reporting", "primary", "dbt exposure — declared product boundary"),
                    ("sf-daily-revenue", "primary", "Warehouse source table"),
                    ("sf-monthly-arr", "primary", "Warehouse source table"),
                    ("pbi-revenue-dashboard", "consumption", "Power BI dataset consuming revenue data"),
                ],
            },
            {
                "candidate_type": CandidateType.usage_bundle,
                "name_suggested": "Marketing Performance Analytics",
                "domain_suggested": "Marketing",
                "owner_suggested": None,
                "confidence_score": 55,
                "confidence_breakdown_json": {
                    "usage_score": 15, "no_owner_penalty": -20, "cost_coverage_penalty": -5,
                },
                "evidence_json": {
                    "warehouse_tables": ["PROD_WAREHOUSE.ANALYTICS.CUSTOMER_EVENTS"],
                },
                "status": CandidateStatus.under_review,
                "monthly_cost_estimate": 1800,
                "monthly_consumers": 38,
                "consumer_teams_json": [
                    {"team": "Marketing Analytics", "consumers": 24},
                    {"team": "Growth", "consumers": 14},
                ],
                "cost_coverage_pct": 0.72,
                "source_count": 2,
                "members": [
                    ("sf-customer-events", "primary", "Shared warehouse table — heavy marketing usage"),
                    ("dbx-customer-segments", "derived", "ML feature table for marketing segmentation"),
                ],
            },
            {
                "candidate_type": CandidateType.usage_bundle,
                "name_suggested": "Legacy CRM Report",
                "domain_suggested": "Sales",
                "owner_suggested": None,
                "confidence_score": 25,
                "confidence_breakdown_json": {
                    "usage_score": 5, "no_owner_penalty": -20, "cost_coverage_penalty": 0,
                },
                "evidence_json": {
                    "warehouse_tables": ["PROD_WAREHOUSE.RAW.LEGACY_CRM_EXTRACT"],
                },
                "status": CandidateStatus.new,
                "monthly_cost_estimate": 300,
                "monthly_consumers": 2,
                "consumer_teams_json": [
                    {"team": "Sales Ops", "consumers": 2},
                ],
                "cost_coverage_pct": 0.95,
                "source_count": 2,
                "members": [
                    ("sf-legacy-crm-extract", "primary", "Legacy CRM data — very low usage"),
                    ("s3-crm-export-full", "primary", "S3 source file for CRM extract"),
                ],
            },
            {
                "candidate_type": CandidateType.certified_asset,
                "name_suggested": "Revenue Daily",
                "domain_suggested": "Finance",
                "owner_suggested": "finance-data@acme.com",
                "confidence_score": 50,
                "confidence_breakdown_json": {
                    "certified_asset": 20, "usage_score": 15,
                    "no_owner_penalty": 0, "cost_coverage_penalty": -5,
                },
                "evidence_json": {
                    "certified_asset": True,
                    "warehouse_tables": ["PROD_WAREHOUSE.FINANCE.DAILY_REVENUE"],
                },
                "status": CandidateStatus.new,
                "monthly_cost_estimate": 900,
                "monthly_consumers": 36,
                "consumer_teams_json": [
                    {"team": "Finance", "consumers": 28},
                    {"team": "Sales Ops", "consumers": 8},
                ],
                "cost_coverage_pct": 0.91,
                "source_count": 1,
                "members": [
                    ("sf-daily-revenue", "primary", "Certified revenue table"),
                ],
            },
        ]

        for cand_data in candidates_raw:
            members_data = cand_data.pop("members")
            cand = ProductCandidate(org_id=org_id, **cand_data)
            session.add(cand)
            await session.flush()

            for ext_id, role, reason in members_data:
                if ext_id in sa_map:
                    session.add(CandidateMember(
                        candidate_id=cand.id,
                        source_asset_id=sa_map[ext_id].id,
                        role=role,
                        inclusion_reason=reason,
                        weight=1.0,
                    ))

        await session.flush()

        # ============================================================
        # Commit all
        # ============================================================
        await session.commit()
        logger.info("Database seeded successfully with 13 data products, 5 candidates, capital events, and all supporting data.")
