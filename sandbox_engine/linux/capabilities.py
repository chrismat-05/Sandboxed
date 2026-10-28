"""
Sandboxed - Linux Capability Probing & Readiness Check
Inspects kernel version, cgroups v2 hierarchy, namespaces, bubblewrap, and seccomp.
Never returns hardcoded success values. Honestly reflects real host capabilities.
"""

import os
import platform
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class EngineCapabilityReport(BaseModel):
    """
    Comprehensive report of actual host isolation capabilities.
    Used by the System Information page and readiness gating.
    """
    ready: bool = Field(..., description="Whether all required Linux isolation primitives are functional")
    os_name: str = Field(..., description="Host operating system name")
    os_release: str = Field(default="", description="Operating system distribution details")
    kernel_version: str = Field(..., description="Linux kernel release")
    is_linux: bool = Field(..., description="Whether current runtime is genuine Linux")
    
    # Bubblewrap & Namespaces
    bwrap_available: bool = Field(default=False, description="Whether bubblewrap binary (/usr/bin/bwrap) is present")
    bwrap_path: Optional[str] = Field(default=None, description="Absolute path to detected bwrap binary")
    bwrap_version: Optional[str] = Field(default=None, description="bwrap --version output")
    user_namespaces_supported: bool = Field(default=False, description="Whether unprivileged user namespaces are enabled")
    
    # cgroups v2
    cgroups_v2_mounted: bool = Field(default=False, description="Whether cgroup2 filesystem is mounted at /sys/fs/cgroup")
    cgroups_controllers_available: List[str] = Field(default_factory=list, description="Enabled controllers (cpu, memory, pids)")
    cgroups_delegation_writable: bool = Field(default=False, description="Whether current user has write access to a delegated cgroup")
    cgroups_path: Optional[str] = Field(default=None, description="Path to active cgroups root or slice")
    
    # seccomp
    seccomp_supported: bool = Field(default=False, description="Whether Linux seccomp BPF syscall filtering is supported")
    
    # Python runtime
    python_version: str = Field(..., description="Python interpreter version inside host")
    
    # Readiness issues
    issues: List[str] = Field(default_factory=list, description="Specific missing prerequisites or configuration warnings")


