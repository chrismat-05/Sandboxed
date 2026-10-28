"""
Sandboxed - Execution Manager & Lifecycle State Machine
Maintains the asynchronous job queue, manages worker concurrency, tracks execution state transitions,
enforces timeouts, coordinates cancellation, and dispatches to the Linux Sandbox Runner.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Coroutine, Dict, Optional, Set
from pydantic import BaseModel, Field

from sandbox_engine.policies.models import ExecutionPolicy
from sandbox_engine.monitoring.collector import ExecutionMetrics
from sandbox_engine.linux.runner import LinuxSandboxRunner, SandboxCapabilityError
from sandbox_engine.linux.supervisor import SupervisedExecutionResult, TerminationReason

logger = logging.getLogger("sandboxed.execution_manager")


class ExecutionState(str, Enum):
    QUEUED = "QUEUED"
    PREPARING = "PREPARING"
    RUNNING = "RUNNING"
    CANCELLING = "CANCELLING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    CANCELLED = "CANCELLED"
    RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED"


class ExecutionJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_code: str
    language: str = "python"
    policy: ExecutionPolicy
    state: ExecutionState = ExecutionState.QUEUED
    exit_code: Optional[int] = None
    termination_reason: Optional[TerminationReason] = None
    stdout: str = ""
    stderr: str = ""
    error_summary: Optional[str] = None
    metrics: Optional[ExecutionMetrics] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class ExecutionManager:
    """
    Coordinates asynchronous sandbox job execution with bounded concurrency (default 1)
    and a strictly validated lifecycle state machine.
    """

    def __init__(
        self,
        runner: Optional[LinuxSandboxRunner] = None,
        max_concurrency: int = 1,
        max_queue_size: int = 50,
        on_job_update: Optional[Callable[[ExecutionJob], Coroutine]] = None,
    ):
        self.runner = runner or LinuxSandboxRunner()
        self.max_concurrency = max_concurrency
        self.max_queue_size = max_queue_size
        self.on_job_update = on_job_update

        self.queue: asyncio.Queue[ExecutionJob] = asyncio.Queue(maxsize=max_queue_size)
        self.jobs: Dict[str, ExecutionJob] = {}
        self.cancelled_job_ids: Set[str] = set()
        self.active_workers: list[asyncio.Task] = []
        self._running = False

    async def start(self) -> None:
        """Starts worker pool loop."""
        if self._running:
            return
        self._running = True
        for i in range(self.max_concurrency):
            task = asyncio.create_task(self._worker_loop(i))
            self.active_workers.append(task)
        logger.info(f"Execution manager started with {self.max_concurrency} worker(s).")

    async def stop(self) -> None:
        """Gracefully halts worker pool."""
        self._running = False
        for task in self.active_workers:
            task.cancel()
        self.active_workers.clear()
        logger.info("Execution manager stopped.")

    async def submit_job(self, code: str, policy: ExecutionPolicy, job_id: Optional[str] = None) -> ExecutionJob:
        """
        Validates and submits a new program to the execution queue.
        """
        if self.queue.full():
            raise RuntimeError(f"Sandbox queue is full (capacity: {self.max_queue_size}). Try again later.")

        job = ExecutionJob(
            id=job_id or str(uuid.uuid4()),
            source_code=code,
            policy=policy,
            state=ExecutionState.QUEUED,
        )
        self.jobs[job.id] = job
        await self.queue.put(job)
        await self._notify_update(job)
        return job

    def get_job(self, job_id: str) -> Optional[ExecutionJob]:
        return self.jobs.get(job_id)

    def cancel_job(self, job_id: str) -> bool:
        """
        Requests cancellation for a job in QUEUED, PREPARING, or RUNNING states.
        """
        job = self.jobs.get(job_id)
        if not job:
            return False

        if job.state in (
            ExecutionState.COMPLETED,
            ExecutionState.FAILED,
            ExecutionState.TIMED_OUT,
            ExecutionState.CANCELLED,
            ExecutionState.RESOURCE_LIMIT_EXCEEDED,
        ):
            return False

        self.cancelled_job_ids.add(job_id)
        if job.state == ExecutionState.QUEUED:
            job.state = ExecutionState.CANCELLED
            job.termination_reason = TerminationReason.CANCELLED
            job.finished_at = datetime.now(timezone.utc)
            job.error_summary = "Execution cancelled while queued."
            asyncio.create_task(self._notify_update(job))
        else:
            job.state = ExecutionState.CANCELLING

        return True

    def get_stats(self) -> dict:
        return {
            "queue_depth": self.queue.qsize(),
            "active_workers": self.max_concurrency,
            "total_tracked_jobs": len(self.jobs),
            "running_count": sum(1 for j in self.jobs.values() if j.state == ExecutionState.RUNNING),
        }

    async def _notify_update(self, job: ExecutionJob) -> None:
        if self.on_job_update:
            try:
                await self.on_job_update(job)
            except Exception as e:
                logger.error(f"Error notifying job update for {job.id}: {e}")

    async def _worker_loop(self, worker_id: int) -> None:
        """Worker loop processing jobs sequentially."""
        logger.debug(f"Worker {worker_id} started.")
        while self._running:
            try:
                job = await self.queue.get()
            except asyncio.CancelledError:
                break

            # If cancelled while waiting in queue
            if job.id in self.cancelled_job_ids:
                job.state = ExecutionState.CANCELLED
                job.termination_reason = TerminationReason.CANCELLED
                job.finished_at = datetime.now(timezone.utc)
                job.error_summary = "Execution cancelled before execution."
                self.queue.task_done()
                await self._notify_update(job)
                continue

            # PREPARING stage
            job.state = ExecutionState.PREPARING
            job.started_at = datetime.now(timezone.utc)
            await self._notify_update(job)

            # RUNNING stage
            job.state = ExecutionState.RUNNING
            await self._notify_update(job)

            def cancel_check() -> bool:
                return job.id in self.cancelled_job_ids

            try:
                # Run blocking supervisor in thread pool to prevent blocking async event loop
                result: SupervisedExecutionResult = await asyncio.to_thread(
                    self.runner.run_program,
                    execution_id=job.id,
                    code=job.source_code,
                    policy=job.policy,
                    cancel_check=cancel_check,
                )

                job.exit_code = result.exit_code
                job.stdout = result.stdout
                job.stderr = result.stderr
                job.metrics = result.metrics
                job.termination_reason = result.termination_reason

                # Map supervisor termination reason to execution state
                if result.termination_reason == TerminationReason.COMPLETED:
                    job.state = ExecutionState.COMPLETED
                elif result.termination_reason == TerminationReason.TIMED_OUT:
                    job.state = ExecutionState.TIMED_OUT
                    job.error_summary = f"Execution exceeded maximum wall-clock deadline ({job.policy.wall_time_limit_sec}s)."
                elif result.termination_reason == TerminationReason.CANCELLED:
                    job.state = ExecutionState.CANCELLED
                    job.error_summary = "Execution cancelled by user."
                elif result.termination_reason == TerminationReason.RESOURCE_LIMIT_EXCEEDED:
                    job.state = ExecutionState.RESOURCE_LIMIT_EXCEEDED
                    job.error_summary = "Resource limit exceeded (process terminated by kernel/cgroups v2)."
                else:
                    job.state = ExecutionState.FAILED
                    job.error_summary = f"Program failed with exit code {result.exit_code}."

            except SandboxCapabilityError as cap_err:
                job.state = ExecutionState.FAILED
                job.termination_reason = TerminationReason.PREPARATION_ERROR
                job.stderr = str(cap_err)
                job.error_summary = str(cap_err)
                logger.warning(f"Job {job.id} failed readiness verification: {cap_err}")

            except Exception as ex:
                job.state = ExecutionState.FAILED
                job.termination_reason = TerminationReason.FAILED
                job.stderr = f"Internal execution manager failure: {str(ex)}"
                job.error_summary = str(ex)
                logger.exception(f"Unhandled exception during job {job.id} execution")

            finally:
                job.finished_at = datetime.now(timezone.utc)
                self.queue.task_done()
                await self._notify_update(job)
