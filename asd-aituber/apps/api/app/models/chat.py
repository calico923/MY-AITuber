"""Chat data models."""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Emotion(str, Enum):
    """Emotion types."""
    JOY = "joy"
    ANGER = "anger"
    SADNESS = "sadness"
    SURPRISE = "surprise"
    FEAR = "fear"
    DISGUST = "disgust"
    NEUTRAL = "neutral"


class ASDNTMode(str, Enum):
    """ASD/NT mode types."""
    ASD = "ASD"
    NT = "NT"


class MessageRole(str, Enum):
    """Message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessageRequest(BaseModel):
    """Request model for sending chat messages."""
    content: str = Field(..., min_length=1, description="Message content")
    emotion: Emotion = Field(default=Emotion.NEUTRAL, description="User emotion")
    mode: Optional[ASDNTMode] = Field(default=None, description="Communication mode")


class ChatMessageResponse(BaseModel):
    """Response model for chat messages."""
    message: str = Field(..., description="AI response message")
    emotion: Emotion = Field(..., description="Expressed emotion")
    internal_emotion: Emotion = Field(..., description="Internal emotion")
    timestamp: datetime = Field(default_factory=datetime.now)


class ChatMessage(BaseModel):
    """Chat message model."""
    id: str
    role: MessageRole
    content: str
    timestamp: datetime
    emotion: Emotion
    internal_emotion: Optional[Emotion] = None


class ChatHistoryResponse(BaseModel):
    """Response model for chat history."""
    messages: List[ChatMessage]


class ClearHistoryResponse(BaseModel):
    """Response model for clearing chat history."""
    success: bool = True
    message: str = "Chat history cleared"


class EmotionAnalysisRequest(BaseModel):
    """Request model for emotion analysis."""
    text: str = Field(..., min_length=1, description="Text to analyze")


class EmotionAnalysisResponse(BaseModel):
    """Response model for emotion analysis."""
    emotion: Emotion
    confidence: float = Field(..., ge=0.0, le=1.0)
    scores: dict[str, float] = Field(default_factory=dict)