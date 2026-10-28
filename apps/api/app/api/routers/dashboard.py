"""
Sandboxed - Dashboard Summary Router
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from apps.api.app.models.db import get_db
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.schemas.system import DashboardSummaryResponse
from apps.api.app.schemas.execution import ExecutionSummaryResponse
from sandbox_engine.linux.capabilities import detect_capabilities
from apps.api.app.core.config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    exec_repo = ExecutionRepository(db)
    counts = exec_repo.get_summary_counts()
    recent_records, _ = exec_repo.list_executions(skip=0, limit=10)

    recent_summaries = [
        ExecutionSummaryResponse(
            id=r.id,
            language=r.language,
            policy_id=r.policy_id,
            state=r.state,
            exit_code=r.exit_code,
            termination_reason=r.termination_reason,
            wall_time_sec=r.wall_time_sec,
            peak_memory_mb=r.peak_memory_mb,
            submitted_at=r.submitted_at,
            finished_at=r.finished_at,
        )
        for r in recent_records
    ]

    report = detect_capabilities(settings.CGROUP_ROOT)

    return DashboardSummaryResponse(
        total_executions=counts["total"],
        completed_count=counts["COMPLETED"],
        failed_count=counts["FAILED"],
        timed_out_count=counts["TIMED_OUT"],
        cancelled_count=counts["CANCELLED"],
        resource_limit_exceeded_count=counts["RESOURCE_LIMIT_EXCEEDED"],
        queue_depth=counts["QUEUED"],
        active_executions=counts["RUNNING"],
        engine_ready=report.ready,
        recent_executions=recent_summaries,
    )
