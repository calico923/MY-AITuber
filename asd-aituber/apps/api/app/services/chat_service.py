"""Chat service implementation."""

import uuid
from datetime import datetime
from typing import List

from app.models.chat import (
    ASDNTMode,
    ChatMessage,
    ChatMessageRequest,
    ChatMessageResponse,
    Emotion,
    MessageRole,
)
from app.services.emotion_service import EmotionService


class ChatService:
    """Service for handling chat operations."""

    def __init__(self) -> None:
        """Initialize chat service."""
        self.messages: List[ChatMessage] = []
        self.emotion_service = EmotionService()

    async def process_message(
        self, 
        request: ChatMessageRequest,
        mode: ASDNTMode = ASDNTMode.ASD
    ) -> ChatMessageResponse:
        """Process incoming chat message and generate response."""
        # Store user message
        user_message = ChatMessage(
            id=str(uuid.uuid4()),
            role=MessageRole.USER,
            content=request.content,
            timestamp=datetime.now(),
            emotion=request.emotion,
        )
        self.messages.append(user_message)

        # Generate AI response based on mode
        if mode == ASDNTMode.ASD:
            response_text = await self._generate_asd_response(request.content)
            internal_emotion = await self.emotion_service.analyze_emotion(request.content)
            expressed_emotion = internal_emotion  # Same in ASD mode
        else:  # NT mode
            response_text = await self._generate_nt_response(request.content)
            internal_emotion = await self.emotion_service.analyze_emotion(request.content)
            expressed_emotion = await self._adjust_expressed_emotion(internal_emotion)

        # Store AI response
        ai_message = ChatMessage(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=response_text,
            timestamp=datetime.now(),
            emotion=expressed_emotion,
            internal_emotion=internal_emotion,
        )
        self.messages.append(ai_message)

        return ChatMessageResponse(
            message=response_text,
            emotion=expressed_emotion,
            internal_emotion=internal_emotion,
        )

    async def get_history(self) -> List[ChatMessage]:
        """Get chat message history."""
        return self.messages.copy()

    async def clear_history(self) -> bool:
        """Clear chat message history."""
        self.messages.clear()
        return True

    async def _generate_asd_response(self, content: str) -> str:
        """Generate ASD-style response (direct, literal)."""
        # Simple rule-based response for now
        # TODO: Replace with actual AI model integration
        responses = {
            "hello": "Hello. How can I help you?",
            "how are you": "I am functioning normally. Thank you for asking.",
            "what do you mean": "I mean exactly what I said. Could you be more specific about what part you don't understand?",
            "thanks": "You're welcome.",
        }
        
        content_lower = content.lower()
        for key, response in responses.items():
            if key in content_lower:
                return response
        
        return "I understand you said: '" + content + "'. Could you please clarify what you would like me to do?"

    async def _generate_nt_response(self, content: str) -> str:
        """Generate NT-style response (social cues, indirect)."""
        # Simple rule-based response for now
        # TODO: Replace with actual AI model integration
        responses = {
            "hello": "Hi there! Great to see you! How's your day going?",
            "how are you": "I'm doing wonderful, thanks for asking! How about you?",
            "what do you mean": "Oh, I can see how that might be confusing! Let me explain it differently...",
            "thanks": "Aww, you're so sweet! Happy to help anytime!",
        }
        
        content_lower = content.lower()
        for key, response in responses.items():
            if key in content_lower:
                return response
        
        return "That's really interesting! I'd love to hear more about what you're thinking."

    async def _adjust_expressed_emotion(self, internal_emotion: Emotion) -> Emotion:
        """Adjust expressed emotion for NT mode (social masking)."""
        # In NT mode, might express different emotion than internal
        if internal_emotion == Emotion.SADNESS:
            return Emotion.NEUTRAL  # Might hide sadness
        elif internal_emotion == Emotion.ANGER:
            return Emotion.NEUTRAL  # Might suppress anger
        elif internal_emotion == Emotion.FEAR:
            return Emotion.NEUTRAL  # Might mask fear
        else:
            return internal_emotion  # Express positive emotions normally


# Global instance
chat_service = ChatService()