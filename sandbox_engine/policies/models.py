"""
Sandboxed - Policies Module
Defines execution policy data structures, default presets, and built-in test workloads.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class FilesystemPolicy(str, Enum):
    ISOLATED_RO_ROOT = "isolated_ro_root"
    MINIMAL = "minimal"
    STRICT_RO = "strict_ro"


class SyscallPolicy(str, Enum):
    STANDARD = "standard"
    STRICT = "strict"
    DISABLED = "disabled"


class ExecutionPolicy(BaseModel):
    """
    Validated security and resource configuration for sandboxed execution.
    All constraints are validated server-side.
    """
    id: str = Field(..., description="Unique policy identifier")
    name: str = Field(..., min_length=2, max_length=64, description="Human-readable policy name")
    description: str = Field(default="", max_length=256, description="Policy purpose and restrictions")
    
    # Resource boundaries
    wall_time_limit_sec: float = Field(default=5.0, ge=0.1, le=60.0, description="Max wall-clock seconds")
    memory_limit_mb: int = Field(default=128, ge=16, le=2048, description="Max RAM allocation in MiB")
    cpu_quota_pct: int = Field(default=50, ge=10, le=100, description="Max CPU quota percentage (10-100%)")
    max_processes: int = Field(default=32, ge=1, le=128, description="Max PIDs permitted inside sandbox")
    max_output_bytes: int = Field(default=65536, ge=1024, le=1048576, description="Max stdout/stderr bytes captured")
    temp_storage_mb: int = Field(default=64, ge=8, le=512, description="Max temporary filesystem storage in MiB")
    
    # Isolation controls
    network_enabled: bool = Field(default=False, description="Whether network namespace has internet access")
    filesystem_policy: FilesystemPolicy = Field(default=FilesystemPolicy.ISOLATED_RO_ROOT, description="Filesystem isolation profile")
    syscall_policy: SyscallPolicy = Field(default=SyscallPolicy.STANDARD, description="Syscall filtering profile")
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("network_enabled")
    @classmethod
    def validate_network(cls, v: bool) -> bool:
        # Default security posture: network is disabled by default.
        return v


# Built-in Default Policy Profiles
DEFAULT_POLICIES: Dict[str, ExecutionPolicy] = {
    "standard": ExecutionPolicy(
        id="standard",
        name="Standard Balanced",
        description="Standard balanced policy for academic experiments. 5s timeout, 128MB RAM, 50% CPU, no network.",
        wall_time_limit_sec=5.0,
        memory_limit_mb=128,
        cpu_quota_pct=50,
        max_processes=32,
        max_output_bytes=65536,
        temp_storage_mb=64,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.ISOLATED_RO_ROOT,
        syscall_policy=SyscallPolicy.STANDARD,
    ),
    "strict": ExecutionPolicy(
        id="strict",
        name="Strict Lockdown",
        description="High-security containment. 3s timeout, 64MB RAM, 30% CPU, 8 PIDs, strict seccomp filtering.",
        wall_time_limit_sec=3.0,
        memory_limit_mb=64,
        cpu_quota_pct=30,
        max_processes=8,
        max_output_bytes=32768,
        temp_storage_mb=16,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.STRICT_RO,
        syscall_policy=SyscallPolicy.STRICT,
    ),
    "cpu_constrained": ExecutionPolicy(
        id="cpu_constrained",
        name="CPU Constrained (20%)",
        description="Throttled CPU quota for benchmarking performance degradation under tight CFS throttling.",
        wall_time_limit_sec=5.0,
        memory_limit_mb=128,
        cpu_quota_pct=20,
        max_processes=16,
        max_output_bytes=65536,
        temp_storage_mb=32,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.ISOLATED_RO_ROOT,
        syscall_policy=SyscallPolicy.STANDARD,
    ),
    "memory_constrained": ExecutionPolicy(
        id="memory_constrained",
        name="Memory Constrained (32MB)",
        description="Severe memory ceiling to evaluate cgroups v2 OOM-killer behavior on memory allocations.",
        wall_time_limit_sec=5.0,
        memory_limit_mb=32,
        cpu_quota_pct=50,
        max_processes=16,
        max_output_bytes=65536,
        temp_storage_mb=16,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.ISOLATED_RO_ROOT,
        syscall_policy=SyscallPolicy.STANDARD,
    ),
    "network_blocked": ExecutionPolicy(
        id="network_blocked",
        name="Network Blocked",
        description="Explicit loopback-only network namespace isolating untrusted network egress.",
        wall_time_limit_sec=5.0,
        memory_limit_mb=128,
        cpu_quota_pct=50,
        max_processes=32,
        max_output_bytes=65536,
        temp_storage_mb=64,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.ISOLATED_RO_ROOT,
        syscall_policy=SyscallPolicy.STANDARD,
    ),
    "permissive": ExecutionPolicy(
        id="permissive",
        name="Permissive Test",
        description="Relaxed limits for heavier benchmark programs. 10s timeout, 256MB RAM, 100% CPU.",
        wall_time_limit_sec=10.0,
        memory_limit_mb=256,
        cpu_quota_pct=100,
        max_processes=64,
        max_output_bytes=131072,
        temp_storage_mb=128,
        network_enabled=False,
        filesystem_policy=FilesystemPolicy.ISOLATED_RO_ROOT,
        syscall_policy=SyscallPolicy.STANDARD,
    ),
}


class BuiltinWorkload(BaseModel):
    id: str
    title: str
    description: str
    category: str
    expected_outcome: str
    code: str


# Built-in Safe Test Workloads for OS Experiments
BUILTIN_WORKLOADS: List[BuiltinWorkload] = [
    BuiltinWorkload(
        id="normal_output",
        title="Normal Computation & Output",
        description="Performs arithmetic, verifies Python runtime environment, and prints deterministic output.",
        category="Baseline",
        expected_outcome="Exit code 0, status COMPLETED, duration < 1s.",
        code="""import sys
