#!/usr/bin/env bash
# Pull the latest repo state and reinstall the desktop app if the installed commit is outdated.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
DEST="$HOME/.local/opt/libremetronome"

git -C "$REPO" pull --ff-only
HEAD_REV="$(git -C "$REPO" rev-parse HEAD)"
if [ "$(cat "$DEST/.installed-commit" 2>/dev/null || true)" = "$HEAD_REV" ]; then
  echo "Libre Metronome is up to date ($HEAD_REV)."
else
  "$HERE/install.sh"
fi
