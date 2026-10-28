# Sandboxed: Linux-Based Isolated Program Execution & Resource Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Linux: cgroups v2](https://img.shields.io/badge/Kernel-cgroups%20v2%20%7C%20Namespaces-orange.svg)](https://www.kernel.org/)

**Sandboxed** is an Operating Systems and Application Security project designed to execute untrusted and experimental programs inside isolated Linux container environments. By integrating **Linux namespaces**, **cgroups v2 hardware controllers**, **bubblewrap (`bwrap`) containerization**, **seccomp BPF system call filtering**, and **asynchronous process supervision**, Sandboxed allows developers and students to observe program behavior, monitor resource consumption, and compare multi-policy experiments in real time.

---

## 1. Problem Statement & Objectives

Executing experimental or untrusted code directly on a host workstation or server can result in:
- **Uncontrolled resource consumption** (CPU monopolization, OOM crashes, fork-bombs).
- **Filesystem compromise** (unauthorized access to `/etc/shadow`, user home directories, SSH keys).
- **Network egress** (exfiltration or unauthorized socket connections).
- **Opaque execution behavior** (insufficient visibility into execution duration, user vs kernel time, and peak memory).

### Key Objectives
1. **Isolated Execution**: Execute programs inside lightweight, least-privilege bubblewrap containers.
2. **Resource Boundaries**: Enforce hard memory caps (`memory.max`), CFS CPU throttling (`cpu.max`), process count limits (`pids.max`), and high-resolution wall-clock timeouts.
3. **Restricted Filesystem & Network**: Deny network access by default (`--unshare-net`) and restrict container mounts to read-only system libraries.
4. **Behavioral Telemetry**: Measure physical peak memory, CPU time, exit codes, and cgroups events without fabricating data.
5. **Interactive Policy Lab**: Run comparative benchmarks of identical code across distinct policies (e.g. 128MB vs 32MB RAM, 50% vs 20% CPU quota) with real-time comparative visualizations.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, CodeMirror (Python editor), Recharts, Lucide Icons.
- **Backend API**: Python 3.10+, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy.
- **Persistence**: SQLite relational database (`sandboxed.db`).
- **Linux Execution Engine**:
  - **Namespaces**: PID, Mount, Network, User, UTS, IPC via `bwrap`.
  - **Resource Enforcement**: cgroups v2 (`/sys/fs/cgroup/sandboxed.slice`).
  - **Syscall Filtering**: Seccomp BPF policy interception.
  - **Process Supervision**: Monotonic watchdog, process group leadership (`setsid`), signal escalation (`SIGTERM` $\rightarrow$ `SIGKILL`), non-blocking bounded output pipes.
- **Testing**: Pytest, Pytest-Asyncio, HTTPX TestClient.

---

## 3. Repository Structure

```
Sandboxed/
├── apps/
│   ├── web/                     # React + Vite Developer Dashboard
│   │   ├── src/
│   │   │   ├── components/      # UI components
│   │   │   ├── layouts/         # AppLayout with sidebar and host diagnostics
│   │   │   ├── pages/           # Overview, Playground, Executions, PolicyLab, Policies, SystemInfo, Settings
│   │   │   ├── services/        # Centralized REST API client
│   │   │   └── styles/          # Tailwind CSS global tokens
│   │   ├── package.json
│   │   └── vite.config.js
│   └── api/                     # FastAPI Backend Application
│       ├── app/
│       │   ├── api/             # REST Routers: health, system, dashboard, policies, executions, experiments
│       │   ├── core/            # Configuration and environment settings
│       │   ├── models/          # SQLAlchemy persistence entities
│       │   ├── repositories/    # Database query abstractions
│       │   ├── schemas/         # Pydantic request and response models
│       │   ├── services/        # Business logic coordinators
│       │   └── main.py          # Application entry point & lifespan manager
│       ├── requirements.txt
│       └── tests/               # Unit, API, and persistence test suites
├── sandbox_engine/              # Core Linux Isolation & Monitoring Library
│   ├── linux/                   # Capabilities probe, bwrap builder, cgroups v2, supervisor, seccomp
│   ├── manager/                 # Asynchronous job queue & lifecycle state machine
│   ├── monitoring/              # cgroups v2 resource metrics collector
│   ├── policies/                # Execution policy schemas, presets, and safe test workloads
│   └── tests/                   # Engine unit tests & Linux integration suite
├── scripts/
│   ├── setup_ubuntu.sh          # Idempotent automated Ubuntu setup script
│   ├── verify_linux_sandbox.sh  # Live Linux capability & isolation verification script
│   ├── run_dev.sh               # Concurrent development runner (API + Web)
│   └── run_tests.sh             # Pytest test suite runner
├── docs/
│   ├── architecture.md          # Architectural diagrams, state machine, and data flow
│   ├── security-model.md        # Threat model, containment layers, and risk analysis
│   ├── linux-setup.md           # Step-by-step Ubuntu VM installation guide
│   ├── api-reference.md         # Documented REST API endpoints and schemas
│   ├── testing.md               # Test inventory, Windows results, and pending Linux tests
│   ├── troubleshooting.md       # Diagnostic guide for common errors
│   └── project-report.md        # Comprehensive academic project report draft
├── .env.example
├── .gitignore
├── LICENSE                      # MIT License
├── pytest.ini
└── README.md
```

