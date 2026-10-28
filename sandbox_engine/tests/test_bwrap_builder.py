"""
Tests for Bubblewrap CLI Argument Builder & Mount Security
"""

from pathlib import Path
from sandbox_engine.policies.models import ExecutionPolicy, FilesystemPolicy
from sandbox_engine.linux.bwrap_builder import BwrapCommandBuilder


def test_bwrap_builder_namespaces_unshared():
    """Verify all critical Linux namespaces are unshared."""
    builder = BwrapCommandBuilder(bwrap_path="/usr/bin/bwrap")
    policy = ExecutionPolicy(id="test", name="Test", network_enabled=False)
    cmd = builder.build_command(
        policy=policy,
        sandbox_workspace=Path("/tmp/test_workspace"),
        script_filename="script.py",
    )

    assert "--unshare-user" in cmd
    assert "--unshare-ipc" in cmd
    assert "--unshare-pid" in cmd
    assert "--unshare-uts" in cmd
    assert "--unshare-cgroup" in cmd
    assert "--unshare-net" in cmd


def test_bwrap_builder_network_toggle():
    """Verify network access flag switches between --share-net and --unshare-net."""
    builder = BwrapCommandBuilder()
    
    # Network disabled (default)
    p_no_net = ExecutionPolicy(id="no_net", name="No Net", network_enabled=False)
    cmd_no_net = builder.build_command(p_no_net, Path("/tmp/ws1"))
    assert "--unshare-net" in cmd_no_net
    assert "--share-net" not in cmd_no_net

    # Network enabled
    p_net = ExecutionPolicy(id="net", name="Net", network_enabled=True)
    cmd_net = builder.build_command(p_net, Path("/tmp/ws2"))
    assert "--share-net" in cmd_net
    assert "--unshare-net" not in cmd_net


def test_bwrap_builder_never_mounts_sensitive_host_paths():
    """Verify builder never binds /home, /root, /etc/shadow, or parent dirs."""
    builder = BwrapCommandBuilder()
    policy = ExecutionPolicy(id="test", name="Test")
    cmd = builder.build_command(policy, Path("/tmp/safe_ws"))

    forbidden = ["/home", "/root", "/etc/shadow", "/var/log"]
    for path in forbidden:
        assert path not in cmd


def test_bwrap_builder_workspace_binding():
    """Verify user workspace is bound to /workspace with chdir."""
    builder = BwrapCommandBuilder()
    policy = ExecutionPolicy(id="test", name="Test")
    ws_path = Path("/tmp/sandboxed_storage/exec_12345")
    cmd = builder.build_command(policy, ws_path)

    # Check that --bind <ws_path> /workspace is present
    bind_idx = cmd.index("--bind")
    assert cmd[bind_idx + 1] == str(ws_path.resolve())
    assert cmd[bind_idx + 2] == "/workspace"

    chdir_idx = cmd.index("--chdir")
    assert cmd[chdir_idx + 1] == "/workspace"


def test_bwrap_builder_process_termination_flags():
    """Verify --die-with-parent and --new-session are always included."""
    builder = BwrapCommandBuilder()
    policy = ExecutionPolicy(id="test", name="Test")
    cmd = builder.build_command(policy, Path("/tmp/ws"))

    assert "--die-with-parent" in cmd
    assert "--new-session" in cmd
    assert "/proc" in cmd
    assert "/dev" in cmd
    assert "/tmp" in cmd
