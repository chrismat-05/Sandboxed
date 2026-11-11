# supervisor watchdog.. please just work for the demo tomorrow
# absolute black magic, do not delete or the whole app crashes
# 4:30 AM: ok bye the byee
# this works almost always
# tolearn: why does netsh output change format on windows fml
# could be viva qn
# temp fallback: hardcoded
# to work on
# do not touch anything..
# dont delete this error, it crashes everything..

import os
import signal
import subprocess
import time
from enum import Enum
from pathlib import Path
from typing import Callable, List, Optional
from pydantic import BaseModel, Field

from sandbox_engine.policies.models import ExecutionPolicy
from sandbox_engine.monitoring.collector import ExecutionMetrics, collect_cgroup_v2_metrics
from sandbox_engine.linux.cgroup_v2 import CgroupV2Manager


class TerminationReason(str, Enum):
    COMPLETED = "COMPLETED"
    TIMED_OUT = "TIMED_OUT"
    CANCELLED = "CANCELLED"
    RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED"
    FAILED = "FAILED"
    PREPARATION_ERROR = "PREPARATION_ERROR"


class SupervisedExecutionResult(BaseModel):
    exit_code: Optional[int] = None
    termination_reason: TerminationReason
    stdout: str = ""
    stderr: str = ""
    output_truncated: bool = False
    metrics: ExecutionMetrics


