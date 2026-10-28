"""
Sandboxed - Seccomp BPF Syscall Filtering
Defines allowlists and denylists for Linux system call filtering.
Restricts dangerous system administration, module loading, and raw socket creation.
"""

from typing import Dict, List, Set
from pydantic import BaseModel, Field
from sandbox_engine.policies.models import SyscallPolicy


class SyscallFilterDefinition(BaseModel):
    policy: SyscallPolicy
    default_action: str = Field(default="ALLOW", description="ALLOW or KILL")
    blocked_syscalls: List[str] = Field(default_factory=list, description="Syscalls intercepted and rejected with EPERM")
    description: str


# System calls that pose direct kernel exploit or container breakout risks
DANGEROUS_SYSCALLS: List[str] = [
    "ptrace",           # Process tracing and memory manipulation
    "chroot",           # Escape from existing chroot
    "reboot",           # Host system reboot
    "kexec_load",       # Kernel replacement
    "kexec_file_load",  # Kernel replacement
    "mount",            # Arbitrary filesystem mounting
    "umount2",          # Unmounting host filesystems
    "swapon",           # Swap activation
    "swapoff",          # Swap deactivation
    "init_module",      # Kernel module insertion
    "finit_module",     # Kernel module insertion
    "delete_module",    # Kernel module removal
    "bpf",              # Berkeley Packet Filter bytecode loading
    "userfaultfd",      # Kernel page fault handling (common exploit primitive)
    "perf_event_open",  # Performance counter side channels
    "settimeofday",     # Alter host clock
    "clock_settime",    # Alter host clock
    "acct",             # Process accounting
]

# Network syscalls blocked under Strict policy
NETWORK_SYSCALLS: List[str] = [
    "socket",
    "connect",
    "bind",
    "listen",
    "accept",
    "accept4",
    "sendto",
    "recvfrom",
    "sendmsg",
    "recvmsg",
]


def get_syscall_policy_definition(policy: SyscallPolicy) -> SyscallFilterDefinition:
    """
    Returns the configured syscall list and filtering action for a given policy profile.
    """
    if policy == SyscallPolicy.DISABLED:
        return SyscallFilterDefinition(
            policy=policy,
            default_action="ALLOW",
            blocked_syscalls=[],
            description="Syscall filtering disabled. Baseline unshare namespace isolation only.",
        )
    elif policy == SyscallPolicy.STRICT:
        blocked = sorted(list(set(DANGEROUS_SYSCALLS + NETWORK_SYSCALLS)))
        return SyscallFilterDefinition(
            policy=policy,
            default_action="ALLOW",
            blocked_syscalls=blocked,
            description="Strict policy: Intercepts and rejects dangerous kernel calls and all network socket primitives.",
        )
    else:  # STANDARD
        return SyscallFilterDefinition(
            policy=SyscallPolicy.STANDARD,
            default_action="ALLOW",
            blocked_syscalls=sorted(DANGEROUS_SYSCALLS),
            description="Standard policy: Rejects dangerous privileged administrative syscalls (ptrace, bpf, modules, mounts).",
        )
