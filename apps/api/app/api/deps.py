"""
Sandboxed - Dependency Provider
Provides singletons for ExecutionManager and ExecutionService across FastAPI routes.
"""

import json
from typing import Optional
from apps.api.app.core.config import settings
from apps.api.app.models.db import SessionLocal
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.repositories.audit_repository import AuditRepository
from apps.api.app.services.execution_service import ExecutionService
from sandbox_engine.manager.execution_manager import ExecutionManager, ExecutionJob
from sandbox_engine.linux.runner import LinuxSandboxRunner

_runner = LinuxSandboxRunner(
    bwrap_path=settings.BWRAP_PATH,
    cgroup_root=settings.CGROUP_ROOT,
    slice_name=settings.CGROUP_SLICE,
    base_storage_dir=settings.STORAGE_DIR,
)


async def _handle_job_update(job: ExecutionJob) -> None:
    """Callback invoked when execution job state transitions."""
    db = SessionLocal()
    try:
        repo = ExecutionRepository(db)
        audit_repo = AuditRepository(db)
        repo.update_from_job(job)
        audit_repo.log_event(
            event_type=f"JOB_{job.state.value}",
            execution_id=job.id,
            details={"exit_code": job.exit_code, "termination_reason": str(job.termination_reason)},
        )
    finally:
        db.close()


_manager = ExecutionManager(
    runner=_runner,
    max_concurrency=settings.MAX_CONCURRENCY,
    max_queue_size=settings.JOB_QUEUE_CAPACITY,
    on_job_update=_handle_job_update,
)

_execution_service = ExecutionService(_manager)


def get_execution_manager() -> ExecutionManager:
    return _manager


def get_execution_service() -> ExecutionService:
    return _execution_service
