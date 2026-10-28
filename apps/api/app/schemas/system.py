"""
Sandboxed - System & Dashboard Schemas
"""

from typing import List
from pydantic import BaseModel
from sandbox_engine.linux.capabilities import EngineCapabilityReport
from apps.api.app.schemas.execution import ExecutionSummaryResponse


class DashboardSummaryResponse(BaseModel):
    total_executions: int
    completed_count: int
    failed_count: int
    timed_out_count: int
    cancelled_count: int
    resource_limit_exceeded_count: int
    queue_depth: int
    active_executions: int
    engine_ready: bool
    recent_executions: List[ExecutionSummaryResponse]
