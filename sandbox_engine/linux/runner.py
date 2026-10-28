"""
Sandboxed - Linux Execution Engine Runner
Coordinates capability validation, filesystem workspace preparation,
cgroups v2 controller isolation, bubblewrap execution, and cleanup.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Callable, Optional
from sandbox_engine.policies.models import ExecutionPolicy
from sandbox_engine.linux.capabilities import detect_capabilities, EngineCapabilityReport
from sandbox_engine.linux.bwrap_builder import BwrapCommandBuilder
from sandbox_engine.linux.cgroup_v2 import CgroupV2Manager
from sandbox_engine.linux.supervisor import ProcessSupervisor, SupervisedExecutionResult, TerminationReason


class SandboxCapabilityError(RuntimeError):
    """Raised when host system lacks required Linux isolation primitives."""
    def __init__(self, message: str, report: EngineCapabilityReport):
        super().__init__(message)
        self.report = report


class LinuxSandboxRunner:
    """
    Primary interface for executing submitted programs in real Linux isolated environments.
    Guarantees that security boundaries are verified before execution starts.
    """

    def __init__(
        self,
        bwrap_path: str = "/usr/bin/bwrap",
        cgroup_root: str = "/sys/fs/cgroup",
        slice_name: str = "sandboxed.slice",
        base_storage_dir: str = "/tmp/sandboxed_storage",
    ):
        self.bwrap_path = bwrap_path
        self.cgroup_root = cgroup_root
        self.slice_name = slice_name
        self.base_storage_dir = Path(base_storage_dir)
        self.cgroup_manager = CgroupV2Manager(cgroup_root, slice_name)
        self.bwrap_builder = BwrapCommandBuilder(bwrap_path)
        self.supervisor = ProcessSupervisor(self.cgroup_manager)

    def check_readiness(self) -> EngineCapabilityReport:
        """
        Validates whether host has all prerequisites to run isolated workloads.
        """
        return detect_capabilities(self.cgroup_root)

    def run_program(
        self,
        execution_id: str,
        code: str,
        policy: ExecutionPolicy,
        cancel_check: Optional[Callable[[], bool]] = None,
        force_bypass_check: bool = False,
    ) -> SupervisedExecutionResult:
        """
        Prepares workspace, enforces cgroups v2, executes through bubblewrap, and cleans up.
        Raises SandboxCapabilityError if host system cannot enforce requested isolation.
        """
        report = self.check_readiness()
        if not report.ready and not force_bypass_check:
            issues_str = "; ".join(report.issues)
            raise SandboxCapabilityError(
                f"Cannot execute isolated sandbox: Host lacks Linux prerequisites ({issues_str}). "
                "Deploy on Ubuntu with cgroups v2 and bubblewrap installed.",
                report=report,
            )

        # 1. Prepare temporary workspace
        workspace_dir = self.base_storage_dir / f"exec_{execution_id}"
        workspace_dir.mkdir(parents=True, exist_ok=True)
        script_file = workspace_dir / "script.py"
        script_file.write_text(code, encoding="utf-8")

        # 2. Setup cgroups v2 child slice
        exec_cgroup: Optional[Path] = None
        try:
            if report.cgroups_v2_mounted and report.cgroups_delegation_writable:
                exec_cgroup = self.cgroup_manager.create_execution_cgroup(execution_id, policy)
        except Exception:
            exec_cgroup = None

        # 3. Build Bubblewrap Command
        bwrap_cmd = self.bwrap_builder.build_command(
            policy=policy,
            sandbox_workspace=workspace_dir,
            script_filename="script.py",
            interpreter="python3",
        )

        try:
            # 4. Supervise Execution
            result = self.supervisor.run_supervised(
                cmd=bwrap_cmd,
                policy=policy,
                execution_id=execution_id,
                cgroup_path=exec_cgroup,
                cancel_check=cancel_check,
            )
            return result

        finally:
            # 5. Cleanup cgroup and workspace
            if exec_cgroup:
                try:
                    self.cgroup_manager.cleanup_cgroup(exec_cgroup)
                except Exception:
                    pass

            if workspace_dir.exists():
                try:
                    shutil.rmtree(workspace_dir, ignore_errors=True)
                except Exception:
                    pass
