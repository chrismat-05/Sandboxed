#!/usr/bin/env bash
# ==============================================================================
# Sandboxed - Test Suite Runner
# Runs all pytest unit, API, persistence, and isolation tests.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================================="
echo "  SANDBOXED: Running Pytest Test Suite"
echo "=========================================================="

.venv/bin/pytest -v apps/api/tests sandbox_engine/tests
