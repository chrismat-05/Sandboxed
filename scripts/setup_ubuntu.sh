#!/usr/bin/env bash
# ==============================================================================
# Sandboxed - Ubuntu Linux Automated Setup & Capability Provisioning Script
# Prepares namespaces, cgroups v2 controller delegation, bubblewrap, and Python.
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "  SANDBOXED: Ubuntu Linux Deployment & Setup"
echo "=========================================================="

# 1. Verify Root/Sudo Privileges for System Package Installation
if [ "$EUID" -ne 0 ]; then
    echo "[!] Please run setup with sudo to install packages and configure cgroup delegation:"
    echo "    sudo ./scripts/setup_ubuntu.sh"
    exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)

echo "[+] Updating apt package repositories..."
apt-get update -y

echo "[+] Installing core Linux isolation packages and runtime dependencies..."
apt-get install -y \
    bubblewrap \
    libseccomp-dev \
    libseccomp2 \
    python3 \
    python3-venv \
    python3-pip \
    curl \
    git

# 2. Check and Install Node.js if missing
if ! command -v node &> /dev/null; then
    echo "[+] Installing Node.js (LTS) for React frontend build..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "[+] Node.js version: $(node -v)"
echo "[+] Python3 version: $(python3 --version)"
echo "[+] Bubblewrap version: $(bwrap --version)"

# 3. Verify cgroups v2
echo "[+] Verifying cgroups v2 hierarchy..."
if [ ! -f /sys/fs/cgroup/cgroup.controllers ]; then
    echo "[ERROR] cgroups v2 filesystem not detected at /sys/fs/cgroup!"
    echo "        Ensure kernel boot parameter 'systemd.unified_cgroup_hierarchy=1' is set in /etc/default/grub."
    exit 1
fi

echo "[+] Enabled root cgroup controllers: $(cat /sys/fs/cgroup/cgroup.controllers)"

# 4. Enable Controller Subtree Delegation
echo "[+] Enabling +cpu +memory +pids delegation in root cgroup..."
for ctrl in cpu memory pids; do
    if grep -qw "$ctrl" /sys/fs/cgroup/cgroup.controllers; then
        echo "+$ctrl" >> /sys/fs/cgroup/cgroup.subtree_control 2>/dev/null || true
    else
        echo "[WARNING] Controller '$ctrl' not enabled in host kernel!"
    fi
done

# 5. Create sandboxed.slice with delegated permissions to user
SANDBOX_SLICE="/sys/fs/cgroup/sandboxed.slice"
echo "[+] Creating sandboxed.slice at $SANDBOX_SLICE..."
mkdir -p "$SANDBOX_SLICE"
echo "+cpu +memory +pids" > "$SANDBOX_SLICE/cgroup.subtree_control" 2>/dev/null || true
chown -R "$REAL_USER:$REAL_USER" "$SANDBOX_SLICE"
chmod -R 775 "$SANDBOX_SLICE"

# 6. Setup Ephemeral Sandbox Working Directory
STORAGE_DIR="/tmp/sandboxed_storage"
echo "[+] Creating ephemeral workspace root at $STORAGE_DIR..."
mkdir -p "$STORAGE_DIR"
chown -R "$REAL_USER:$REAL_USER" "$STORAGE_DIR"
chmod 770 "$STORAGE_DIR"

# 7. Unprivileged User Namespaces Check
echo "[+] Checking unprivileged user namespace sysctl..."
if [ -f /proc/sys/kernel/unprivileged_userns_clone ]; then
    echo "1" > /proc/sys/kernel/unprivileged_userns_clone
fi

# 8. Setup Python Virtual Environment as the Real User
echo "[+] Setting up Python virtual environment in repository root..."
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sudo -u "$REAL_USER" bash <<EOF
cd "$REPO_ROOT"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r apps/api/requirements.txt

echo "[+] Installing frontend dependencies and building production bundle..."
cd apps/web
npm install
npm run build
EOF

echo "=========================================================="
echo "  [SUCCESS] Sandboxed Ubuntu Environment Setup Complete!"
echo "=========================================================="
echo "Next Steps:"
echo "1. Run verification suite: ./scripts/verify_linux_sandbox.sh"
echo "2. Launch development API & UI: ./scripts/run_dev.sh"
echo "=========================================================="
