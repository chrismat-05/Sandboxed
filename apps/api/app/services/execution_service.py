"""
Sandboxed - Execution Service
Coordinates submission, database persistence, job lifecycle, and cancellation.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from apps.api.app.models.entities import ExecutionRecord
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.repositories.policy_repository import PolicyRepository
from apps.api.app.repositories.audit_repository import AuditRepository
from sandbox_engine.manager.execution_manager import ExecutionManager, ExecutionJob, ExecutionState
from sandbox_engine.policies.models import ExecutionPolicy, DEFAULT_POLICIES


class ExecutionService:
    def __init__(self, execution_manager: ExecutionManager):
        self.manager = execution_manager

    async def submit_execution(
        self,
        source_code: str,
        policy_id: Optional[str],
        custom_policy: Optional[ExecutionPolicy],
        language: str,
        db: Session,
    ) -> ExecutionRecord:
        policy_repo = PolicyRepository(db)
        exec_repo = ExecutionRepository(db)
        audit_repo = AuditRepository(db)

        # 1. Resolve Policy
        resolved_policy: ExecutionPolicy
        if custom_policy:
            resolved_policy = custom_policy
        elif policy_id:
            policy_rec = policy_repo.get_by_id(policy_id)
            if policy_rec:
                resolved_policy = ExecutionPolicy.model_validate_json(policy_rec.config_json)
            elif policy_id in DEFAULT_POLICIES:
                resolved_policy = DEFAULT_POLICIES[policy_id]
            else:
                raise ValueError(f"Execution policy '{policy_id}' not found.")
        else:
            resolved_policy = DEFAULT_POLICIES["standard"]

        # 2. Compute SHA256 of code
        source_hash = hashlib.sha256(source_code.encode("utf-8")).hexdigest()
        execution_id = str(uuid.uuid4())

        # 3. Create persistent record
        record = ExecutionRecord(
            id=execution_id,
            source_hash=source_hash,
            language=language,
            policy_id=resolved_policy.id,
            policy_snapshot=resolved_policy.model_dump_json(),
            state=ExecutionState.QUEUED.value,
            submitted_at=datetime.now(timezone.utc),
        )
        exec_repo.create(record)

        # 4. Audit Log
        audit_repo.log_event(
            event_type="EXECUTION_SUBMITTED",
            execution_id=execution_id,
            details={
                "policy_id": resolved_policy.id,
                "wall_limit": resolved_policy.wall_time_limit_sec,
                "mem_limit": resolved_policy.memory_limit_mb,
                "cpu_quota": resolved_policy.cpu_quota_pct,
            },
        )

        # 5. Enqueue in Execution Manager
        await self.manager.submit_job(code=source_code, policy=resolved_policy, job_id=execution_id)

        return record

    def cancel_execution(self, execution_id: str, db: Session) -> bool:
        exec_repo = ExecutionRepository(db)
        audit_repo = AuditRepository(db)

        record = exec_repo.get_by_id(execution_id)
        if not record:
            return False

        cancelled = self.manager.cancel_job(execution_id)
        if cancelled:
            audit_repo.log_event(
                event_type="EXECUTION_CANCEL_REQUESTED",
                execution_id=execution_id,
            )
        return cancelled
