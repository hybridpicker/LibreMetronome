#!/bin/bash
# Single entry point for tests, lint and type checks.
#
#   ./run_tests.sh             backend + frontend: lint, types, tests (default)
#   ./run_tests.sh backend     backend only
#   ./run_tests.sh frontend    frontend only
#   ./run_tests.sh coverage    like default, with coverage reports and gates
#   ./run_tests.sh help-system the original three help-system suites
#
# Backend tools come from the repository's .venv (see backend/requirements-dev.txt).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-all}"
if [ -x "$ROOT/.venv/bin/python" ]; then DEFAULT_PYTHON="$ROOT/.venv/bin/python"; else DEFAULT_PYTHON="python3"; fi
PYTHON="${PYTHON:-$DEFAULT_PYTHON}"
export SECRET_KEY="${SECRET_KEY:-test-only-secret-key}"
export DJANGO_SETTINGS_MODULE="libremetronome_backend.test_settings"

run_backend() {
  local with_coverage="$1"
  echo "== backend: ruff, mypy, bandit =="
  (
    cd "$ROOT/backend"
    "$PYTHON" -m ruff check .
    "$PYTHON" -m ruff format --check .
    "$PYTHON" -m mypy .
    "$PYTHON" -m bandit -c pyproject.toml -q -r .
  )
  echo "== backend: tests =="
  (
    cd "$ROOT/backend"
    if [ "$with_coverage" = "yes" ]; then
      "$PYTHON" -m coverage run manage.py test
      "$PYTHON" -m coverage report --fail-under=100
      echo "== backend: dependency audit =="
      "$PYTHON" -m pip_audit -r "$ROOT/requirements.txt"
    else
      "$PYTHON" manage.py test
    fi
  )
}

run_frontend() {
  local with_coverage="$1"
  cd "$ROOT/frontend"
  echo "== frontend: eslint =="
  npm run --silent lint
  echo "== frontend: tests =="
  if [ "$with_coverage" = "yes" ]; then
    npm run --silent coverage
    echo "== frontend: dependency audit (shipped code) =="
    npm audit --omit=dev
  else
    npm run --silent test:ci
  fi
}

case "$MODE" in
  all)        run_backend no;  run_frontend no ;;
  backend)    run_backend no ;;
  frontend)   run_frontend no ;;
  coverage)   run_backend yes; run_frontend yes ;;
  help-system)
    cd "$ROOT/frontend"
    CI=true npx react-scripts test --watchAll=false \
      src/tests/components/HelpButton.test.jsx \
      src/tests/useKeyboardShortcuts.test.js \
      src/tests/components/HelpSystemIntegration.test.jsx
    ;;
  *) echo "Unknown mode: $MODE" >&2; exit 2 ;;
esac
