#!/usr/bin/env bash
# Boot the Dr. Heidi replay viewer.
# - Uses .venv-new (created in webui setup; the original .venv had a stale shebang).
# - Serves frontend from webui/frontend/dist and the API from /api/*.
# - Opens the default browser to http://127.0.0.1:8765.

set -euo pipefail

# Resolve symlinks so that running ./run.sh (a symlink to webui/scripts/run.sh) still finds the repo root.
SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "${SCRIPT_PATH}" ]; do
  SCRIPT_PATH="$(readlink "${SCRIPT_PATH}")"
  case "${SCRIPT_PATH}" in
    /*) ;;
    *)  SCRIPT_PATH="$(dirname "${BASH_SOURCE[0]}")/${SCRIPT_PATH}" ;;
  esac
done
ROOT="$(cd "$(dirname "${SCRIPT_PATH}")/../.." && pwd)"
PYTHON="${ROOT}/.venv-new/bin/python"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8765}"

if [ ! -x "${PYTHON}" ]; then
  echo "error: ${PYTHON} not found"
  echo "run:   python3 -m venv .venv-new && .venv-new/bin/pip install -e webui/backend"
  exit 1
fi

cd "${ROOT}"

# Open browser after a short delay (in background)
( sleep 1.2 && \
  if command -v open >/dev/null 2>&1; then
    open "http://${HOST}:${PORT}/"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://${HOST}:${PORT}/"
  fi
) &

echo "Dr. Heidi replay viewer starting on http://${HOST}:${PORT}/"
echo "Ctrl-C to stop."
exec "${PYTHON}" -m uvicorn dr_heidi_webui.app:app \
  --app-dir webui/backend \
  --host "${HOST}" --port "${PORT}" --log-level warning