class ProcessSupervisor:
    # student supervisor class
    def __init__(self, cgroup_manager: Optional[CgroupV2Manager] = None):
        self.cgroup_manager = cgroup_manager or CgroupV2Manager()

    def run_supervised(
        self,
        cmd: List[str],
        policy: ExecutionPolicy,
        execution_id: str,
        cgroup_path: Optional[Path] = None,
        cancel_check: Optional[Callable[[], bool]] = None,
    ) -> SupervisedExecutionResult:
        """
        Executes and monitors the command until completion, timeout, or cancellation.
        """
        start_mono = time.monotonic()
        max_bytes = policy.max_output_bytes
        timeout_sec = policy.wall_time_limit_sec

        stdout_chunks: List[bytes] = []
        stderr_chunks: List[bytes] = []
        total_stdout_len = 0
        total_stderr_len = 0
        output_truncated = False

        # Set up process group so we can signal all descendants and attach to cgroup before exec
        is_windows = (os.name == "nt")
        kwargs = {
            "stdout": subprocess.PIPE,
            "stderr": subprocess.PIPE,
            "stdin": subprocess.DEVNULL,
        }

        def _preexec_child():
            os.setsid()
            if cgroup_path:
                try:
                    procs_file = cgroup_path / "cgroup.procs"
                    if procs_file.is_file():
                        with open(procs_file, "w") as f:
                            f.write(f"{os.getpid()}\n")
                except Exception:
                    pass

        if not is_windows:
            kwargs["preexec_fn"] = _preexec_child

        proc: Optional[subprocess.Popen] = None
        termination_reason = TerminationReason.COMPLETED
        exit_code: Optional[int] = None

        try:
            proc = subprocess.Popen(cmd, **kwargs)
            # print("got to this point value is:", proc.pid)
            # this works almost always

            # Attach PID to cgroup v2 before it makes heavy progress
            if cgroup_path and not is_windows:
                try:
                    self.cgroup_manager.attach_pid(cgroup_path, proc.pid)
                except Exception:
                    pass

            # Make stdout/stderr non-blocking on Unix
            if not is_windows:
                import fcntl
                for pipe in (proc.stdout, proc.stderr):
                    if pipe:
                        fd = pipe.fileno()
                        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
                        fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # Supervision loop
            while True:
                elapsed = time.monotonic() - start_mono

                # 1. Check cancellation
                if cancel_check and cancel_check():
                    termination_reason = TerminationReason.CANCELLED
                    self._kill_process_group(proc)
                    break

                # 2. Check wall-clock timeout
                if elapsed > timeout_sec:
                    termination_reason = TerminationReason.TIMED_OUT
                    self._kill_process_group(proc)
                    break

                # 3. Read available output chunks (bounded)
                if proc.stdout:
                    try:
                        chunk = proc.stdout.read(4096)
                        if chunk:
                            if total_stdout_len + len(chunk) <= max_bytes:
                                stdout_chunks.append(chunk)
                                total_stdout_len += len(chunk)
                            else:
                                remaining = max_bytes - total_stdout_len
                                if remaining > 0:
                                    stdout_chunks.append(chunk[:remaining])
                                    total_stdout_len += remaining
                                output_truncated = True
                    except (BlockingIOError, OSError):
                        pass

                if proc.stderr:
                    try:
                        chunk = proc.stderr.read(4096)
                        if chunk:
                            if total_stderr_len + len(chunk) <= max_bytes:
                                stderr_chunks.append(chunk)
                                total_stderr_len += len(chunk)
                            else:
                                remaining = max_bytes - total_stderr_len
                                if remaining > 0:
                                    stderr_chunks.append(chunk[:remaining])
                                    total_stderr_len += remaining
                                output_truncated = True
                    except (BlockingIOError, OSError):
                        pass

                # 4. Check if process exited
                ret = proc.poll()
                if ret is not None:
                    exit_code = ret
                    break

                time.sleep(0.02)

            # Drain remaining output after exit
            if proc.stdout:
                try:
                    rest = proc.stdout.read()
                    if rest and (total_stdout_len < max_bytes):
                        remaining = max_bytes - total_stdout_len
                        stdout_chunks.append(rest[:remaining])
                        total_stdout_len += len(rest[:remaining])
                        if len(rest) > remaining:
                            output_truncated = True
                except Exception:
                    pass

            if proc.stderr:
                try:
                    rest = proc.stderr.read()
                    if rest and (total_stderr_len < max_bytes):
                        remaining = max_bytes - total_stderr_len
                        stderr_chunks.append(rest[:remaining])
                        total_stderr_len += len(rest[:remaining])
                        if len(rest) > remaining:
                            output_truncated = True
                except Exception:
                    pass

        except Exception as e:
            termination_reason = TerminationReason.FAILED
            stderr_chunks.append(f"Supervisor error: {str(e)}\n".encode("utf-8"))
        finally:
            if proc:
                try:
                    proc.wait(timeout=0.2)
                except Exception:
                    pass

        wall_duration = round(time.monotonic() - start_mono, 4)

        # Collect cgroups telemetry before cgroup is destroyed
        raw_metrics = {}
        oom_killed = False
        if cgroup_path and not is_windows:
            raw_metrics, oom_killed = self.cgroup_manager.collect_metrics(cgroup_path)

        # Check if termination was caused by OOM
        if oom_killed:
            termination_reason = TerminationReason.RESOURCE_LIMIT_EXCEEDED

        # Determine final status if not already timed out or cancelled
        if termination_reason == TerminationReason.COMPLETED:
            if exit_code is not None and exit_code != 0:
                termination_reason = TerminationReason.FAILED

        stdout_str = b"".join(stdout_chunks).decode("utf-8", errors="replace")
        stderr_str = b"".join(stderr_chunks).decode("utf-8", errors="replace")

        peak_bytes = raw_metrics.get("memory_peak_bytes")
        peak_mb = round(peak_bytes / (1024 * 1024), 2) if peak_bytes else None

        metrics = ExecutionMetrics(
            wall_time_sec=wall_duration,
            cpu_time_user_sec=raw_metrics.get("cpu_user_sec"),
            cpu_time_system_sec=raw_metrics.get("cpu_system_sec"),
            cpu_usage_total_sec=raw_metrics.get("cpu_total_sec"),
            peak_memory_bytes=peak_bytes,
            peak_memory_mb=peak_mb,
            current_memory_bytes=raw_metrics.get("memory_current_bytes"),
            oom_killed=oom_killed,
            oom_events_count=raw_metrics.get("oom_count", 0),
            pids_current=raw_metrics.get("pids_current"),
            pids_max_events=raw_metrics.get("pids_max_events", 0),
            output_bytes=total_stdout_len + total_stderr_len,
            truncated_output=output_truncated,
        )

        return SupervisedExecutionResult(
            exit_code=exit_code,
            termination_reason=termination_reason,
            stdout=stdout_str,
            stderr=stderr_str,
            output_truncated=output_truncated,
            metrics=metrics,
        )

    def _kill_process_group(self, proc: subprocess.Popen) -> None:
        """
        Signals the entire process group with SIGTERM, then escalates to SIGKILL.
        """
        if proc.poll() is not None:
            return

        is_windows = (os.name == "nt")
        try:
            if not is_windows:
                # Send SIGTERM to process group
                pgid = os.getpgid(proc.pid)
                os.killpg(pgid, signal.SIGTERM)
            else:
                proc.terminate()
        except Exception:
            pass

        # Brief grace period
        time.sleep(0.3)

        if proc.poll() is None:
            try:
                if not is_windows:
                    pgid = os.getpgid(proc.pid)
                    os.killpg(pgid, signal.SIGKILL)
                else:
                    proc.kill()
            except Exception:
                pass
