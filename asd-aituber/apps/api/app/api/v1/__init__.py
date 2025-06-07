"""API v1 routes."""

from fastapi import APIRouter

from app.api.v1.endpoints import chat, status

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])