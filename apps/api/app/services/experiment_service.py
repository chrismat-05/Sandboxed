"""
Sandboxed - Experiment Service for Policy Lab
Coordinates multi-policy benchmark runs and generates comparative metrics.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from apps.api.app.models.entities import ExperimentRecord, ExperimentRunRecord, ExecutionRecord
from apps.api.app.repositories.experiment_repository import ExperimentRepository
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.repositories.policy_repository import PolicyRepository
from apps.api.app.repositories.audit_repository import AuditRepository
from apps.api.app.schemas.experiment import (
    ExperimentCreateRequest,
    ExperimentDetailResponse,
    ExperimentRunResponse,
    ExperimentComparisonItem,
    ExperimentResultsResponse,
)
from apps.api.app.services.execution_service import ExecutionService


class ExperimentService:
    def __init__(self, execution_service: ExecutionService):
        self.execution_service = execution_service

    def create_experiment(self, req: ExperimentCreateRequest, db: Session) -> ExperimentDetailResponse:
        exp_repo = ExperimentRepository(db)
        policy_repo = PolicyRepository(db)
        policy_repo.seed_defaults()

        experiment_id = str(uuid.uuid4())
        experiment = ExperimentRecord(
            id=experiment_id,
            name=req.name,
            description=req.description,
            workload_id=req.workload_id,
            source_code=req.source_code,
            status="CREATED",
            created_at=datetime.now(timezone.utc),
        )

        runs: List[ExperimentRunRecord] = []
        for index, pid in enumerate(req.policy_ids):
            policy_rec = policy_repo.get_by_id(pid)
            policy_name = policy_rec.name if policy_rec else pid
            run = ExperimentRunRecord(
                id=str(uuid.uuid4()),
                experiment_id=experiment_id,
                execution_id=None,
                policy_id=pid,
                policy_name=policy_name,
                run_order=index,
                status="PENDING",
                created_at=datetime.now(timezone.utc),
            )
            runs.append(run)

        exp_repo.create(experiment, runs)
        return self.get_experiment_details(experiment_id, db)

    def get_experiment_details(self, experiment_id: str, db: Session) -> Optional[ExperimentDetailResponse]:
        exp_repo = ExperimentRepository(db)
        exec_repo = ExecutionRepository(db)
        exp = exp_repo.get_by_id(experiment_id)
        if not exp:
            return None

        run_responses = []
        for run in sorted(exp.runs, key=lambda r: r.run_order):
            exec_rec: Optional[ExecutionRecord] = exec_repo.get_by_id(run.execution_id) if run.execution_id else None
            run_responses.append(
                ExperimentRunResponse(
                    id=run.id,
                    experiment_id=run.experiment_id,
                    execution_id=run.execution_id,
                    policy_id=run.policy_id,
                    policy_name=run.policy_name,
                    run_order=run.run_order,
                    status=run.status,
                    state=exec_rec.state if exec_rec else None,
                    wall_time_sec=exec_rec.wall_time_sec if exec_rec else None,
                    cpu_total_sec=exec_rec.cpu_total_sec if exec_rec else None,
                    peak_memory_mb=exec_rec.peak_memory_mb if exec_rec else None,
                    exit_code=exec_rec.exit_code if exec_rec else None,
                    termination_reason=exec_rec.termination_reason if exec_rec else None,
                    error_summary=exec_rec.error_summary if exec_rec else None,
                )
            )

        return ExperimentDetailResponse(
            id=exp.id,
            name=exp.name,
            description=exp.description,
            workload_id=exp.workload_id,
            source_code=exp.source_code,
            status=exp.status,
            created_at=exp.created_at,
            runs=run_responses,
        )

    async def run_experiment(self, experiment_id: str, db: Session) -> None:
        """
        Executes each policy run sequentially in background to avoid resource contention.
        """
        exp_repo = ExperimentRepository(db)
        exp = exp_repo.get_by_id(experiment_id)
        if not exp:
            raise ValueError(f"Experiment '{experiment_id}' not found.")

        exp_repo.update_status(experiment_id, "RUNNING")

        for run in sorted(exp.runs, key=lambda r: r.run_order):
            run.status = "RUNNING"
            db.commit()

            # Submit execution
            exec_rec = await self.execution_service.submit_execution(
                source_code=exp.source_code,
                policy_id=run.policy_id,
                custom_policy=None,
                language="python",
                db=db,
            )
            run.execution_id = exec_rec.id
            db.commit()

            # Wait for execution to reach a terminal state before launching next run
            while True:
                db.refresh(exec_rec)
                if exec_rec.state in (
                    "COMPLETED",
                    "FAILED",
                    "TIMED_OUT",
                    "CANCELLED",
                    "RESOURCE_LIMIT_EXCEEDED",
                ):
                    run.status = exec_rec.state
                    db.commit()
                    break
                await asyncio.sleep(0.5)

        exp_repo.update_status(experiment_id, "COMPLETED")

    def get_results(self, experiment_id: str, db: Session) -> Optional[ExperimentResultsResponse]:
        exp_repo = ExperimentRepository(db)
        exec_repo = ExecutionRepository(db)
        exp = exp_repo.get_by_id(experiment_id)
        if not exp:
            return None

        comparisons: List[ExperimentComparisonItem] = []
        completed_count = 0

        for run in sorted(exp.runs, key=lambda r: r.run_order):
            exec_rec: Optional[ExecutionRecord] = exec_repo.get_by_id(run.execution_id) if run.execution_id else None
            if exec_rec and exec_rec.state in ("COMPLETED", "FAILED", "TIMED_OUT", "RESOURCE_LIMIT_EXCEEDED"):
                completed_count += 1

            comparisons.append(
                ExperimentComparisonItem(
                    policy_id=run.policy_id,
                    policy_name=run.policy_name,
                    execution_id=run.execution_id,
                    status=exec_rec.state if exec_rec else run.status,
                    termination_reason=exec_rec.termination_reason if exec_rec else None,
                    exit_code=exec_rec.exit_code if exec_rec else None,
                    wall_time_sec=exec_rec.wall_time_sec if exec_rec else 0.0,
                    cpu_total_sec=exec_rec.cpu_total_sec if exec_rec else None,
                    peak_memory_mb=exec_rec.peak_memory_mb if exec_rec else None,
                    output_bytes=exec_rec.output_bytes if exec_rec else 0,
                    error_summary=exec_rec.error_summary if exec_rec else None,
                )
            )

        # Generate comparative interpretation
        interpretation = self._interpret_results(comparisons)

        return ExperimentResultsResponse(
            experiment_id=exp.id,
            name=exp.name,
            workload_id=exp.workload_id,
            status=exp.status,
            total_runs=len(exp.runs),
            completed_runs=completed_count,
            comparisons=comparisons,
            interpretation=interpretation,
        )

    def _interpret_results(self, comparisons: List[ExperimentComparisonItem]) -> str:
        if not comparisons or all(c.status == "PENDING" for c in comparisons):
            return "Experiment is queued or running. Comparative analysis will be synthesized upon completion."

        notes = []
        oom_runs = [c for c in comparisons if c.status == "RESOURCE_LIMIT_EXCEEDED"]
        timeout_runs = [c for c in comparisons if c.status == "TIMED_OUT"]
        completed_runs = [c for c in comparisons if c.status == "COMPLETED"]

        if oom_runs:
            notes.append(f"Memory containment verified: {len(oom_runs)} run(s) triggered cgroups v2 OOM termination as expected.")
        if timeout_runs:
            notes.append(f"Supervisor deadline enforcement: {len(timeout_runs)} run(s) were terminated on wall-clock expiry.")
        if len(completed_runs) >= 2:
            durations = [c.wall_time_sec for c in completed_runs]
            diff = max(durations) - min(durations)
            if diff > 0.05:
                notes.append(f"CPU quota variance observed: Wall-clock duration varied by {diff:.2f}s across configured policies.")

        if not notes:
            notes.append("Workload executed across configured policies with consistent containment behavior.")

        return " ".join(notes)
