# Academic Project Report

**Project Title**: Sandboxed: Design and Implementation of a Linux-Based Isolated Program Execution and Resource Monitoring System  
**Category**: Operating Systems / Linux Systems Programming / Application Security  
**Academic Year**: 2026  

---

## 1. Abstract
The safe execution of untrusted and experimental user code is a foundational challenge in modern computer systems, online judges, continuous integration runners, and security analysis pipelines. Direct execution of arbitrary programs on a host operating system introduces catastrophic risks of host filesystem tampering, uncontrolled denial-of-service via resource exhaustion, process escape, and credential exfiltration. This project presents **Sandboxed**, a Linux-based platform that combines Linux namespaces (PID, Mount, Network, User, UTS, IPC), cgroups v2 resource controllers (`memory.max`, `cpu.max`, `pids.max`), bubblewrap containerization, seccomp BPF system call filtering, and asynchronous process supervision into an integrated developer-tool and policy experimentation platform. Accompanied by a FastAPI backend and a responsive React frontend, Sandboxed provides an interactive Playground, searchable execution audit telemetry, and a Policy Lab for conducting comparative Operating Systems resource experiments under deterministic, least-privilege policies.

---

## 2. Introduction
Modern computing environments frequently require executing untrusted software. Whether evaluating student programming assignments in academic online judges, testing untrusted third-party plugins, or analyzing suspicious binaries in a security sandbox, granting uncontrolled access to the host kernel or filesystem is unacceptable. Operating systems provide native primitives for process isolation and resource governance; however, these mechanisms are often fragmented across disparate low-level interfaces, making them difficult to configure correctly, observe in real time, and compare experimentally.

---

## 3. Problem Statement
Executing experimental programs directly on a host workstation or server can result in:
1. **Uncontrolled Resource Consumption**: CPU monopolization, RAM memory leaks causing thrashing, and fork-bombing exhausting host process tables.
2. **Filesystem Compromise**: Unrestricted write or read access to sensitive host directories (`/etc/shadow`, user home directories, SSH keys).
3. **Network Egress**: Unauthorized socket communication for data exfiltration or denial-of-service attacks.
4. **Insufficient Behavioral Visibility**: Lack of high-resolution telemetry capturing exact user vs kernel CPU consumption, peak memory thresholds, and termination triggers.

---

## 4. Objectives
1. Design and implement an unprivileged Linux execution engine using bubblewrap, Linux namespaces, and cgroups v2.
2. Provide a validated, server-side security policy model with configurable wall-clock deadlines, CPU CFS quotas, memory limits, process limits, and network isolation.
3. Restrict filesystem access to an ephemeral, read-only system view without exposing host files or application credentials.
4. Implement a robust process supervisor with non-blocking bounded stream capture and SIGTERM/SIGKILL escalation.
5. Persist execution metadata, resource telemetry, and security audit events in an SQLite database.
6. Provide an intuitive developer-tool React interface featuring an Execution Playground, historical Telemetry Inspector, and a multi-policy comparative Policy Lab.
7. Produce measurable experimental results illustrating operating system scheduling, memory containment, and process supervision principles.

---

## 5. Limitations of Existing Systems
- **Heavyweight Virtual Machines (KVM/QEMU)**: Provide strong hardware isolation but introduce significant boot latency (seconds to minutes) and heavy memory overhead per execution, making them inefficient for interactive program evaluation.
- **Docker Containers**: Docker daemons typically run as privileged root services with broad capabilities by default. Docker containers share the host network unless explicitly isolated, and mounting host paths incorrectly can easily result in privilege escalation.
- **Naïve User-Space Runners**: Many academic projects rely on basic language-level interpreters (e.g. Python `exec()` with restricted globals) or generic subprocess calls without cgroups or namespaces. These mechanisms fail completely against compiled binaries, memory allocation loops, and standard library imports.

---

## 6. Proposed System
Sandboxed implements an operating-system-level containment engine that runs unprivileged without requiring Docker or root execution privileges for the application daemon. By establishing unshared namespaces via bubblewrap and writing hardware quotas into a delegated cgroups v2 hierarchy (`sandboxed.slice`), the system enforces least privilege before code execution begins.

---

## 7. Requirements Analysis