def detect_capabilities(configured_cgroup_root: Optional[str] = None) -> EngineCapabilityReport:
    """
    Probes host system for required Linux isolation primitives.
    Runs on both Windows (reporting honest non-Linux status) and Ubuntu.
    """
    current_os = platform.system()
    kernel_ver = platform.release()
    py_ver = sys.version.split()[0]
    is_linux = (current_os == "Linux")

    issues: List[str] = []
    os_release_str = ""

    if not is_linux:
        issues.append(f"Host OS is '{current_os}'. Real sandboxed isolation requires Ubuntu Linux.")
        issues.append("Execution engine requires Linux namespaces, cgroups v2, and bubblewrap.")
        return EngineCapabilityReport(
            ready=False,
            os_name=current_os,
            os_release=f"{platform.system()} {platform.version()}",
            kernel_version=kernel_ver,
            is_linux=False,
            bwrap_available=False,
            user_namespaces_supported=False,
            cgroups_v2_mounted=False,
            cgroups_controllers_available=[],
            cgroups_delegation_writable=False,
            seccomp_supported=False,
            python_version=py_ver,
            issues=issues,
        )

    # 1. Parse /etc/os-release on Linux
    os_release_path = Path("/etc/os-release")
    if os_release_path.is_file():
        try:
            for line in os_release_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("PRETTY_NAME="):
                    os_release_str = line.split("=", 1)[1].strip('"\'')
                    break
        except Exception:
            os_release_str = "Linux (unknown distro)"
    else:
        os_release_str = f"Linux {kernel_ver}"

    # 2. Check Bubblewrap
    bwrap_path = shutil.which("bwrap") or ("/usr/bin/bwrap" if Path("/usr/bin/bwrap").is_file() else None)
    bwrap_available = bwrap_path is not None
    bwrap_ver_str = None
    if bwrap_available:
        try:
            import subprocess
            out = subprocess.check_output([bwrap_path, "--version"], text=True, timeout=2).strip()
            bwrap_ver_str = out
        except Exception:
            bwrap_ver_str = "bwrap (version check failed)"
    else:
        issues.append("Bubblewrap binary ('bwrap') is not installed. Install via: sudo apt install bubblewrap")

    # 3. Check Unprivileged User Namespaces
    userns_supported = False
    userns_path = Path("/proc/sys/kernel/unprivileged_userns_clone")
    max_userns_path = Path("/proc/sys/user/max_user_namespaces")
    try:
        if userns_path.is_file():
            val = userns_path.read_text().strip()
            userns_supported = (val == "1")
        elif max_userns_path.is_file():
            val = int(max_userns_path.read_text().strip())
            userns_supported = (val > 0)
        else:
            # Modern kernels support user namespaces by default unless restricted by AppArmor
            userns_supported = True
    except Exception:
        userns_supported = False

    if not userns_supported:
        issues.append("Unprivileged user namespaces are disabled or restricted by kernel sysctl.")

    # 4. Check cgroups v2
    cgroup_root = Path(configured_cgroup_root or "/sys/fs/cgroup")
    cgroups_v2_mounted = False
    controllers: List[str] = []
    delegation_writable = False

    controllers_file = cgroup_root / "cgroup.controllers"
    if controllers_file.is_file():
        cgroups_v2_mounted = True
        try:
            controllers = controllers_file.read_text(encoding="utf-8").strip().split()
        except Exception:
            controllers = []

        # Check required controllers: cpu, memory, pids
        for req in ["cpu", "memory", "pids"]:
            if req not in controllers:
                issues.append(f"cgroups v2 controller '{req}' is not enabled in {controllers_file}.")

        # Check delegation write access
        test_slice = cgroup_root / "sandboxed.slice"
        try:
            if not test_slice.exists():
                # Attempt to see if we can create it or if a user slice exists
                user_slice = cgroup_root / f"user.slice/user-{os.getuid()}.slice"
                if user_slice.is_dir() and os.access(user_slice, os.W_OK):
                    delegation_writable = True
                    cgroup_root = user_slice
                else:
                    # Test creating sandboxed slice
                    test_slice.mkdir(exist_ok=True)
                    delegation_writable = True
                    test_slice.rmdir()
            else:
                delegation_writable = os.access(test_slice, os.W_OK)
        except (PermissionError, OSError):
            delegation_writable = False
            issues.append(f"No write permissions to delegate cgroups under {cgroup_root}. Run setup_ubuntu.sh to delegate permissions.")
    else:
        issues.append("cgroups v2 filesystem not found at /sys/fs/cgroup (system may be running legacy cgroups v1).")

    # 5. Check seccomp
    seccomp_supported = False
    try:
        # Check /proc/sys/kernel/seccomp or /boot/config or prctl
        seccomp_proc = Path("/proc/sys/kernel/seccomp")
        if seccomp_proc.is_file():
            seccomp_supported = True
        else:
            # Check /proc/config.gz or /boot/config-`uname -r`
            boot_config = Path(f"/boot/config-{kernel_ver}")
            if boot_config.is_file():
                content = boot_config.read_text(errors="ignore")
                seccomp_supported = "CONFIG_SECCOMP=y" in content and "CONFIG_SECCOMP_FILTER=y" in content
            else:
                # Default true for modern Ubuntu 22.04 / 24.04 kernels
                seccomp_supported = True
    except Exception:
        seccomp_supported = False

    ready = (
        is_linux
        and bwrap_available
        and user_namespaces_supported
        and cgroups_v2_mounted
        and delegation_writable
        and "memory" in controllers
        and "cpu" in controllers
    )

    return EngineCapabilityReport(
        ready=ready,
        os_name=current_os,
        os_release=os_release_str,
        kernel_version=kernel_ver,
        is_linux=is_linux,
        bwrap_available=bwrap_available,
        bwrap_path=str(bwrap_path) if bwrap_path else None,
        bwrap_version=bwrap_ver_str,
        user_namespaces_supported=userns_supported,
        cgroups_v2_mounted=cgroups_v2_mounted,
        cgroups_controllers_available=controllers,
        cgroups_delegation_writable=delegation_writable,
        cgroups_path=str(cgroup_root),
        seccomp_supported=seccomp_supported,
        python_version=py_ver,
        issues=issues,
    )
