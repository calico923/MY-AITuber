"""Emotion analysis service."""

import random
from typing import Dict

from app.models.chat import Emotion


class EmotionService:
    """Service for emotion analysis and processing."""

    async def analyze_emotion(self, text: str) -> Emotion:
        """Analyze emotion from text."""
        # Simple rule-based emotion analysis for now
        # TODO: Replace with actual NLP model (e.g., transformers)
        
        text_lower = text.lower()
        
        # Joy indicators
        if any(word in text_lower for word in ["happy", "joy", "great", "wonderful", "amazing", "love", "excited"]):
            return Emotion.JOY
        
        # Sadness indicators
        if any(word in text_lower for word in ["sad", "sorry", "bad", "terrible", "awful", "cry", "hurt"]):
            return Emotion.SADNESS
        
        # Anger indicators
        if any(word in text_lower for word in ["angry", "mad", "furious", "hate", "stupid", "annoying"]):
            return Emotion.ANGER
        
        # Fear indicators
        if any(word in text_lower for word in ["scared", "afraid", "worried", "anxious", "nervous", "fear"]):
            return Emotion.FEAR
        
        # Surprise indicators
        if any(word in text_lower for word in ["wow", "amazing", "surprised", "unbelievable", "shocked"]):
            return Emotion.SURPRISE
        
        # Disgust indicators
        if any(word in text_lower for word in ["disgusting", "gross", "yuck", "terrible", "awful"]):
            return Emotion.DISGUST
        
        # Default to neutral
        return Emotion.NEUTRAL

    async def analyze_emotion_with_confidence(self, text: str) -> tuple[Emotion, float, Dict[str, float]]:
        """Analyze emotion with confidence scores."""
        # Mock implementation - returns emotion with confidence and scores
        emotion = await self.analyze_emotion(text)
        
        # Generate mock confidence scores
        all_emotions = [e.value for e in Emotion]
        scores = {e: random.uniform(0.1, 0.3) for e in all_emotions}
        
        # Set higher score for detected emotion
        confidence = random.uniform(0.7, 0.95)
        scores[emotion.value] = confidence
        
        # Normalize scores
        total = sum(scores.values())
        scores = {k: v / total for k, v in scores.items()}
        
        return emotion, confidence, scores