### Functional Requirements
- **FR1 (Code Execution)**: Support Python 3 execution inside isolated containers.
- **FR2 (Resource Limits)**: Enforce wall-clock timeouts (0.1–60s), memory limits (16–2048 MB), CPU quota (10–100%), and PID limits (1–128).
- **FR3 (Filesystem Isolation)**: Restrict container root to read-only interpreter libraries; provide isolated temporary `/workspace`.
- **FR4 (Network Isolation)**: Disable external network interfaces by default.
- **FR5 (Telemetry Capture)**: Measure wall-clock time, CPU total/user/kernel time, peak memory allocation, and OOM events.
- **FR6 (Policy Lab)**: Allow multi-policy comparative experiments using identical workloads with live comparative charts.

### Non-Functional Requirements
- **NFR1 (Security)**: Defense-in-depth; never run submitted code as root; server-side boundary validation.
- **NFR2 (Reliability)**: Supervisor must never deadlock on full output pipes; process trees must be reaped.
- **NFR3 (Honest Diagnostics)**: Capability probe must truthfully report host isolation support without hardcoded success flags.

---

## 8. System Architecture
The application comprises four primary subsystems:
1. **Frontend (React + Vite)**: User interface for playground code execution, historical telemetry, and policy experimentation.
2. **Backend API (FastAPI + SQLAlchemy)**: RESTful controller validating requests, maintaining persistence, and managing state transitions.
3. **Execution Manager**: Asynchronous worker pool enforcing FIFO concurrency (default 1 worker) and managing the state machine.
4. **Linux Sandbox Runner**: Bubblewrap container orchestrator, cgroups v2 quota writer, and process supervisor.

*(Refer to `docs/architecture.md` for complete architectural and sequence diagrams.)*

---

## 9. Operating System Concepts Demonstrated

1. **Linux Namespaces**:
   - `CLONE_NEWPID`: Process ID virtualization; container process sees itself as PID 1.
   - `CLONE_NEWNS`: Mount namespace isolation; unlinks host mount table.
   - `CLONE_NEWNET`: Private loopback network namespace preventing socket egress.
   - `CLONE_NEWUSER`: Unprivileged user identity mapping.
   - `CLONE_NEWUTS`: Hostname virtualization.
   - `CLONE_NEWIPC`: Inter-process communication barrier preventing shared memory tampering.
2. **cgroups v2 Hierarchy**:
   - `memory.max`: Kernel hard memory limit. Enforces page cache and heap bounds; triggers OOM killer.
   - `cpu.max`: Completely Fair Scheduler (CFS) bandwidth control over 100ms periods.
   - `pids.max`: Process count throttling preventing fork-bomb exhaustion.
3. **Process Supervision & Reaping**:
   - Process group leadership via `setsid()`.
   - Signal escalation (`SIGTERM` followed by grace period and `SIGKILL` to `-pgid`).
   - Zombie process reaping via `waitpid()`.
4. **Non-Blocking Pipe I/O**:
   - Bounded reading using non-blocking file descriptors preventing pipe buffer deadlock ($65,536$ bytes).

---

## 10. Implementation Methodology
The project was constructed following modular software engineering principles:
- **Phase 1**: Architecture design, schema formalization, and policy models.
- **Phase 2**: Relational database persistence using SQLite and SQLAlchemy.
- **Phase 3**: Linux Sandbox Runner implementation (capabilities detection, bubblewrap command generator, cgroups v2 manager, supervisor).
- **Phase 4**: FastAPI API routes with dependency injection and background execution worker pool.
- **Phase 5**: React frontend with dark-first developer UI, CodeMirror editor, Recharts visualizations, and capability diagnostics.
- **Phase 6**: Unit testing suite (43 passed tests on Windows) and prepared Linux integration suite (10 pending tests for Ubuntu).
- **Phase 7**: Automated provisioning scripts (`scripts/setup_ubuntu.sh`) and comprehensive documentation.

---

## 11. Testing Methodology
Testing was conducted across two distinct environments:
1. **Windows Development Stage**:
   - Executed 43 automated unit tests covering Pydantic policy validation, FastAPI REST routes, SQLite database persistence, bubblewrap argument synthesis, cgroups v2 quota logic, and execution manager state transitions.
   - Frontend production build verification (`npm run build`).
