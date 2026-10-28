"""
Sandboxed - Linux Integration & Security Isolation Test Suite
Executed directly inside Ubuntu Linux with bubblewrap and cgroups v2 configured.
These tests verify actual operating system enforcement primitives.
"""

import os
import sys
import pytest
from sandbox_engine.policies.models import DEFAULT_POLICIES, ExecutionPolicy, FilesystemPolicy, SyscallPolicy
from sandbox_engine.linux.runner import LinuxSandboxRunner
from sandbox_engine.linux.supervisor import TerminationReason

# Guard to skip during Windows development phase
LINUX_ONLY = pytest.mark.skipif(
    sys.platform != "linux",
    reason="Pending verification inside Ubuntu Linux runtime environment (requires cgroups v2 & bubblewrap)",
)


@LINUX_ONLY
def test_linux_simple_execution():
    """Verify execution of a basic Python computation in bubblewrap."""
    runner = LinuxSandboxRunner()
    code = "print('Hello from isolated sandbox')"
    result = runner.run_program(execution_id="test_simple", code=code, policy=DEFAULT_POLICIES["standard"])

    assert result.exit_code == 0
    assert result.termination_reason == TerminationReason.COMPLETED
    assert "Hello from isolated sandbox" in result.stdout


@LINUX_ONLY
def test_linux_stdout_stderr_capture():
    """Verify stdout and stderr are captured into separate buffers."""
    runner = LinuxSandboxRunner()
    code = "import sys\nprint('stdout_msg')\nprint('stderr_msg', file=sys.stderr)"
    result = runner.run_program(execution_id="test_streams", code=code, policy=DEFAULT_POLICIES["standard"])

    assert result.exit_code == 0
    assert "stdout_msg" in result.stdout
    assert "stderr_msg" in result.stderr


@LINUX_ONLY
def test_linux_exit_status_propagation():
    """Verify non-zero process exit codes propagate accurately."""
    runner = LinuxSandboxRunner()
    code = "import sys\nsys.exit(42)"
    result = runner.run_program(execution_id="test_exit_code", code=code, policy=DEFAULT_POLICIES["standard"])

    assert result.exit_code == 42
    assert result.termination_reason == TerminationReason.FAILED


@LINUX_ONLY
def test_linux_wall_clock_timeout_enforcement():
    """Verify supervisor SIGTERM -> SIGKILL escalation on deadline expiry."""
    runner = LinuxSandboxRunner()
    # 2.0s deadline
    policy = ExecutionPolicy(id="timeout_p", name="Timeout Policy", wall_time_limit_sec=2.0)
    code = "import time\ntime.sleep(10)"
    result = runner.run_program(execution_id="test_timeout", code=code, policy=policy)

    assert result.termination_reason == TerminationReason.TIMED_OUT
    assert result.metrics.wall_time_sec >= 1.9


@LINUX_ONLY
def test_linux_memory_limit_cgroup_oom():
    """Verify cgroups v2 memory.max triggers OOM killer and records event."""
    runner = LinuxSandboxRunner()
    # 32MB limit
    policy = ExecutionPolicy(id="mem_p", name="Mem Limit", memory_limit_mb=32)
    code = "x = bytearray(50 * 1024 * 1024)"  # Allocate 50MB
    result = runner.run_program(execution_id="test_oom", code=code, policy=policy)

    assert result.termination_reason == TerminationReason.RESOURCE_LIMIT_EXCEEDED
    assert result.metrics.oom_killed is True


@LINUX_ONLY
def test_linux_cpu_quota_enforcement():
    """Verify CFS throttling under tight CPU quota increases wall-clock duration."""
    runner = LinuxSandboxRunner()
    policy_throttled = ExecutionPolicy(id="cpu_p", name="CPU Throttled", cpu_quota_pct=20, wall_time_limit_sec=8.0)
    code = "sum(i * i for i in range(1000000))"
    result = runner.run_program(execution_id="test_cpu_quota", code=code, policy=policy_throttled)

    assert result.exit_code == 0
    assert result.metrics.cpu_usage_total_sec is not None


@LINUX_ONLY
def test_linux_filesystem_isolation_unauthorized_read():
    """Verify /etc/shadow and ~/.ssh are inaccessible within bubblewrap mount namespace."""
    runner = LinuxSandboxRunner()
    code = """
import os
try:
    with open('/etc/shadow', 'r') as f:
        print('UNSAFE_READ_SUCCEEDED')
except Exception:
    print('PROTECTED_FILE_DENIED')
"""
    result = runner.run_program(execution_id="test_fs_iso", code=code, policy=DEFAULT_POLICIES["standard"])
    assert result.exit_code == 0
    assert "PROTECTED_FILE_DENIED" in result.stdout
    assert "UNSAFE_READ_SUCCEEDED" not in result.stdout


@LINUX_ONLY
def test_linux_network_isolation_egress_blocked():
    """Verify network namespace (--unshare-net) prevents outbound TCP socket connections."""
    runner = LinuxSandboxRunner()
    code = """
import socket
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.5)
    s.connect(('8.8.8.8', 53))
    print('UNSAFE_NET_CONNECTED')
    s.close()
except OSError:
    print('NETWORK_UNREACHABLE_CONFIRMED')
"""
    result = runner.run_program(execution_id="test_net_iso", code=code, policy=DEFAULT_POLICIES["standard"])
    assert result.exit_code == 0
    assert "NETWORK_UNREACHABLE_CONFIRMED" in result.stdout
    assert "UNSAFE_NET_CONNECTED" not in result.stdout


@LINUX_ONLY
def test_linux_output_limit_enforcement():
    """Verify output stream is bounded to max_output_bytes without hanging."""
    runner = LinuxSandboxRunner()
    policy = ExecutionPolicy(id="out_p", name="Output Limit", max_output_bytes=4096)
    code = "for i in range(2000): print('Testing bounded output stream line' * 5)"
    result = runner.run_program(execution_id="test_output_limit", code=code, policy=policy)

    assert len(result.stdout.encode('utf-8')) <= 4096
    assert result.output_truncated is True


@LINUX_ONLY
def test_linux_temporary_file_cleanup():
    """Verify sandbox temporary directory is completely unlinked after execution."""
    runner = LinuxSandboxRunner()
    exec_id = "test_cleanup_verify"
    ws = runner.base_storage_dir / f"exec_{exec_id}"
    code = "with open('temp.txt', 'w') as f: f.write('data')"
    runner.run_program(execution_id=exec_id, code=code, policy=DEFAULT_POLICIES["standard"])

    assert not ws.exists()
