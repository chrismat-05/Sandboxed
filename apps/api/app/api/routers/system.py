"""
Sandboxed - System Capabilities & Workloads Router
"""

from typing import List
from fastapi import APIRouter
from sandbox_engine.linux.capabilities import detect_capabilities, EngineCapabilityReport
from sandbox_engine.policies.models import BuiltinWorkload, BUILTIN_WORKLOADS
from apps.api.app.core.config import settings

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/capabilities", response_model=EngineCapabilityReport)
def get_system_capabilities():
    """
    Returns actual host environment isolation capabilities.
    Honestly reveals whether cgroups v2, bubblewrap, and namespaces are active.
    """
    return detect_capabilities(settings.CGROUP_ROOT)


@router.get("/workloads", response_model=List[BuiltinWorkload])
def get_builtin_workloads():
    """
    Returns built-in safe test workloads designed for Operating Systems demonstrations.
    """
    return BUILTIN_WORKLOADS
