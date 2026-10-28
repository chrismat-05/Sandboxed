"""
Sandboxed - Execution Repository
Handles execution metadata queries and updates using SQLAlchemy.
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from apps.api.app.models.entities import ExecutionRecord


class ExecutionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, record: ExecutionRecord) -> ExecutionRecord:
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_by_id(self, execution_id: str) -> Optional[ExecutionRecord]:
        return self.db.query(ExecutionRecord).filter(ExecutionRecord.id == execution_id).first()

    def list_executions(
        self,
        skip: int = 0,
        limit: int = 50,
        state: Optional[str] = None,
    ) -> Tuple[List[ExecutionRecord], int]:
        query = self.db.query(ExecutionRecord)
        if state:
            query = query.filter(ExecutionRecord.state == state)
        total = query.count()
        items = query.order_by(desc(ExecutionRecord.submitted_at)).offset(skip).limit(limit).all()
        return items, total

    def update_from_job(self, job) -> Optional[ExecutionRecord]:
        record = self.get_by_id(job.id)
        if not record:
            return None

        record.state = job.state.value if hasattr(job.state, "value") else str(job.state)
        record.exit_code = job.exit_code
        record.termination_reason = (
            job.termination_reason.value if hasattr(job.termination_reason, "value") and job.termination_reason else (str(job.termination_reason) if job.termination_reason else None)
        )
        record.stdout = job.stdout
        record.stderr = job.stderr
        record.error_summary = job.error_summary
        record.started_at = job.started_at
        record.finished_at = job.finished_at

        if job.metrics:
            record.wall_time_sec = job.metrics.wall_time_sec
            record.cpu_total_sec = job.metrics.cpu_usage_total_sec
            record.cpu_user_sec = job.metrics.cpu_time_user_sec
            record.cpu_system_sec = job.metrics.cpu_time_system_sec
            record.peak_memory_mb = job.metrics.peak_memory_mb
            record.oom_killed = job.metrics.oom_killed
            record.output_bytes = job.metrics.output_bytes

        self.db.commit()
        self.db.refresh(record)
        return record

    def get_summary_counts(self) -> Dict[str, int]:
        results = self.db.query(
            ExecutionRecord.state, func.count(ExecutionRecord.id)
        ).group_by(ExecutionRecord.state).all()
        counts = {state: count for state, count in results}
        total = sum(counts.values())
        return {
            "total": total,
            "COMPLETED": counts.get("COMPLETED", 0),
            "FAILED": counts.get("FAILED", 0),
            "TIMED_OUT": counts.get("TIMED_OUT", 0),
            "CANCELLED": counts.get("CANCELLED", 0),
            "RESOURCE_LIMIT_EXCEEDED": counts.get("RESOURCE_LIMIT_EXCEEDED", 0),
            "QUEUED": counts.get("QUEUED", 0),
            "RUNNING": counts.get("RUNNING", 0),
        }
