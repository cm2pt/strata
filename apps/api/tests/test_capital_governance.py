"""
Tests for Capital Governance Mode:
- Impact Verification Engine
- Capital Allocation Engine
- Enforcement Triggers
- Capital Efficiency Score
- Board Mode Capital Summary
"""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import (
    TestSession,
    auth_headers,
    make_token,
)

from app.main import app
from app.models.data_product import DataProduct, LifecycleStage, PlatformType, ROIBand
from app.models.decision import Decision, DecisionStatus, DecisionType
from app.models.capital import CapitalEvent, CapitalEventType
from app.models.time_series import CostMonthly, ROIMonthly, UsageMonthly, PortfolioMonthly
from app.models.config import BenchmarkData, BenchmarkIndustry, Notification
from app.models.audit import AuditLog
from app.models.org import Organization


# ---------- Helpers ----------


async def _seed_product(
    db: AsyncSession,
    org_id: uuid.UUID,
    owner_id: uuid.UUID,
    name: str = "Test Product",
    monthly_cost: float = 10000,
    composite_value: float = 30000,
    roi: float = 3.0,
    monthly_consumers: int = 50,
    peak_consumers: int = 100,
    lifecycle_stage: LifecycleStage = LifecycleStage.active,
    usage_trend: float = 0,
    cost_trend: float = 0,
) -> DataProduct:
    dp = DataProduct(
        org_id=org_id,
        owner_id=owner_id,
        name=name,
        domain="Test",
        business_unit="Engineering",
        platform=PlatformType.snowflake,
        lifecycle_stage=lifecycle_stage,
        monthly_cost=monthly_cost,
        composite_value=composite_value,
        roi=roi,
        roi_band=ROIBand.high if roi > 3 else ROIBand.healthy if roi > 1 else ROIBand.underperforming if roi > 0.5 else ROIBand.critical,
        monthly_consumers=monthly_consumers,
        peak_consumers=peak_consumers,
        usage_trend=usage_trend,
        cost_trend=cost_trend,
    )
    db.add(dp)
    await db.flush()
    return dp


