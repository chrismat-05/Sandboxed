"""
Sandboxed - Bubblewrap Command Builder
Constructs hardened, least-privilege Linux container arguments using bubblewrap (bwrap).
Establishes namespaces (PID, mount, network, user, IPC, UTS) and restricted root mounts.
"""

import os
from pathlib import Path
from typing import List, Optional
from sandbox_engine.policies.models import ExecutionPolicy, FilesystemPolicy


class BwrapCommandBuilder:
    """
    Constructs bubblewrap invocation arguments enforcing least privilege:
    - Never binds the host root filesystem or user home directories (/root, /home)
    - Isolates network egress by default via --unshare-net
    - Grants read-only access only to required system binaries and runtime libraries
    - Allocates private /tmp and restricted working directory
    - Enforces --die-with-parent to guarantee process group termination
    """

    def __init__(self, bwrap_path: str = "/usr/bin/bwrap"):
        self.bwrap_path = bwrap_path

    def build_command(
        self,
        policy: ExecutionPolicy,
        sandbox_workspace: Path,
        script_filename: str = "script.py",
        interpreter: str = "python3",
        extra_args: Optional[List[str]] = None,
        seccomp_bpf_fd: Optional[int] = None,
    ) -> List[str]:
        """
        Builds the complete CLI argument list for bubblewrap.
        """
        cmd: List[str] = [self.bwrap_path]

        # 1. Namespace Isolation
        cmd.extend([
            "--unshare-user",
            "--unshare-ipc",
            "--unshare-pid",
            "--unshare-uts",
            "--unshare-cgroup",
        ])

        if not policy.network_enabled:
            cmd.append("--unshare-net")
        else:
            cmd.append("--share-net")

        # 2. Lifecycle & Session Boundaries
        cmd.extend([
            "--die-with-parent",
            "--new-session",
        ])

        # 3. Virtual filesystems (/proc, /dev, /tmp)
        cmd.extend([
            "--proc", "/proc",
            "--dev", "/dev",
            "--tmpfs", "/tmp",
        ])

        # 4. Read-Only System Mounts
        # Carefully expose only the Linux interpreter libraries and basic binaries.
        # NEVER mount /home, /root, /etc/shadow, /var/log, or application directories.
        standard_ro_mounts = [
            "/usr",
            "/lib",
            "/lib64",
            "/bin",
            "/sbin",
            "/etc/alternatives",
            "/etc/ld.so.cache",
        ]

        for ro_path in standard_ro_mounts:
            # When running on host or checking paths, only mount if the path exists
            if Path(ro_path).exists():
                cmd.extend(["--ro-bind", ro_path, ro_path])

        # Strict or minimal filesystem policy limits mounts further
        if policy.filesystem_policy == FilesystemPolicy.STRICT_RO:
            # Mount a dummy empty resolv.conf so no DNS resolution occurs
            cmd.extend(["--tmpfs", "/etc"])
        else:
            # If standard, mount /etc/resolv.conf read-only if present
            if Path("/etc/resolv.conf").exists():
                cmd.extend(["--ro-bind", "/etc/resolv.conf", "/etc/resolv.conf"])

        # 5. Isolated Sandbox Workspace
        workspace_abs = str(sandbox_workspace.resolve())
        cmd.extend([
            "--bind", workspace_abs, "/workspace",
            "--chdir", "/workspace",
        ])

        # 6. Optional Seccomp Filter FD
        if seccomp_bpf_fd is not None:
            cmd.extend(["--seccomp", str(seccomp_bpf_fd)])

        # 7. Target Executable & Arguments
        cmd.extend([interpreter, "-u", f"/workspace/{script_filename}"])
        if extra_args:
            cmd.extend(extra_args)

        return cmd
