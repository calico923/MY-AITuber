"""Status endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def get_status() -> dict[str, str]:
    """Get API status."""
    return {
        "version": "0.1.0",
        "status": "running",
        "service": "asd-aituber-api"
    }