async def _seed_cost_monthly(
    db: AsyncSession,
    product_id: uuid.UUID,
    months_back: int = 6,
    base_cost: float = 10000,
) -> list[CostMonthly]:
    """Seed monthly cost data going back N months."""
    rows = []
    for i in range(months_back):
        m = date.today() - timedelta(days=30 * (months_back - i - 1))
        m = date(m.year, m.month, 1)
        row = CostMonthly(
            data_product_id=product_id,
            month=m,
            total_cost=base_cost,
            compute=base_cost * 0.5,
            storage=base_cost * 0.1,
            pipeline=base_cost * 0.2,
            human_estimate=base_cost * 0.2,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    return rows


async def _seed_roi_monthly(
    db: AsyncSession,
    product_id: uuid.UUID,
    months_back: int = 6,
    roi: float = 3.0,
    cost: float = 10000,
) -> list[ROIMonthly]:
    rows = []
    for i in range(months_back):
        m = date.today() - timedelta(days=30 * (months_back - i - 1))
        m = date(m.year, m.month, 1)
        row = ROIMonthly(
            data_product_id=product_id,
            month=m,
            roi=roi,
            cost=cost,
            composite_value=cost * roi,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    return rows


async def _seed_usage_monthly(
    db: AsyncSession,
    product_id: uuid.UUID,
    months_back: int = 6,
    consumers: int = 50,
) -> list[UsageMonthly]:
    rows = []
    for i in range(months_back):
        m = date.today() - timedelta(days=30 * (months_back - i - 1))
        m = date(m.year, m.month, 1)
        row = UsageMonthly(
            data_product_id=product_id,
            month=m,
            consumers=consumers,
            queries=consumers * 100,
        )
        db.add(row)
        rows.append(row)
    await db.flush()
    return rows


# ==========================================================================
# 1. IMPACT VERIFICATION ENGINE
# ==========================================================================


class TestImpactVerification:
    """Tests for the Decision Impact Verification Engine."""

    @pytest.mark.asyncio
    async def test_impact_report_for_approved_retirement(self, org_and_user, db):
        """Impact report should compute savings for an approved retirement decision."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(db, org.id, user.id, monthly_cost=15000)
        await _seed_cost_monthly(db, product.id, months_back=6, base_cost=15000)

        decision = Decision(
            org_id=org.id,
            type=DecisionType.retirement,
            status=DecisionStatus.approved,
            product_id=product.id,
            product_name=product.name,
            title="Retire test product",
            description="Test",
            initiated_by=user.name,
            assigned_to=user.name,
            estimated_impact=15000,
            projected_savings_monthly=15000,
            projected_savings_annual=180000,
            impact_validation_status="validating",
            validation_start_date=datetime.now(timezone.utc) - timedelta(days=30),
            resolved_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        db.add(decision)
        await db.commit()
        await db.refresh(decision)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                f"/api/v1/decisions/{decision.id}/impact-report",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "actual_savings_measured" in data
        assert "variance_from_projection" in data
        assert "confidence_score" in data
        assert "narrative_summary" in data
        assert "cost_trend" in data
        assert data["decision_id"] == str(decision.id)

    @pytest.mark.asyncio
    async def test_impact_report_requires_approved_status(self, org_and_user, db):
        """Impact report should 400 for non-approved decisions."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(db, org.id, user.id)
        decision = Decision(
            org_id=org.id,
            type=DecisionType.retirement,
            status=DecisionStatus.under_review,
            product_id=product.id,
            product_name=product.name,
            title="Pending",
            description="Test",
            initiated_by=user.name,
            assigned_to=user.name,
            estimated_impact=10000,
        )
        db.add(decision)
        await db.commit()
        await db.refresh(decision)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                f"/api/v1/decisions/{decision.id}/impact-report",
                headers=auth_headers(token),
            )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_validation_auto_starts_on_approval(self, org_and_user, db):
        """When a retirement is approved, validation should auto-start."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(db, org.id, user.id, monthly_cost=5000)
        decision = Decision(
            org_id=org.id,
            type=DecisionType.retirement,
            status=DecisionStatus.under_review,
            product_id=product.id,
            product_name=product.name,
            title="Retire",
            description="Test",
            initiated_by=user.name,
            assigned_to=user.name,
            estimated_impact=5000,
        )
        db.add(decision)
        await db.commit()
        await db.refresh(decision)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/v1/decisions/{decision.id}/approve-retirement",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200

        await db.refresh(decision)
        assert decision.impact_validation_status == "validating"
        assert decision.validation_start_date is not None

    @pytest.mark.asyncio
    async def test_validation_sweep(self, org_and_user, db):
        """Validation sweep should process validating decisions."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(db, org.id, user.id, monthly_cost=10000)
        await _seed_cost_monthly(db, product.id, months_back=6, base_cost=10000)

        decision = Decision(
            org_id=org.id,
            type=DecisionType.retirement,
            status=DecisionStatus.approved,
            product_id=product.id,
            product_name=product.name,
            title="Retire test",
            description="Test",
            initiated_by=user.name,
            assigned_to=user.name,
            estimated_impact=10000,
            projected_savings_monthly=10000,
            projected_savings_annual=120000,
            impact_validation_status="validating",
            validation_start_date=datetime.now(timezone.utc) - timedelta(days=30),
            resolved_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        db.add(decision)
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/decisions/run-validation-sweep",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["updated_count"] >= 1


# ==========================================================================
# 2. CAPITAL ALLOCATION ENGINE
# ==========================================================================


class TestCapitalAllocation:
    """Tests for the Capital Allocation Engine portfolio-rebalance endpoint."""

    @pytest.mark.asyncio
    async def test_portfolio_rebalance_basic(self, org_and_user, db):
        """Portfolio rebalance should return quartile analysis and projections."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        # Create 4 products with varying ROI
        for name, cost, roi in [
            ("Low ROI", 20000, 0.3),
            ("Medium Low", 15000, 0.8),
            ("Medium High", 15000, 2.5),
            ("High ROI", 10000, 5.0),
        ]:
            await _seed_product(
                db, org.id, user.id,
                name=name, monthly_cost=cost, composite_value=cost * roi, roi=roi,
            )
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/allocation/portfolio-rebalance",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "current_blended_roi" in data
        assert "projected_blended_roi" in data
        assert "efficiency_delta" in data
        assert "bottom_quartile" in data
        assert "top_quartile" in data
        assert "recommended_divest" in data
        assert "recommended_invest" in data
        assert data["total_products"] == 4
        assert data["projected_blended_roi"] >= data["current_blended_roi"]

    @pytest.mark.asyncio
    async def test_portfolio_rebalance_empty(self, org_and_user, db):
        """Should handle empty portfolio gracefully."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/allocation/portfolio-rebalance",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_products"] == 0


# ==========================================================================
# 3. ENFORCEMENT TRIGGERS
# ==========================================================================


class TestEnforcementTriggers:
    """Tests for automated enforcement rules."""

    @pytest.mark.asyncio
    async def test_low_roi_trigger(self, org_and_user, db):
        """Product with ROI < 0.5 for 3 months should trigger low_roi_review."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(
            db, org.id, user.id,
            name="Low ROI Product", monthly_cost=10000, roi=0.3,
        )
        # Seed 3 months of low ROI
        await _seed_roi_monthly(db, product.id, months_back=4, roi=0.3, cost=10000)
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/enforcement/run-sweep",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_created"] >= 1
        assert len(data["low_roi_decisions"]) >= 1

    @pytest.mark.asyncio
    async def test_usage_decay_trigger(self, org_and_user, db):
        """Product with >60% usage decay for 90 days should trigger retirement."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(
            db, org.id, user.id,
            name="Decaying Product",
            monthly_cost=8000,
            monthly_consumers=10,  # current: 10
            peak_consumers=100,     # peak: 100 (90% decay)
        )
        # Seed 3 months of low usage (< 40% of peak)
        await _seed_usage_monthly(db, product.id, months_back=4, consumers=10)
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/enforcement/run-sweep",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_created"] >= 1
        assert len(data["retirement_decisions"]) >= 1

    @pytest.mark.asyncio
    async def test_cost_spike_trigger(self, org_and_user, db):
        """Product with >40% cost spike MoM should trigger cost_investigation."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(
            db, org.id, user.id,
            name="Spiking Product", monthly_cost=14000,
        )
        # Seed 2 months: first at 10000, second at 14500 (45% spike)
        today = date.today()
        prev_month = date(today.year, today.month - 1, 1) if today.month > 1 else date(today.year - 1, 12, 1)
        curr_month = date(today.year, today.month, 1)

        cost1 = CostMonthly(data_product_id=product.id, month=prev_month, total_cost=10000)
        cost2 = CostMonthly(data_product_id=product.id, month=curr_month, total_cost=14500)
        db.add_all([cost1, cost2])
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/enforcement/run-sweep",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_created"] >= 1
        assert len(data["cost_anomaly_decisions"]) >= 1

    @pytest.mark.asyncio
    async def test_no_duplicate_decisions(self, org_and_user, db):
        """Should NOT create a decision if one is already under_review for the product."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(
            db, org.id, user.id,
            name="Already Flagged", monthly_cost=10000, roi=0.3,
        )
        await _seed_roi_monthly(db, product.id, months_back=4, roi=0.3, cost=10000)

        # Pre-existing open decision
        existing = Decision(
            org_id=org.id,
            type=DecisionType.low_roi_review,
            status=DecisionStatus.under_review,
            product_id=product.id,
            product_name=product.name,
            title="Existing review",
            description="Already flagged",
            initiated_by="system",
            assigned_to="CDO",
            estimated_impact=3000,
        )
        db.add(existing)
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/enforcement/run-sweep",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_created"] == 0

    @pytest.mark.asyncio
    async def test_enforcement_creates_audit_log(self, org_and_user, db):
        """Enforcement trigger should create an audit log entry."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(
            db, org.id, user.id,
            name="Audit Test", monthly_cost=10000, roi=0.3,
        )
        await _seed_roi_monthly(db, product.id, months_back=4, roi=0.3, cost=10000)
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/enforcement/run-sweep",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200

        from sqlalchemy import select, func
        audit_count = await db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.action.like("enforcement.%"),
            )
        )
        assert audit_count.scalar() >= 1


# ==========================================================================
# 4. CAPITAL EFFICIENCY SCORE
# ==========================================================================


class TestCapitalEfficiency:
    """Tests for the Capital Efficiency Score endpoint."""

    @pytest.mark.asyncio
    async def test_capital_efficiency_basic(self, org_and_user, db):
        """Capital efficiency score should return score with components."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        # Seed products with varying ROI
        for name, cost, roi in [
            ("Good Product", 10000, 2.5),
            ("Great Product", 8000, 4.0),
            ("Bad Product", 12000, 0.4),
        ]:
            await _seed_product(
                db, org.id, user.id, name=name,
                monthly_cost=cost, composite_value=cost * roi, roi=roi,
            )
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/capital-efficiency/",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "score" in data
        assert 0 <= data["score"] <= 100
        assert "components" in data
        components = data["components"]
        assert "roi_coverage" in components
        assert "action_rate" in components
        assert "savings_accuracy" in components
        assert "capital_freed_ratio" in components
        # 2 of 3 products have ROI > 1 → roi_coverage should be partial
        assert components["roi_coverage"]["score"] > 0

    @pytest.mark.asyncio
    async def test_capital_efficiency_empty(self, org_and_user, db):
        """Should handle empty portfolio gracefully."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/capital-efficiency/",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["score"] >= 0


# ==========================================================================
# 5. BOARD MODE CAPITAL SUMMARY
# ==========================================================================


class TestBoardCapitalSummary:
    """Tests for the Board Mode capital summary endpoint."""

    @pytest.mark.asyncio
    async def test_board_summary_basic(self, org_and_user, db):
        """Board summary should return all required fields."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")

        product = await _seed_product(db, org.id, user.id, monthly_cost=10000)

        # Create an approved decision with capital event
        decision = Decision(
            org_id=org.id,
            type=DecisionType.retirement,
            status=DecisionStatus.approved,
            product_id=product.id,
            product_name=product.name,
            title="Retire for board",
            description="Test",
            initiated_by=user.name,
            assigned_to=user.name,
            estimated_impact=10000,
            capital_freed=10000,
            projected_savings_monthly=10000,
            projected_savings_annual=120000,
            impact_validation_status="confirmed",
            actual_savings_measured=9500,
            resolved_at=datetime.now(timezone.utc),
        )
        db.add(decision)
        await db.flush()

        event = CapitalEvent(
            org_id=org.id,
            decision_id=decision.id,
            product_id=product.id,
            event_type=CapitalEventType.retirement_freed,
            amount=10000,
            description="Retirement savings",
            effective_date=date.today(),
        )
        db.add(event)

        # Seed portfolio monthly for ROI delta
        pm = PortfolioMonthly(
            org_id=org.id,
            month=date.today().replace(day=1),
            total_products=10,
            total_cost=100000,
            total_value=300000,
            average_roi=3.0,
        )
        db.add(pm)
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/board/capital-summary",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["totalCapitalFreed"] == 10000
        assert data["confirmedSavings"] == 9500
        assert data["capitalEfficiencyScore"] >= 0
        assert "topCapitalActions" in data
        assert len(data["topCapitalActions"]) >= 1

    @pytest.mark.asyncio
    async def test_board_summary_empty(self, org_and_user, db):
        """Should handle empty data gracefully."""
        org, user, _ = org_and_user
        token = make_token(user.id, org.id, "admin")
        await db.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/board/capital-summary",
                headers=auth_headers(token),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["totalCapitalFreed"] == 0
