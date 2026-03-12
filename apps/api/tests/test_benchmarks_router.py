"""Tests for the /benchmarks router — industry benchmark data."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BenchmarkData, BenchmarkIndustry
from tests.conftest import auth_headers, make_token


@pytest.fixture
async def benchmark_seed(db: AsyncSession, org_and_user):
    """Seed benchmark data for tests."""
    org, user, _ = org_and_user
    bench = BenchmarkData(
        industry=BenchmarkIndustry.saas,
        label="SaaS",
        median_roi=2.5,
        median_cost_per_consumer=150.0,
        median_portfolio_roi=1.8,
        p25_roi=1.2,
        p75_roi=3.5,
        sample_size=250,
    )
    db.add(bench)
    await db.commit()
    return bench


class TestBenchmarks:
    @pytest.mark.asyncio
    async def test_list_benchmarks(self, client: AsyncClient, org_and_user, benchmark_seed):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/benchmarks/", headers=auth_headers(token))
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_benchmarks_empty(self, client: AsyncClient, org_and_user):
        org, user, _ = org_and_user
        token = make_token(user.id, org.id)
        res = await client.get("/api/v1/benchmarks/", headers=auth_headers(token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    @pytest.mark.asyncio
    async def test_benchmarks_unauthenticated(self, client: AsyncClient):
        res = await client.get("/api/v1/benchmarks/")
        assert res.status_code == 401
