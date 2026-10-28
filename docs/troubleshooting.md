# Sandboxed Troubleshooting & Diagnostic Guide

This guide covers common errors encountered when configuring and running Sandboxed on Linux.

---

## 1. Capability Probe Failures

### Symptom: `Host OS is 'Windows'`
- **Cause**: Sandboxed relies on Linux kernel namespaces (`clone(NEWNS|NEWPID|NEWNET)`), cgroups v2, and seccomp BPF.
- **Remedy**: Push the repository to GitHub, clone on an Ubuntu 22.04/24.04 VM (VMware Workstation), and run `./scripts/setup_ubuntu.sh`.

### Symptom: `Bubblewrap binary ('bwrap') is not installed`
- **Cause**: Bubblewrap package is missing.
- **Remedy**:
  ```bash
  sudo apt-get install -y bubblewrap
  ```

### Symptom: `cgroups v2 controller 'cpu' or 'memory' is not enabled`
- **Cause**: Root cgroup has not enabled controller subtree delegation.
- **Remedy**:
  ```bash
  echo "+cpu +memory +pids" | sudo tee /sys/fs/cgroup/cgroup.subtree_control
  ```

### Symptom: `No write permissions to delegate cgroups under /sys/fs/cgroup`
- **Cause**: The user running Sandboxed does not own the delegated slice.
- **Remedy**:
  ```bash
  sudo mkdir -p /sys/fs/cgroup/sandboxed.slice
  echo "+cpu +memory +pids" | sudo tee /sys/fs/cgroup/sandboxed.slice/cgroup.subtree_control
  sudo chown -R $USER:$USER /sys/fs/cgroup/sandboxed.slice
  sudo chmod -R 775 /sys/fs/cgroup/sandboxed.slice
  ```

---

## 2. Execution Runtime Issues

### Symptom: Process times out and returns `TIMED_OUT`
- **Cause**: Monotonic supervisor timer detected execution exceeded `policy.wall_time_limit_sec`.
- **Expected Behavior**: Supervisor escalates `SIGTERM` $\rightarrow$ `SIGKILL` to the process group. If this is unexpected for your workload, increase `wall_time_limit_sec` in the policy profile.

### Symptom: Process killed with `RESOURCE_LIMIT_EXCEEDED`
- **Cause**: Physical memory exceeded `policy.memory_limit_mb`. The Linux kernel OOM killer was invoked.
- **Remedy**: Check peak memory in telemetry. If the workload legitimately requires more RAM, choose a less restrictive policy (e.g. `permissive`).

### Symptom: Outbound network call fails with `ENETUNREACH`
- **Cause**: `network_enabled` is `false` by default, activating `--unshare-net`.
- **Expected Behavior**: Confirms network namespace isolation is functioning. If network egress is explicitly required for an experiment, enable `network_enabled` on the policy.

---

## 3. Database & Port Conflicts

### Port 8000 (API) or Port 5173 (Web) already in use:
```bash
# Check process holding port 8000
sudo lsof -i :8000
# Kill process
kill -9 <PID>
```