import platform

print("=== SANDBOXED OS EXECUTION RUNTIME ===")
print(f"Python: {sys.version.split()[0]}")
print(f"Platform: {platform.platform()}")

total = sum(i * i for i in range(10000))
print(f"Calculation Result: sum(i^2, 0..9999) = {total}")
print("Sandbox baseline execution successful.")
""",
    ),
    BuiltinWorkload(
        id="cpu_intensive",
        title="CPU-Intensive Computation",
        description="Calculates prime numbers in a tight loop to measure CPU quota enforcement.",
        category="Resource Enforcement",
        expected_outcome="Exit code 0 or TIMED_OUT depending on quota; CPU consumption measurable.",
        code="""import time

def find_primes(limit):
    primes = []
    for num in range(2, limit):
        is_prime = True
        for i in range(2, int(num ** 0.5) + 1):
            if num % i == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(num)
    return primes

print("Starting CPU benchmark: finding primes up to 25,000...")
start = time.perf_counter()
primes = find_primes(25000)
elapsed = time.perf_counter() - start
print(f"Found {len(primes)} primes in {elapsed:.3f} seconds.")
""",
    ),
    BuiltinWorkload(
        id="memory_allocation",
        title="Memory Allocation Test",
        description="Allocates chunks of RAM. Under 32MB policy this triggers cgroups v2 OOM; under 128MB it succeeds.",
        category="Resource Enforcement",
        expected_outcome="COMPLETED on standard (128MB); RESOURCE_LIMIT_EXCEEDED (OOM killed) on 32MB policy.",
        code="""import time

print("Starting memory allocation benchmark...")
chunks = []
# Try to allocate 50 MB in 5 MB chunks
for i in range(10):
    size_mb = (i + 1) * 5
    print(f"Allocating chunk {i+1} (total requested: {size_mb} MB)...")
    chunks.append(bytearray(5 * 1024 * 1024))
    time.sleep(0.05)

print(f"Successfully allocated {len(chunks) * 5} MB of memory.")
""",
    ),
    BuiltinWorkload(
        id="deadline_timeout",
        title="Execution Deadline Timeout",
        description="Executes an intentional long sleep loop to verify the supervisor wall-clock watchdog.",
        category="Process Supervision",
        expected_outcome="Terminated by supervisor with TIMED_OUT status at configured wall-clock limit.",
        code="""import time
