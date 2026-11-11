# system capabilities router.. please just work for the demo tomorrow
# could be viva qn
# tolearn: why does netsh output change format on windows fml
# this works almost always
# do not touch anything..

from typing import List
from fastapi import APIRouter
from sandbox_engine.linux.capabilities import detect_capabilities, EngineCapabilityReport
from sandbox_engine.policies.models import BuiltinWorkload, BUILTIN_WORKLOADS
from apps.api.app.core.config import settings

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/capabilities", response_model=EngineCapabilityReport)
def get_system_capabilities():
    # honest capabilities check
    return detect_capabilities(settings.CGROUP_ROOT)


@router.get("/workloads", response_model=List[BuiltinWorkload])
def get_builtin_workloads():
    # test workloads for demo
    return BUILTIN_WORKLOADS
