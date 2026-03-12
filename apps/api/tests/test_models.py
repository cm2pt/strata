"""Tests for model definitions and enum values."""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserOrgRole, UserRole
from app.models.org import Organization
from app.models.data_product import DataProduct, LifecycleStage, PlatformType, ROIBand
from app.models.candidate import ProductCandidate, CandidateMember, CandidateType, CandidateStatus
from app.models.audit import AuditLog
from app.models.decision import Decision, DecisionType, DecisionStatus
from app.models.config import Notification, NotificationType


class TestUserRole:
    def test_all_15_roles_exist(self):
        expected = [
            "cfo", "cdo", "product_owner", "consumer", "admin",
            "executive_sponsor", "fpa_analyst", "governance_steward",
            "platform_admin", "data_engineer", "dataops_sre",
            "head_of_ai", "data_scientist", "external_auditor",
            "integration_service",
        ]
        for role in expected:
            assert UserRole(role).value == role

    def test_role_string_values(self):
        assert UserRole.cfo.value == "cfo"
        assert UserRole.admin.value == "admin"
        assert UserRole.data_engineer.value == "data_engineer"


class TestLifecycleStage:
    def test_all_stages(self):
        stages = ["draft", "active", "growth", "mature", "decline", "retired"]
        for s in stages:
            assert LifecycleStage(s).value == s


class TestCandidateEnums:
    def test_candidate_types(self):
        for t in ["semantic_product", "dbt_product", "usage_bundle", "certified_asset"]:
            assert CandidateType(t).value == t

    def test_candidate_statuses(self):
        for s in ["new", "under_review", "promoted", "ignored"]:
            assert CandidateStatus(s).value == s


class TestDecisionEnums:
    def test_decision_types(self):
        for t in ["retirement", "cost_investigation", "value_revalidation",
                   "low_roi_review", "capital_reallocation", "pricing_activation",
                   "ai_project_review"]:
            assert DecisionType(t).value == t

    def test_decision_statuses(self):
        for s in ["under_review", "approved", "rejected", "delayed"]:
            assert DecisionStatus(s).value == s


class TestUserModel:
    @pytest.mark.asyncio
    async def test_create_user(self, db: AsyncSession):
        user = User(email="model@test.com", password_hash="hash", name="Model User", is_active=True)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        assert user.id is not None
        assert user.email == "model@test.com"

    @pytest.mark.asyncio
    async def test_user_defaults(self, db: AsyncSession):
        user = User(email="def@test.com", password_hash="hash", name="Default")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        assert user.is_active is True
        assert user.title is None


class TestOrganizationModel:
    @pytest.mark.asyncio
    async def test_create_org(self, db: AsyncSession):
        org = Organization(name="Test Org", slug="test-org")
        db.add(org)
        await db.commit()
        await db.refresh(org)
        assert org.id is not None
        assert org.slug == "test-org"


class TestDataProductModel:
    @pytest.mark.asyncio
    async def test_create_product(self, db: AsyncSession):
        org = Organization(name="P Corp", slug="p-corp")
        db.add(org)
        await db.flush()

        user = User(email="p@test.com", password_hash="hash", name="P User")
        db.add(user)
        await db.flush()

        product = DataProduct(
            org_id=org.id,
            owner_id=user.id,
            name="Test Product",
            domain="analytics",
            business_unit="Eng",
            platform=PlatformType.snowflake,
            lifecycle_stage=LifecycleStage.draft,
            monthly_cost=Decimal("1500.00"),
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)
        assert product.id is not None
        assert float(product.monthly_cost) == 1500.00


class TestProductCandidateModel:
    @pytest.mark.asyncio
    async def test_create_candidate(self, db: AsyncSession):
        org = Organization(name="C Corp", slug="c-corp")
        db.add(org)
        await db.flush()

        candidate = ProductCandidate(
            org_id=org.id,
            candidate_type=CandidateType.semantic_product,
            name_suggested="Candidate Test",
            confidence_score=90,
            status=CandidateStatus.new,
        )
        db.add(candidate)
        await db.commit()
        await db.refresh(candidate)
        assert candidate.id is not None
        assert candidate.confidence_score == 90