---

## 4. Ubuntu Linux Setup & Installation

The intended target runtime is Ubuntu Linux 22.04 LTS or 24.04 LTS (bare-metal or VMware Workstation).

### Automated Setup
```bash
# 1. Clone repository
git clone https://github.com/<your-username>/sandboxed.git
cd sandboxed

# 2. Run automated setup script (installs bubblewrap, configures cgroups v2 delegation, sets up python venv & builds UI)
sudo ./scripts/setup_ubuntu.sh
```

### Verifying Linux Isolation Primitives
```bash
./scripts/verify_linux_sandbox.sh
```

This verification script:
1. Runs host capability detection for namespaces, cgroups v2, and bubblewrap.
2. Performs a live bubblewrap namespace container smoke test.
3. Executes the full pytest integration test suite (`test_linux_integration_suite.py`).

---

## 5. Running the Application

### Development Servers (Backend + Frontend)
```bash
./scripts/run_dev.sh
```
- **Web Dashboard**: `http://127.0.0.1:5173`
- **Interactive OpenAPI Docs**: `http://127.0.0.1:8000/docs`

---

## 6. Testing Strategy & Status

Testing is structured into two verifiable phases:

### Phase 1: Windows Development Checks (Completed)
- **Pytest Unit & API Suite**: **43 PASSED, 0 FAILED** (10 Linux integration tests intentionally skipped via `@pytest.mark.skipif(sys.platform != 'linux')`).
- **Frontend Production Build**: **PASSED** (`npm run build` succeeded cleanly with Vite).
- **Capability Probe Integrity**: **PASSED** (honestly detects Windows and non-Linux environment without faking readiness).

### Phase 2: Ubuntu Linux Integration Checks (Pending Execution in VM)
- Test cases covering physical cgroups v2 OOM killing, CFS CPU quota throttling, deadline timeout SIGKILL escalation, `/etc/shadow` mount isolation, and network egress blocking are implemented in `sandbox_engine/tests/test_linux_integration_suite.py` and ready for execution.

---

## 7. Security Architecture

1. **Least Privilege**: Submitted code executes under an unprivileged user namespace; never runs as root.
2. **Deny by Default**: Network access is disabled by default (`--unshare-net`).
3. **Mount Protection**: Root container is mounted read-only (`/usr`, `/lib`, `/bin`). Sensitive host files (`/etc/shadow`, `/root`, `~/.ssh`) are omitted.
4. **Hardware Quotas**: Limits are applied directly to the kernel via cgroups v2 before execution commences.
5. **Bounded Telemetry**: Standard output and error buffers are bounded to $64\text{ KB}$ to prevent pipe deadlocks and memory exhaustion.

*(For detailed threat modeling and risk analysis, see `docs/security-model.md`.)*

---

## 8. License

This project is licensed under the [MIT License](LICENSE).
