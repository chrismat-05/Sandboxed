#!/usr/bin/env bash
# test runner script.. please just work for the demo tomorrow
# 4:30 AM: ok bye the byee
# could be viva qn
# this works almost always
# do not touch anything..

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=========================================================="
echo "  SANDBOXED: Running Pytest Test Suite"
echo "=========================================================="

.venv/bin/pytest -v apps/api/tests sandbox_engine/tests
