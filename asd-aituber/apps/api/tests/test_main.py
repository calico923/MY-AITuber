"""Test main FastAPI application."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestMainApp:
    """Test the main FastAPI application."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create a test client."""
        return TestClient(app)

    def test_health_check(self, client: TestClient) -> None:
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "service": "asd-aituber-api"}

    def test_root_endpoint(self, client: TestClient) -> None:
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()

    def test_cors_configuration(self, client: TestClient) -> None:
        """Test CORS is configured (middleware present)."""
        # Test that the application accepts requests from allowed origins
        response = client.get(
            "/health",
            headers={"Origin": "http://localhost:3002"}
        )
        assert response.status_code == 200

    def test_api_prefix(self, client: TestClient) -> None:
        """Test API routes use correct prefix."""
        response = client.get("/api/v1/status")
        assert response.status_code == 200
        assert "version" in response.json()

    def test_invalid_endpoint_returns_404(self, client: TestClient) -> None:
        """Test that invalid endpoints return 404."""
        response = client.get("/non-existent-endpoint")
        assert response.status_code == 404