"""Chat endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.chat import (
    ASDNTMode,
    ChatHistoryResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ClearHistoryResponse,
    EmotionAnalysisRequest,
    EmotionAnalysisResponse,
)
from app.services.chat_service import chat_service
from app.services.emotion_service import EmotionService

router = APIRouter()
emotion_service = EmotionService()


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(request: ChatMessageRequest) -> ChatMessageResponse:
    """Send a chat message and get AI response."""
    try:
        # Default to ASD mode if not specified
        mode = request.mode or ASDNTMode.ASD
        response = await chat_service.process_message(request, mode)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history() -> ChatHistoryResponse:
    """Get chat message history."""
    try:
        messages = await chat_service.get_history()
        return ChatHistoryResponse(messages=messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history", response_model=ClearHistoryResponse)
async def clear_chat_history() -> ClearHistoryResponse:
    """Clear chat message history."""
    try:
        success = await chat_service.clear_history()
        return ClearHistoryResponse(success=success)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-emotion", response_model=EmotionAnalysisResponse)
async def analyze_emotion(request: EmotionAnalysisRequest) -> EmotionAnalysisResponse:
    """Analyze emotion in text."""
    try:
        emotion, confidence, scores = await emotion_service.analyze_emotion_with_confidence(
            request.text
        )
        return EmotionAnalysisResponse(
            emotion=emotion,
            confidence=confidence,
            scores=scores
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))