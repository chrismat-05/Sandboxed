"""
Tests for Sandboxed Policy Validation & Security Bounds
"""

import pytest
from pydantic import ValidationError
from sandbox_engine.policies.models import (
    ExecutionPolicy,
    FilesystemPolicy,
    SyscallPolicy,
    DEFAULT_POLICIES,
    BUILTIN_WORKLOADS,
)


def test_default_policies_integrity():
    """Verify built-in policies exist with expected security baselines."""
    assert "standard" in DEFAULT_POLICIES
    assert "strict" in DEFAULT_POLICIES
    assert "cpu_constrained" in DEFAULT_POLICIES
    assert "memory_constrained" in DEFAULT_POLICIES

    standard = DEFAULT_POLICIES["standard"]
    assert standard.network_enabled is False
    assert standard.wall_time_limit_sec == 5.0
    assert standard.memory_limit_mb == 128
    assert standard.cpu_quota_pct == 50
    assert standard.max_processes == 32


def test_valid_custom_policy_creation():
    """Verify creating a custom valid policy succeeds."""
    policy = ExecutionPolicy(
        id="custom_test",
        name="Custom Test Policy",
        description="Testing policy constraints",
        wall_time_limit_sec=10.0,
        memory_limit_mb=256,
        cpu_quota_pct=80,
        max_processes=16,
        max_output_bytes=32768,
        temp_storage_mb=32,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.ISOLATED_RO_ROOT,
        syscall_policy=SyscallPolicy.STRICT,
    )
    assert policy.id == "custom_test"
    assert policy.memory_limit_mb == 256
    assert policy.cpu_quota_pct == 80


def test_invalid_wall_time_limits_rejected():
    """Verify wall time limits below 0.1s or above 60.0s are rejected."""
    with pytest.raises(ValidationError):
        ExecutionPolicy(id="low_time", name="Low Time", wall_time_limit_sec=0.05)

    with pytest.raises(ValidationError):
        ExecutionPolicy(id="high_time", name="High Time", wall_time_limit_sec=120.0)


def test_invalid_memory_limits_rejected():
    """Verify memory limit bounds (< 16MB or > 2048MB) are enforced."""
    with pytest.raises(ValidationError):
        ExecutionPolicy(id="low_mem", name="Low Mem", memory_limit_mb=8)

    with pytest.raises(ValidationError):
        ExecutionPolicy(id="high_mem", name="High Mem", memory_limit_mb=4096)


def test_invalid_cpu_quota_and_pids_rejected():
    """Verify CPU quota must be between 10% and 100%, and pids between 1 and 128."""
    with pytest.raises(ValidationError):
        ExecutionPolicy(id="low_cpu", name="Low CPU", cpu_quota_pct=5)

    with pytest.raises(ValidationError):
        ExecutionPolicy(id="high_cpu", name="High CPU", cpu_quota_pct=150)

    with pytest.raises(ValidationError):
        ExecutionPolicy(id="zero_pids", name="Zero Pids", max_processes=0)

    with pytest.raises(ValidationError):
        ExecutionPolicy(id="excessive_pids", name="Excessive Pids", max_processes=500)


def test_builtin_workloads_have_required_metadata():
    """Verify all built-in test workloads are populated with code and expected outcomes."""
    assert len(BUILTIN_WORKLOADS) >= 6
    workload_ids = {w.id for w in BUILTIN_WORKLOADS}
    assert "normal_output" in workload_ids
    assert "cpu_intensive" in workload_ids
    assert "memory_allocation" in workload_ids
    assert "deadline_timeout" in workload_ids
    assert "file_escape_attempt" in workload_ids
    assert "network_attempt" in workload_ids

    for w in BUILTIN_WORKLOADS:
        assert len(w.title) > 0
        assert len(w.code) > 10
        assert len(w.expected_outcome) > 0
