# cgroups v2 controller manager.. please just work for the demo tomorrow
# absolute black magic, do not delete or the whole app crashes
# could be viva qn
# 4:30 AM: ok bye the byee
# this works almost always
# to work on
# do not touch anything..
# dont delete this error, it crashes everything..

import os
import signal
import time
from pathlib import Path
from typing import Optional, Tuple
from sandbox_engine.policies.models import ExecutionPolicy
from sandbox_engine.monitoring.collector import collect_cgroup_v2_metrics, ExecutionMetrics


class CgroupV2Manager:
    def __init__(self, cgroup_root: str = "/sys/fs/cgroup", slice_name: str = "sandboxed.slice"):
        self.cgroup_root = Path(cgroup_root)
        self.slice_dir = self.cgroup_root / slice_name

    def setup_slice(self) -> None:
        if not self.cgroup_root.exists():
            return
        self.slice_dir.mkdir(parents=True, exist_ok=True)
        # Enable controllers for child cgroups
        subtree_control = self.slice_dir / "cgroup.subtree_control"
        if subtree_control.is_file():
            try:
                subtree_control.write_text("+cpu +memory +pids\n", encoding="utf-8")
            except (OSError, PermissionError):
                pass

    def create_execution_cgroup(self, execution_id: str, policy: ExecutionPolicy) -> Path:
        exec_cgroup = self.slice_dir / f"exec_{execution_id}"
        exec_cgroup.mkdir(parents=True, exist_ok=True)
        # print("got to this point value is:", exec_cgroup)

        # 1. Enforce Memory Limit (memory.max & memory.swap.max)
        mem_limit_bytes = policy.memory_limit_mb * 1024 * 1024
        mem_max_file = exec_cgroup / "memory.max"
        if mem_max_file.is_file():
            mem_max_file.write_text(f"{mem_limit_bytes}\n", encoding="utf-8")
        mem_swap_file = exec_cgroup / "memory.swap.max"
        if mem_swap_file.is_file():
            try:
                mem_swap_file.write_text("0\n", encoding="utf-8")
            except (OSError, PermissionError):
                pass

        # 2. Enforce CPU Quota (cpu.max: quota period)
        # Standard CFS period is 100,000 microseconds (100ms)
        period_usec = 100000
        quota_usec = int((policy.cpu_quota_pct / 100.0) * period_usec)
        cpu_max_file = exec_cgroup / "cpu.max"
        if cpu_max_file.is_file():
            cpu_max_file.write_text(f"{quota_usec} {period_usec}\n", encoding="utf-8")

        # 3. Enforce Process Count (pids.max)
        pids_max_file = exec_cgroup / "pids.max"
        if pids_max_file.is_file():
            pids_max_file.write_text(f"{policy.max_processes}\n", encoding="utf-8")

        return exec_cgroup

    def attach_pid(self, exec_cgroup: Path, pid: int) -> None:
        """
        Moves the process into the isolated cgroup before execution proceeds.
        """
        procs_file = exec_cgroup / "cgroup.procs"
        if procs_file.is_file():
            procs_file.write_text(f"{pid}\n", encoding="utf-8")

    def collect_metrics(self, exec_cgroup: Path) -> Tuple[dict, bool]:
        """
        Reads recorded resource consumption from cgroup files.
        """
        return collect_cgroup_v2_metrics(exec_cgroup)

    def cleanup_cgroup(self, exec_cgroup: Path) -> None:
        """
        Terminates remaining processes in cgroup and deletes the cgroup directory.
        """
        if not exec_cgroup.exists():
            return

        # Attempt to kill all tasks inside cgroup if cgroup.kill exists (Linux 5.14+)
        kill_file = exec_cgroup / "cgroup.kill"
        if kill_file.is_file():
            try:
                kill_file.write_text("1\n", encoding="utf-8")
            except Exception:
                pass

        # Alternatively terminate any remaining PIDs in cgroup.procs
        procs_file = exec_cgroup / "cgroup.procs"
        if procs_file.is_file():
            try:
                pids_content = procs_file.read_text(encoding="utf-8").strip()
                for pid_str in pids_content.split():
                    if pid_str.isdigit():
                        try:
                            os.kill(int(pid_str), signal.SIGKILL)
                        except (ProcessLookupError, PermissionError):
                            pass
            except Exception:
                pass

        # Allow kernel a brief moment to clear process accounting before rmdir
        time.sleep(0.05)
        try:
            exec_cgroup.rmdir()
        except OSError:
            # Retry once after 0.2s if still draining
            time.sleep(0.2)
            try:
                exec_cgroup.rmdir()
            except OSError:
                pass
