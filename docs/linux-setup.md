# Ubuntu Linux Setup & Deployment Guide

This guide details setting up and running **Sandboxed** on Ubuntu Linux (22.04 LTS or 24.04 LTS) running on bare metal or inside VMware Workstation.

---

## 1. Prerequisites

- **OS**: Ubuntu Linux 22.04 LTS or 24.04 LTS (x86_64)
- **Kernel**: Linux 5.15+ (Linux 6.x recommended)
- **cgroups**: cgroups v2 enabled (default on Ubuntu 22.04+)
- **System Packages**: `bubblewrap`, `libseccomp-dev`, `python3`, `python3-venv`, `nodejs (v20+)`, `npm`

---

## 2. Automated Setup (Recommended)

Run the included idempotent provisioning script:

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/sandboxed.git
cd sandboxed

# 2. Run automated setup with sudo (provisions cgroups v2 delegation, bubblewrap, python venv & builds UI)
sudo ./scripts/setup_ubuntu.sh
```

---

## 3. Manual Step-by-Step Installation

If you prefer configuring the environment manually:

### Step 3.1: Install System Packages
```bash
sudo apt update
sudo apt install -y bubblewrap libseccomp-dev python3 python3-venv python3-pip curl git

# Install Node.js 20+ LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 3.2: Verify and Configure cgroups v2 Delegation
Check that cgroup2 is mounted:
```bash
grep cgroup2 /proc/mounts
# Output: cgroup2 /sys/fs/cgroup cgroup2 rw,nosuid,nodev,noexec,relatime,nsdelegate 0 0
```

Verify available controllers:
```bash
cat /sys/fs/cgroup/cgroup.controllers
# Output must contain: cpu memory pids
```

Enable controller subtree delegation:
```bash
echo "+cpu +memory +pids" | sudo tee /sys/fs/cgroup/cgroup.subtree_control
```

Create delegated slice for your user:
```bash
sudo mkdir -p /sys/fs/cgroup/sandboxed.slice
echo "+cpu +memory +pids" | sudo tee /sys/fs/cgroup/sandboxed.slice/cgroup.subtree_control
sudo chown -R $USER:$USER /sys/fs/cgroup/sandboxed.slice
sudo chmod -R 775 /sys/fs/cgroup/sandboxed.slice
```

Create workspace directory:
```bash
sudo mkdir -p /tmp/sandboxed_storage
sudo chown -R $USER:$USER /tmp/sandboxed_storage
sudo chmod 770 /tmp/sandboxed_storage
```

### Step 3.3: Set Up Python Backend
```bash
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r apps/api/requirements.txt
```

### Step 3.4: Build React Frontend
```bash
cd apps/web
npm install
npm run build
cd ../..
```

---

## 4. Verifying Installation

Run the verification test suite:
```bash
./scripts/verify_linux_sandbox.sh
```

This script:
1. Runs host capability detection.
2. Performs a live bubblewrap namespace container smoke test.
3. Executes the full pytest integration test suite (`test_linux_integration_suite.py`).

---

## 5. Running the Application

### Development Mode (with Live Reloading)
```bash
./scripts/run_dev.sh
```
- Web Dashboard: `http://127.0.0.1:5173`
- REST API Documentation: `http://127.0.0.1:8000/docs`

### Production Mode
```bash
# Run backend daemon
.venv/bin/uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000 &

# Serve frontend build via any static web server (or Vite preview)
cd apps/web && npm run preview -- --host 127.0.0.1 --port 5173
```
