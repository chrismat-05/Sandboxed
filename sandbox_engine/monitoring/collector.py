"""
Sandboxed - Resource Monitoring & Telemetry
Parses cgroups v2 statistics, exit codes, process statuses, and execution duration.
"""

import os
from pathlib import Path
from typing import Dict, Optional, Tuple
from pydantic import BaseModel, Field


class ExecutionMetrics(BaseModel):
    """
    Measurable telemetry gathered from Linux cgroups v2 and supervisor timers.
    Clearly distinguishes requested policy limits from measured physical consumption.
    """
    wall_time_sec: float = Field(default=0.0, description="Measured wall-clock execution duration in seconds")
    cpu_time_user_sec: Optional[float] = Field(default=None, description="User-mode CPU time consumed in seconds")
    cpu_time_system_sec: Optional[float] = Field(default=None, description="Kernel-mode CPU time consumed in seconds")
    cpu_usage_total_sec: Optional[float] = Field(default=None, description="Total CPU time in seconds (user + system)")
    
    peak_memory_bytes: Optional[int] = Field(default=None, description="Peak physical memory recorded by kernel (memory.peak)")
    peak_memory_mb: Optional[float] = Field(default=None, description="Peak physical memory in Megabytes")
    current_memory_bytes: Optional[int] = Field(default=None, description="Memory usage at sampling time (memory.current)")
    
    oom_killed: bool = Field(default=False, description="Whether cgroup OOM killer was invoked (memory.events oom_kill)")
    oom_events_count: int = Field(default=0, description="Total OOM events triggered in cgroup")
    
    pids_current: Optional[int] = Field(default=None, description="Number of active tasks at sampling (pids.current)")
    pids_peak: Optional[int] = Field(default=None, description="Peak process count (pids.peak or observed)")
    pids_max_events: int = Field(default=0, description="Number of times process limit was reached (pids.events max)")
    
    output_bytes: int = Field(default=0, description="Total bytes of stdout and stderr captured")
    truncated_output: bool = Field(default=False, description="Whether output exceeded buffer limit and was truncated")


def parse_key_value_file(path: Path) -> Dict[str, str]:
    """Parse space-separated or key-value cgroup files like cpu.stat or memory.events."""
    if not path.is_file():
        return {}
    results = {}
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        for line in content.strip().splitlines():
            parts = line.split()
            if len(parts) >= 2:
                results[parts[0]] = parts[1]
    except (OSError, PermissionError):
        pass
    return results


def read_int_file(path: Path) -> Optional[int]:
    """Read a single integer from a cgroup control file."""
    if not path.is_file():
        return None
    try:
        content = path.read_text(encoding="utf-8", errors="replace").strip()
        if content.isdigit():
            return int(content)
        # Handle "max"
        if content == "max":
            return -1
    except (OSError, PermissionError):
        pass
    return None


def collect_cgroup_v2_metrics(cgroup_path: Path) -> Tuple[Dict[str, any], bool]:
    """
    Reads cgroup v2 controller files from the execution slice:
    - cpu.stat
    - memory.current
    - memory.peak
    - memory.events
    - pids.current
    - pids.events
    Returns a dictionary of raw measurements and an oom_killed flag.
    """
    metrics = {
        "cpu_user_sec": None,
        "cpu_system_sec": None,
        "cpu_total_sec": None,
        "memory_peak_bytes": None,
        "memory_current_bytes": None,
        "oom_killed": False,
        "oom_count": 0,
        "pids_current": None,
        "pids_max_events": 0,
    }
    oom_killed = False

    if not cgroup_path.is_dir():
        return metrics, oom_killed

    # CPU metrics (cpu.stat: usage_usec, user_usec, system_usec)
    cpu_stat = parse_key_value_file(cgroup_path / "cpu.stat")
    if "usage_usec" in cpu_stat:
        metrics["cpu_total_sec"] = round(int(cpu_stat["usage_usec"]) / 1_000_000.0, 4)
    if "user_usec" in cpu_stat:
        metrics["cpu_user_sec"] = round(int(cpu_stat["user_usec"]) / 1_000_000.0, 4)
    if "system_usec" in cpu_stat:
        metrics["cpu_system_sec"] = round(int(cpu_stat["system_usec"]) / 1_000_000.0, 4)

    # Memory peak (memory.peak)
    mem_peak = read_int_file(cgroup_path / "memory.peak")
    if mem_peak is not None and mem_peak >= 0:
        metrics["memory_peak_bytes"] = mem_peak

    # Memory current (memory.current)
    mem_current = read_int_file(cgroup_path / "memory.current")
    if mem_current is not None and mem_current >= 0:
        metrics["memory_current_bytes"] = mem_current

    # Memory events (memory.events: oom, oom_kill, max)
    mem_events = parse_key_value_file(cgroup_path / "memory.events")
    oom_kills = int(mem_events.get("oom_kill", 0))
    oom_events = int(mem_events.get("oom", 0))
    if oom_kills > 0 or oom_events > 0:
        oom_killed = True
        metrics["oom_killed"] = True
        metrics["oom_count"] = max(oom_kills, oom_events)

    # PIDs metrics
    pids_cur = read_int_file(cgroup_path / "pids.current")
    if pids_cur is not None and pids_cur >= 0:
        metrics["pids_current"] = pids_cur

    pids_events = parse_key_value_file(cgroup_path / "pids.events")
    if "max" in pids_events:
        metrics["pids_max_events"] = int(pids_events["max"])

    return metrics, oom_killed
