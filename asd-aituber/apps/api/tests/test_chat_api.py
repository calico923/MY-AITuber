"""Test chat API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestChatAPI:
    """Test chat API endpoints."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create a test client."""
        return TestClient(app)

    def test_send_message_success(self, client: TestClient) -> None:
        """Test successful message sending."""
        message_data = {
            "content": "Hello, how are you?",
            "emotion": "neutral"
        }
        response = client.post("/api/v1/chat/message", json=message_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "emotion" in data
        assert "internal_emotion" in data
        assert data["emotion"] in ["joy", "anger", "sadness", "surprise", "fear", "disgust", "neutral"]

    def test_send_message_with_asd_mode(self, client: TestClient) -> None:
        """Test message sending in ASD mode."""
        message_data = {
            "content": "What do you mean by that?",
            "emotion": "neutral",
            "mode": "ASD"
        }
        response = client.post("/api/v1/chat/message", json=message_data)
        assert response.status_code == 200
        
        data = response.json()
        # In ASD mode, internal and expressed emotions should be the same
        assert data["emotion"] == data["internal_emotion"]

    def test_send_message_with_nt_mode(self, client: TestClient) -> None:
        """Test message sending in NT mode."""
        message_data = {
            "content": "I'm fine, thanks for asking!",
            "emotion": "joy",
            "mode": "NT"
        }
        response = client.post("/api/v1/chat/message", json=message_data)
        assert response.status_code == 200
        
        data = response.json()
        # In NT mode, internal and expressed emotions might differ
        assert "emotion" in data
        assert "internal_emotion" in data

    def test_send_message_invalid_emotion(self, client: TestClient) -> None:
        """Test message sending with invalid emotion."""
        message_data = {
            "content": "Hello!",
            "emotion": "invalid_emotion"
        }
        response = client.post("/api/v1/chat/message", json=message_data)
        assert response.status_code == 422  # Validation error

    def test_send_empty_message(self, client: TestClient) -> None:
        """Test sending empty message."""
        message_data = {
            "content": "",
            "emotion": "neutral"
        }
        response = client.post("/api/v1/chat/message", json=message_data)
        assert response.status_code == 422  # Validation error

    def test_get_chat_history(self, client: TestClient) -> None:
        """Test getting chat history."""
        response = client.get("/api/v1/chat/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)

    def test_clear_chat_history(self, client: TestClient) -> None:
        """Test clearing chat history."""
        response = client.delete("/api/v1/chat/history")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True

    def test_get_emotion_analysis(self, client: TestClient) -> None:
        """Test emotion analysis endpoint."""
        text_data = {"text": "I am very happy today!"}
        response = client.post("/api/v1/chat/analyze-emotion", json=text_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "emotion" in data
        assert "confidence" in data
        assert 0 <= data["confidence"] <= 1