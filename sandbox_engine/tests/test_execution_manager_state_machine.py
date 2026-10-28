"""
Tests for Execution Manager State Transitions, Queueing, and Concurrency
"""

import asyncio
import pytest
from sandbox_engine.policies.models import DEFAULT_POLICIES
from sandbox_engine.manager.execution_manager import ExecutionManager, ExecutionState
from sandbox_engine.linux.runner import LinuxSandboxRunner
from sandbox_engine.linux.supervisor import SupervisedExecutionResult, TerminationReason
from sandbox_engine.monitoring.collector import ExecutionMetrics


class DummySandboxRunner(LinuxSandboxRunner):
    """Stub runner for verifying execution manager lifecycle logic without Linux syscalls."""
    def __init__(self, delay_sec=0.05, should_fail=False):
        self.delay_sec = delay_sec
        self.should_fail = should_fail

    def run_program(self, execution_id, code, policy, cancel_check=None, force_bypass_check=False):
        import time
        start = time.monotonic()
        while time.monotonic() - start < self.delay_sec:
            if cancel_check and cancel_check():
                return SupervisedExecutionResult(
                    exit_code=None,
                    termination_reason=TerminationReason.CANCELLED,
                    stdout="",
                    stderr="Cancelled",
                    metrics=ExecutionMetrics(wall_time_sec=0.01),
                )
            time.sleep(0.01)

        if self.should_fail:
            return SupervisedExecutionResult(
                exit_code=1,
                termination_reason=TerminationReason.FAILED,
                stdout="",
                stderr="Program failed",
                metrics=ExecutionMetrics(wall_time_sec=self.delay_sec),
            )

        return SupervisedExecutionResult(
            exit_code=0,
            termination_reason=TerminationReason.COMPLETED,
            stdout="Dummy output",
            stderr="",
            metrics=ExecutionMetrics(wall_time_sec=self.delay_sec),
        )


@pytest.mark.asyncio
async def test_execution_manager_lifecycle_success():
    """Verify job transitions from QUEUED -> PREPARING -> RUNNING -> COMPLETED."""
    runner = DummySandboxRunner(delay_sec=0.02)
    manager = ExecutionManager(runner=runner, max_concurrency=1)
    await manager.start()

    try:
        job = await manager.submit_job("print(1)", DEFAULT_POLICIES["standard"])
        assert job.state == ExecutionState.QUEUED

        # Wait for worker to finish
        for _ in range(50):
            if job.state == ExecutionState.COMPLETED:
                break
            await asyncio.sleep(0.02)

        assert job.state == ExecutionState.COMPLETED
        assert job.exit_code == 0
        assert job.stdout == "Dummy output"
    finally:
        await manager.stop()


@pytest.mark.asyncio
async def test_execution_manager_queue_cancellation():
    """Verify cancelling a job before worker picks it up marks it CANCELLED immediately."""
    runner = DummySandboxRunner(delay_sec=0.2)
    # Start with concurrency=1, submit first job to keep worker busy
    manager = ExecutionManager(runner=runner, max_concurrency=1)
    await manager.start()

    try:
        job1 = await manager.submit_job("sleep", DEFAULT_POLICIES["standard"])
        job2 = await manager.submit_job("queued_job", DEFAULT_POLICIES["standard"])

        # Cancel job2 while still queued
        cancelled = manager.cancel_job(job2.id)
        assert cancelled is True
        assert job2.state == ExecutionState.CANCELLED

    finally:
        await manager.stop()


@pytest.mark.asyncio
async def test_execution_manager_running_cancellation():
    """Verify cancelling a running job halts execution."""
    runner = DummySandboxRunner(delay_sec=0.5)
    manager = ExecutionManager(runner=runner, max_concurrency=1)
    await manager.start()

    try:
        job = await manager.submit_job("long_code", DEFAULT_POLICIES["standard"])
        await asyncio.sleep(0.05)  # Let worker start it
        manager.cancel_job(job.id)

        for _ in range(50):
            if job.state == ExecutionState.CANCELLED:
                break
            await asyncio.sleep(0.02)

        assert job.state == ExecutionState.CANCELLED
    finally:
        await manager.stop()


@pytest.mark.asyncio
async def test_execution_manager_queue_capacity_limit():
    """Verify submitting when queue is at max capacity raises RuntimeError."""
    runner = DummySandboxRunner(delay_sec=1.0)
    manager = ExecutionManager(runner=runner, max_concurrency=1, max_queue_size=2)
    # Don't start workers so jobs stay in queue
    job1 = await manager.submit_job("1", DEFAULT_POLICIES["standard"])
    job2 = await manager.submit_job("2", DEFAULT_POLICIES["standard"])

    with pytest.raises(RuntimeError):
        await manager.submit_job("3", DEFAULT_POLICIES["standard"])


@pytest.mark.asyncio
async def test_execution_manager_failure_outcome():
    """Verify failed execution maps to ExecutionState.FAILED."""
    runner = DummySandboxRunner(delay_sec=0.01, should_fail=True)
    manager = ExecutionManager(runner=runner, max_concurrency=1)
    await manager.start()

    try:
        job = await manager.submit_job("fail_code", DEFAULT_POLICIES["standard"])
        for _ in range(50):
            if job.state == ExecutionState.FAILED:
                break
            await asyncio.sleep(0.02)

        assert job.state == ExecutionState.FAILED
        assert job.exit_code == 1
    finally:
        await manager.stop()
