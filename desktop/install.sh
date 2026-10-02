#!/usr/bin/env bash
# Build the frontend and install Libre Metronome as a Linux desktop app (no root needed).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
DEST="$HOME/.local/opt/libremetronome"

( cd "$REPO/frontend" && npm ci && PUBLIC_URL=. REACT_APP_BACKEND_URL=app://lm npm run build )
mkdir -p "$DEST"
rm -rf "$DEST/build"
cp -r "$REPO/frontend/build" "$DEST/build"
cp "$HERE/main.js" "$HERE/package.json" "$DEST/"
cp "$REPO/frontend/public/logo512.png" "$DEST/icon.png"
( cd "$DEST" && npm install --omit=dev --no-audit --no-fund && npm install --no-save --no-audit --no-fund electron@^37 )

# electron's own installer silently fails to extract on very new Node versions; fall back to unzip
ensure_electron() {
  local d="$DEST/node_modules/electron"
  [ -x "$d/dist/electron" ] && [ -f "$d/path.txt" ] && return 0
  ( cd "$d" && node install.js ) || true
  if [ ! -x "$d/dist/electron" ]; then
    local z; z="$(ls "$HOME"/.cache/electron/*/electron-v*-linux-x64.zip | tail -1)"
    rm -rf "$d/dist"; unzip -q -o "$z" -d "$d/dist"; printf electron > "$d/path.txt"
  fi
}
ensure_electron

mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/libremetronome.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Libre Metronome
Comment=Open-source metronome
Exec=$DEST/node_modules/.bin/electron $DEST
Icon=$DEST/icon.png
Terminal=false
Categories=AudioVideo;Audio;Music;
StartupWMClass=libremetronome-desktop
DESKTOP
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
echo "Installed. Launch 'Libre Metronome' from the app launcher."