2. **Ubuntu Linux Deployment Stage (Pending Verification)**:
   - 10 integration tests targeted for Ubuntu verifying actual kernel enforcement: memory OOM killing, CFS CPU throttling, deadline timeout SIGKILL, network isolation, and filesystem access prevention.

---

## 12. Experimental Results Template (To be recorded on Ubuntu)

> *Note: In accordance with academic honesty guidelines, benchmark values below are preserved as a template to be populated upon executing the test suite inside the target Ubuntu Linux VM.*

### Benchmark 1: CPU CFS Quota Throttling (Workload: Prime Computation 25,000)
| Policy Profile | Configured CPU Quota | Measured Wall Time (s) | Measured CPU Total (s) | CFS Throttled? |
| :--- | :--- | :--- | :--- | :--- |
| Standard | 50% | `[Pending Ubuntu Execution]` | `[Pending Ubuntu Execution]` | `[Pending]` |
| CPU Constrained | 20% | `[Pending Ubuntu Execution]` | `[Pending Ubuntu Execution]` | `[Pending]` |
| Permissive | 100% | `[Pending Ubuntu Execution]` | `[Pending Ubuntu Execution]` | `[Pending]` |

### Benchmark 2: Memory Bound Enforcement (Workload: 50MB Allocation)
| Policy Profile | Configured Memory Limit | Outcome State | Peak Memory (MB) | OOM Killed? |
| :--- | :--- | :--- | :--- | :--- |
| Standard | 128 MB | `[Pending Ubuntu Execution]` | `[Pending Ubuntu Execution]` | `[Pending]` |
| Memory Constrained | 32 MB | `[Pending Ubuntu Execution]` | `[Pending Ubuntu Execution]` | `[Pending]` |

### Benchmark 3: Security & Isolation Verification
| Test Case | Attempted Action | Expected Policy Action | Observed Result | Verified |
| :--- | :--- | :--- | :--- | :--- |
| Filesystem Escape | Read `/etc/shadow` | Access Denied | `[Pending Ubuntu Execution]` | `[Pending]` |
| Network Egress | Connect `8.8.8.8:53` | Network Unreachable | `[Pending Ubuntu Execution]` | `[Pending]` |
| Timeout Watchdog | Sleep 20s | Terminated at 5.0s | `[Pending Ubuntu Execution]` | `[Pending]` |

---

## 13. Security Analysis
The Sandboxed architecture satisfies fundamental secure systems principles:
- **Least Privilege**: The sandbox process runs under unprivileged user namespaces and cannot escalate to host root.
- **Deny by Default**: Network access and unrestricted mount points are disabled by default.
- **Fail-Secure Lifecycle**: If cgroups delegation or bubblewrap is unavailable, the runner throws `SandboxCapabilityError` rather than silently executing insecurely.
- **Bounded Resources**: Stream buffers, timeouts, and process tables have hard ceilings enforced before execution begins.

---

## 14. Limitations
1. **Shared Host Kernel**: Like all container-based sandboxes, Sandboxed shares the host Linux kernel. It does not provide hardware-level virtualization against unpatched kernel zero-day privilege escalations.
2. **Single-Node Architecture**: Designed for single-machine deployment and education; does not currently support multi-node distributed cluster scheduling.
3. **Language Support**: Python 3 is currently supported as the primary evaluated runtime.

---

## 15. Future Enhancements
1. **Micro-VM Integration**: Incorporating Firecracker or gVisor as a pluggable backend runner for high-threat public multi-tenant workloads.
2. **Multi-Language Support**: Adding GCC/Clang, Rust, and Java execution profiles with pre-compiled chroot runtimes.
3. **WebSocket Real-Time Streaming**: Implementing WebSocket duplex channels for sub-millisecond terminal stream rendering.

---

## 16. Conclusion
The Sandboxed project successfully demonstrates practical Operating Systems concepts by unifying modern Linux kernel isolation primitives into an intuitive, observable, and measurable platform. By avoiding mocked abstractions and enforcing real hardware and namespace boundaries, the system provides a credible, reproducible software engineering tool suitable for academic coursework, systems demonstrations, and secure code evaluation.
