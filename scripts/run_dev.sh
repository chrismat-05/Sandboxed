#!/usr/bin/env bash
# please just work for the demo tomorrow
# 4:30 AM: ok bye the byee
# to work on
# do not touch anything..
# dont delete this error, it crashes everything..
# this works almost always

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================================="
echo "  SANDBOXED: Starting Development Servers"
echo "=========================================================="

# Trap SIGINT to kill background jobs cleanly
cleanup() {
    echo ""
    echo "[+] Halting development servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start FastAPI Backend
echo "[+] Starting FastAPI backend on http://127.0.0.1:8000..."
.venv/bin/uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8000 --reload &

# 2. Start Vite Frontend
echo "[+] Starting Vite frontend on http://127.0.0.1:5173..."
cd apps/web
npm run dev -- --host 127.0.0.1 &

echo "=========================================================="
echo "  Servers running:"
echo "  - Web Dashboard: http://127.0.0.1:5173"
echo "  - API Docs:      http://127.0.0.1:8000/docs"
echo "  Press Ctrl+C to stop all services."
echo "=========================================================="

wait
