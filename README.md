# Sandboxed: Linux-Based Isolated Program Execution & Monitoring

A Linux-based platform that executes untrusted programs inside isolated environments using **cgroups v2**, **namespaces**, **bubblewrap (`bwrap`)**, and **seccomp BPF**.

---

## Quick Start (Ubuntu Linux)

### 1. Automated Installation & Setup

Clone the repository and run the automated setup script. This installs all system packages (`bubblewrap`, `libseccomp-dev`, `python3-venv`, `nodejs`), configures cgroups v2 delegation (`sandboxed.slice`), initializes the Python virtual environment, installs backend dependencies, and builds the React frontend.

```bash
# Clone the repository
git clone https://github.com/chrismat-05/sandboxed.git
cd sandboxed

# Run automated dependency install and setup (requires sudo for cgroups & apt)
sudo ./scripts/setup_ubuntu.sh
```

---

### 2. Run the Application

Launch both the FastAPI backend and React frontend concurrently:

```bash
./scripts/run_dev.sh
```

Once running, access the services:
- **Web Dashboard**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Interactive API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### 3. Verify Linux Sandbox & Run Tests

Verify host capabilities, run a live bubblewrap smoke test, and execute the full test suite:

```bash
# Run capability probe + bubblewrap smoke test + full integration suite
./scripts/verify_linux_sandbox.sh

# Or run pytest directly
./scripts/run_tests.sh
```

---

## Documentation Links

For in-depth systems documentation and specifications, see:
- [Architecture & State Machine](docs/architecture.md)
- [Security & Threat Model](docs/security-model.md)
- [Ubuntu VM Setup Guide](docs/linux-setup.md)
- [REST API Reference](docs/api-reference.md)
- [Testing & Verification Report](docs/testing.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
- [Academic Project Report](docs/project-report.md)

---

## License

MIT License. See [LICENSE](LICENSE) for details.
