# health check router.. please just work for the demo tomorrow
# 4:30 AM: ok bye the byee
# this works almost always
# do not touch anything..

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
