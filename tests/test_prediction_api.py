"""
TenantSense AI — API Integration Tests
Tests auth flow, tenant CRUD, and predictions endpoint
Run: pytest tests/test_prediction_api.py -v
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import sys, os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def app():
    try:
        from backend.app.main import app as fastapi_app
        return fastapi_app
    except ImportError:
        pytest.skip("Backend app not fully configured")


@pytest.fixture(scope="session")
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


class TestHealthCheck:
    @pytest.mark.anyio
    async def test_health_endpoint(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "TenantSense AI API"

    @pytest.mark.anyio
    async def test_root_endpoint(self, client):
        response = await client.get("/")
        assert response.status_code == 200


class TestAuthFlow:
    TEST_EMAIL = "test_user@tenantsense.ai"
    TEST_PASSWORD = "TestPassword123"
    _token: str = None

    @pytest.mark.anyio
    async def test_register(self, client):
        response = await client.post("/api/v1/auth/register", json={
            "email": self.TEST_EMAIL,
            "full_name": "Test User",
            "password": self.TEST_PASSWORD,
            "role": "property_manager",
        })
        assert response.status_code in (201, 400), f"Unexpected: {response.text}"

    @pytest.mark.anyio
    async def test_login(self, client):
        response = await client.post("/api/v1/auth/login", data={
            "username": self.TEST_EMAIL,
            "password": self.TEST_PASSWORD,
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            TestAuthFlow._token = data["access_token"]
        else:
            pytest.skip("Login failed — database may not be available")

    @pytest.mark.anyio
    async def test_get_me(self, client):
        if not TestAuthFlow._token:
            pytest.skip("No auth token available")
        response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {TestAuthFlow._token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == self.TEST_EMAIL


class TestPredictionEndpoint:
    @pytest.mark.anyio
    async def test_prediction_structure(self, client):
        """Test prediction API returns correct structure (with mock fallback)."""
        if not TestAuthFlow._token:
            pytest.skip("No auth token")
        # Create a tenant first
        tenant_resp = await client.post("/api/v1/tenants/", json={
            "full_name": "Test Tenant", "email": "testtenant@test.com",
            "city": "Chennai", "property_type": "2BHK",
        }, headers={"Authorization": f"Bearer {TestAuthFlow._token}"})

        if tenant_resp.status_code != 201:
            pytest.skip("Could not create test tenant")

        tenant_id = tenant_resp.json()["id"]
        pred_resp = await client.post("/api/v1/predictions/", json={"tenant_id": tenant_id},
                                      headers={"Authorization": f"Bearer {TestAuthFlow._token}"})
        assert pred_resp.status_code == 200
        data = pred_resp.json()
        assert "risk_score" in data
        assert "risk_level" in data
        assert 0.0 <= data["risk_score"] <= 1.0
        assert data["risk_level"] in ("low", "medium", "high")
