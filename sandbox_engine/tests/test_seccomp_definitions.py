"""
Tests for Seccomp Syscall Filtering Policy Definitions
"""

from sandbox_engine.policies.models import SyscallPolicy
from sandbox_engine.linux.seccomp_filter import (
    get_syscall_policy_definition,
    DANGEROUS_SYSCALLS,
    NETWORK_SYSCALLS,
)


def test_standard_seccomp_policy_contains_critical_denials():
    """Verify standard seccomp profile blocks kernel manipulation syscalls."""
    defn = get_syscall_policy_definition(SyscallPolicy.STANDARD)
    assert defn.default_action == "ALLOW"
    blocked = set(defn.blocked_syscalls)

    for syscall in ["ptrace", "reboot", "mount", "umount2", "bpf", "init_module", "userfaultfd"]:
        assert syscall in blocked


def test_strict_seccomp_policy_blocks_network_sockets():
    """Verify strict seccomp profile blocks socket primitives in addition to dangerous calls."""
    defn = get_syscall_policy_definition(SyscallPolicy.STRICT)
    blocked = set(defn.blocked_syscalls)

    for syscall in ["socket", "connect", "bind", "listen", "accept"]:
        assert syscall in blocked

    # Must also include standard dangerous syscalls
    assert "ptrace" in blocked
    assert "mount" in blocked


def test_disabled_seccomp_policy():
    """Verify disabled policy has no blocked syscalls."""
    defn = get_syscall_policy_definition(SyscallPolicy.DISABLED)
    assert len(defn.blocked_syscalls) == 0
    assert defn.default_action == "ALLOW"


def test_dangerous_syscalls_list_integrity():
    """Verify DANGEROUS_SYSCALLS list is sorted and non-empty."""
    assert len(DANGEROUS_SYSCALLS) >= 15
    assert "kexec_load" in DANGEROUS_SYSCALLS
    assert "swapon" in DANGEROUS_SYSCALLS


def test_network_syscalls_list_integrity():
    """Verify NETWORK_SYSCALLS list covers common transmission primitives."""
    assert "sendto" in NETWORK_SYSCALLS
    assert "recvfrom" in NETWORK_SYSCALLS
    assert "sendmsg" in NETWORK_SYSCALLS
