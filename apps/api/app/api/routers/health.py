"""
Sandboxed - Health Router
"""

from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check():
    return {
        "status": "healthy",
        "service": "Sandboxed API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