import sys

print("Executing sleep loop designed to exceed execution deadline...")
sys.stdout.flush()

for second in range(1, 20):
    print(f"Tick {second}s...")
    sys.stdout.flush()
    time.sleep(1.0)

print("Finished sleep loop (unexpected).")
""",
    ),
    BuiltinWorkload(
        id="file_escape_attempt",
        title="Filesystem Isolation & Escape Test",
        description="Attempts to access sensitive host files (/etc/shadow, ~/.ssh) to verify mount namespace protection.",
        category="Security & Isolation",
        expected_outcome="All access denied (FileNotFoundError or PermissionError). Host files remain inaccessible.",
        code="""import os

sensitive_targets = [
    "/etc/shadow",
    "/etc/gshadow",
    "/root",
    os.path.expanduser("~/.ssh"),
    os.path.expanduser("~/.bash_history"),
    "/var/log/auth.log"
]

print("=== VERIFYING FILESYSTEM ISOLATION ===")
for target in sensitive_targets:
    try:
        exists = os.path.exists(target)
        if exists:
            # Try to read
            with open(target, "r") as f:
                content = f.read(16)
            print(f"[SECURITY ALERT] Read succeeded for {target}!")
        else:
            print(f"[PROTECTED] Target does not exist in sandbox root: {target}")
    except PermissionError:
        print(f"[PROTECTED] Permission denied as expected: {target}")
    except Exception as e:
        print(f"[PROTECTED] Access prevented for {target} ({type(e).__name__})")

print("Filesystem isolation verification complete.")
""",
    ),
    BuiltinWorkload(
        id="network_attempt",
        title="Network Egress Attempt",
        description="Attempts to establish an outbound TCP socket to 8.8.8.8 to verify network namespace isolation.",
        category="Security & Isolation",
        expected_outcome="Network unreachable (ENETUNREACH or timeout). Egress blocked by isolated network namespace.",
        code="""import socket

print("=== VERIFYING NETWORK NAMESPACE ISOLATION ===")
target_host = "8.8.8.8"
target_port = 53

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2.0)
    print(f"Attempting TCP connection to {target_host}:{target_port}...")
    s.connect((target_host, target_port))
    print("[SECURITY ALERT] Outbound connection succeeded!")
    s.close()
except OSError as e:
    print(f"[PROTECTED] Connection failed as expected: {e}")
except Exception as e:
    print(f"[PROTECTED] Network egress prevented: {e}")

print("Network isolation verification complete.")
""",
    ),
    BuiltinWorkload(
        id="output_limit_test",
        title="Bounded Output Stream Test",
        description="Emits a flood of stdout to verify non-blocking pipe reading and output truncation buffers.",
        category="Process Supervision",
        expected_outcome="Completed with output truncated at policy max_output_bytes limit; no supervisor hang or deadlock.",
        code="""import sys

print("Beginning high-volume stdout stream...")
for i in range(5000):
    print(f"Log line {i:05d}: Bounded buffer testing - abcdefghijklmnopqrstuvwxyz0123456789")

print("Finished stream.")
""",
    ),
    BuiltinWorkload(
        id="fork_limit_test",
        title="Process Limit (pids.max) Test",
        description="Spawns subprocesses to verify cgroups v2 pids.max enforcement without harming the host.",
        category="Resource Enforcement",
        expected_outcome="Process spawning halted when reaching max_processes; Resource limit / fork blocked.",
        code="""import os
import sys
import multiprocessing

def worker():
    pass

print(f"Testing process limit in sandbox (PID {os.getpid()})...")
processes = []
try:
    for i in range(50):
        p = multiprocessing.Process(target=worker)
        p.start()
        processes.append(p)
        print(f"Spawned child {i+1} (PID {p.pid})")
except Exception as e:
    print(f"[CONTROLLED] Process creation halted by limit: {e}")
finally:
    for p in processes:
        p.join(timeout=0.1)

print("Process limit test complete.")
""",
    ),
]
