#!/usr/bin/env bash
# ==============================================================================
# Sandboxed - Linux Sandbox Verification & Diagnostics Suite
# Executes capability probes, tests bubblewrap isolation, and runs pytest suite.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================================="
echo "  SANDBOXED: Linux Verification & Isolation Checks"
echo "=========================================================="

# 1. Check Python Venv
if [ ! -f ".venv/bin/python" ]; then
    echo "[ERROR] Virtualenv not found at .venv. Run ./scripts/setup_ubuntu.sh first."
    exit 1
fi

echo "[+] 1. Running Host Isolation Capability Probe..."
.venv/bin/python -c "
from sandbox_engine.linux.capabilities import detect_capabilities
import json
report = detect_capabilities()
print(f'Kernel: {report.kernel_version}')
print(f'Bubblewrap Available: {report.bwrap_available}')
print(f'cgroups v2 Mounted: {report.cgroups_v2_mounted}')
print(f'cgroups Controllers: {report.cgroups_controllers_available}')
print(f'User Delegation Writable: {report.cgroups_delegation_writable}')
print(f'Seccomp Supported: {report.seccomp_supported}')
print(f'Engine Ready: {report.ready}')
if report.issues:
    print('Issues:')
    for issue in report.issues:
        print(f' - {issue}')
if not report.ready:
    exit(1)
"

echo ""
echo "[+] 2. Executing Bubblewrap Smoke Test..."
bwrap \
    --unshare-all \
    --unshare-net \
    --ro-bind /usr /usr \
    --ro-bind /lib /lib \
    --ro-bind /bin /bin \
    --proc /proc \
    --dev /dev \
    --tmpfs /tmp \
    python3 -c "print('>> Bubblewrap container smoke test SUCCESSFUL <<')"

echo ""
echo "[+] 3. Executing Full Pytest Suite (Unit + Linux Integration)..."
.venv/bin/pytest -v -s

echo "=========================================================="
echo "  [ALL CHECKS PASSED] Sandboxed Engine Operational!"
echo "=========================================================="
