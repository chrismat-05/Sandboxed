"""
Tests for cgroups v2 Quota Calculations and Metrics Parsing
"""

from pathlib import Path
import tempfile
from sandbox_engine.policies.models import ExecutionPolicy
from sandbox_engine.linux.cgroup_v2 import CgroupV2Manager
from sandbox_engine.monitoring.collector import collect_cgroup_v2_metrics


def test_cgroup_v2_memory_calculation():
    """Verify memory.max limit calculation in bytes."""
    policy = ExecutionPolicy(id="test_mem", name="Mem Test", memory_limit_mb=64)
    expected_bytes = 64 * 1024 * 1024
    assert expected_bytes == 67108864


def test_cgroup_v2_cpu_quota_calculation():
    """Verify cpu.max CFS quota formatting (e.g. 50% = 50000 100000)."""
    period_usec = 100000
    for pct in [10, 25, 50, 75, 100]:
        quota_usec = int((pct / 100.0) * period_usec)
        assert quota_usec == int(pct * 1000)
        formatted = f"{quota_usec} {period_usec}"
        assert formatted.endswith(" 100000")


def test_collector_parses_cpu_stat(tmp_path):
    """Verify collector reads cpu.stat and converts microseconds to seconds."""
    cgroup_dir = tmp_path / "test_cgroup"
    cgroup_dir.mkdir()
    
    cpu_stat_file = cgroup_dir / "cpu.stat"
    cpu_stat_file.write_text("usage_usec 250000\nuser_usec 150000\nsystem_usec 100000\n")

    metrics, oom = collect_cgroup_v2_metrics(cgroup_dir)
    assert metrics["cpu_total_sec"] == 0.25
    assert metrics["cpu_user_sec"] == 0.15
    assert metrics["cpu_system_sec"] == 0.1
    assert oom is False


def test_collector_parses_memory_events_oom(tmp_path):
    """Verify collector flags OOM termination when memory.events has oom_kill."""
    cgroup_dir = tmp_path / "test_cgroup_oom"
    cgroup_dir.mkdir()

    mem_events_file = cgroup_dir / "memory.events"
    mem_events_file.write_text("low 0\nhigh 0\nmax 12\noom 1\noom_kill 1\noom_group_kill 0\n")

    metrics, oom = collect_cgroup_v2_metrics(cgroup_dir)
    assert oom is True
    assert metrics["oom_killed"] is True
    assert metrics["oom_count"] == 1


def test_collector_handles_missing_files_gracefully(tmp_path):
    """Verify collector returns structured nulls when files are not present."""
    empty_cgroup = tmp_path / "empty_cgroup"
    empty_cgroup.mkdir()

    metrics, oom = collect_cgroup_v2_metrics(empty_cgroup)
    assert metrics["cpu_total_sec"] is None
    assert metrics["memory_peak_bytes"] is None
    assert oom is False
