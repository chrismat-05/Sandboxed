# Sandboxed Security & Threat Model

## 1. Threat Assumptions & Assets

Sandboxed operates under the principle that submitted code may be buggy, malicious, or intentionally designed to achieve privilege escalation, host denial-of-service, or data exfiltration.

### Protected Assets
1. **Host Filesystem**: Critical host credentials, `/etc/shadow`, `/root`, user home directories (`~/.ssh`), and application source code.
2. **Host Hardware Resources**: Uncontrolled CPU utilization, physical RAM exhaustion, fork-bombing PID exhaustion, and disk filling.
3. **Network Egress**: Unauthorized outbound TCP/UDP connections to internal LAN assets or external botnet C2 servers.
4. **Host Kernel Stability**: Kernel manipulation via unprivileged system calls, module loading, or memory tracing.

---

## 2. Defence-in-Depth Containment Model

Sandboxed applies multi-layered containment where each layer defends independently:

| Layer | Operating System Primitive | Sandboxed Enforcement |
| :--- | :--- | :--- |
| **User Identity** | Unprivileged User | Target code runs as an unprivileged UID inside user namespace. Never executes as `root`. |
| **Filesystem Isolation** | Mount Namespaces (`bwrap`) | Only read-only system libraries (`/usr`, `/lib`, `/bin`) are visible. `/root`, `/home`, `/etc/shadow` are absent. Workspace is temporary. |
| **Network Isolation** | Network Namespace (`--unshare-net`) | The sandbox shares only a private loopback device. External interfaces (`eth0`, `wlan0`) do not exist inside container. |
| **Process Boundaries** | PID Namespaces (`--unshare-pid`) | The target process sees only PID 1 (itself and children). Cannot observe or signal host processes. |
| **Memory Boundaries** | cgroups v2 (`memory.max`) | Hard ceiling enforced directly by the kernel. Exceeding triggers immediate kernel OOM killer. |
| **CPU Quotas** | cgroups v2 (`cpu.max`) | Completely throttled via Linux Completely Fair Scheduler (CFS). Enforces bandwidth quota per 100ms period. |
| **Process Limits** | cgroups v2 (`pids.max`) | Fork-bombs are prevented from allocating beyond the configured maximum processes (e.g. 32). |
| **Syscall Filtering** | Seccomp BPF | Intercepts and rejects dangerous administrative syscalls (`ptrace`, `bpf`, `mount`, `reboot`, `init_module`). |
| **Bounded Streams** | Non-blocking I/O Read | Captured stdout/stderr bounded to a strict byte limit (`max_output_bytes`), preventing pipe buffer deadlocks. |

---

## 3. Threat Scenarios & Mitigations

### 3.1 Host Filesystem Access Attempt
- **Attack**: Script attempts to read `/etc/shadow` or `~/.ssh/id_rsa`.
- **Mitigation**: Bubblewrap mount namespace does not bind these directories. Access results in `FileNotFoundError` or `PermissionError`. Verified in `BuiltinWorkload: file_escape_attempt`.

### 3.2 Network Exfiltration Attempt
- **Attack**: Script opens socket to external IP `8.8.8.8:53`.
- **Mitigation**: `--unshare-net` creates an isolated network namespace without default routes. Sockets fail immediately with `ENETUNREACH`. Verified in `BuiltinWorkload: network_attempt`.

### 3.3 Resource Exhaustion (Memory Leak / Fork Bomb)
- **Attack**: Script continuously allocates memory in loop or calls `fork()`.
- **Mitigation**: `memory.max` triggers kernel OOM termination. `pids.max` rejects subsequent `clone()` / `fork()` calls with `EAGAIN`.

### 3.4 Infinite Execution Loop
- **Attack**: Script executes `while True: pass`.
- **Mitigation**: Process supervisor monotonic timer watchdog triggers SIGTERM escalation to SIGKILL against the process group (`os.killpg`). Status transitions to `TIMED_OUT`.

---

## 4. Residual Risks & Future VM Boundary

Because Linux namespaces and cgroups share the host kernel, vulnerability to zero-day kernel exploits (e.g., privilege escalation bugs in kernel page fault handlers or netfilter) remains a known theoretical residual risk of containerized sandboxes.

For untrusted multi-tenant public environments, future enhancements should introduce micro-VM isolation boundaries (e.g., Firecracker or gVisor) on top of the Linux execution manager.
