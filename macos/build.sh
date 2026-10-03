#!/usr/bin/env bash
# Builds LibreMetronome.app for macOS from the shared React frontend.
#
# Usage: macos/build.sh [--skip-web] [--debug] [--install] [--dock] [--sign IDENTITY]
#
#   --skip-web       reuse the existing frontend/build instead of rebuilding it
#   --debug          unoptimized native-arch build with the Web Inspector enabled
#   --install        copy the app to /Applications (quits a running instance)
#   --dock           add the installed app to the Dock if it is not there yet
#   --sign IDENTITY  code signing identity (default: ad-hoc "-")
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MACOS="$ROOT/macos"
FRONTEND="$ROOT/frontend"
OUT="$MACOS/build"
APP="$OUT/LibreMetronome.app"
INSTALL_PATH="/Applications/LibreMetronome.app"
BUNDLE_ID="com.hybridpicker.libremetronome"
MIN_MACOS="14.0"

skip_web=false
debug=false
install=false
dock=false
identity="-"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-web) skip_web=true ;;
    --debug) debug=true ;;
    --install) install=true ;;
    --dock) dock=true ;;
    --sign) identity="$2"; shift ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

# The Command Line Tools ship an older Swift; prefer a full Xcode when the
# active developer directory does not provide the macOS 14 SDK.
if [[ -z "${DEVELOPER_DIR:-}" && "$(xcode-select -p)" == *CommandLineTools* && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi

step() { printf '\n==> %s\n' "$1"; }

if ! $skip_web; then
  step "Building web bundle"
  (cd "$FRONTEND" && npm run build)
fi
[[ -f "$FRONTEND/build/index.html" ]] || { echo "frontend/build/index.html missing" >&2; exit 1; }

step "Compiling native shell"
mkdir -p "$OUT/obj"
sources=("$MACOS"/Sources/*.swift)
if $debug; then
  arch="$(uname -m)"
  xcrun --sdk macosx swiftc -swift-version 5 -Onone -g -D DEBUG \
    -target "$arch-apple-macos$MIN_MACOS" -o "$OUT/obj/LibreMetronome" "${sources[@]}"
else
  for arch in arm64 x86_64; do
    xcrun --sdk macosx swiftc -swift-version 5 -O \
      -target "$arch-apple-macos$MIN_MACOS" -o "$OUT/obj/LibreMetronome-$arch" "${sources[@]}"
  done
  lipo -create -output "$OUT/obj/LibreMetronome" "$OUT/obj/LibreMetronome-arm64" "$OUT/obj/LibreMetronome-x86_64"
fi

step "Assembling app bundle"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$OUT/obj/LibreMetronome" "$APP/Contents/MacOS/LibreMetronome"
cp "$MACOS/Info.plist" "$APP/Contents/Info.plist"
version="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' "$FRONTEND/package.json")"
build_number="$(git -C "$ROOT" rev-list --count HEAD 2>/dev/null || echo 1)"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${version:-0.0.0}" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $build_number" "$APP/Contents/Info.plist"
rsync -a --delete --exclude '*.map' "$FRONTEND/build/" "$APP/Contents/Resources/web/"

icon_source="$FRONTEND/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
icns="$OUT/AppIcon.icns"
if [[ ! -f "$icns" || "$icon_source" -nt "$icns" || "$MACOS/Scripts/make-icon.swift" -nt "$icns" ]]; then
  step "Rendering app icon"
  iconset="$OUT/AppIcon.iconset"
  rm -rf "$iconset" && mkdir -p "$iconset"
  xcrun --sdk macosx swift "$MACOS/Scripts/make-icon.swift" "$icon_source" "$OUT/icon-1024.png"
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$OUT/icon-1024.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
    double=$((size * 2))
    sips -z "$double" "$double" "$OUT/icon-1024.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$iconset" -o "$icns"
fi
cp "$icns" "$APP/Contents/Resources/AppIcon.icns"

step "Signing ($identity)"
codesign --force --sign "$identity" --timestamp=none "$APP"
codesign --verify --strict "$APP"
echo "Built $APP"

if $install; then
  step "Installing to $INSTALL_PATH"
  if pgrep -xq LibreMetronome; then
    osascript -e "tell application id \"$BUNDLE_ID\" to quit" || true
    for _ in {1..20}; do pgrep -xq LibreMetronome || break; sleep 0.25; done
  fi
  rm -rf "$INSTALL_PATH"
  ditto "$APP" "$INSTALL_PATH"
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$INSTALL_PATH"
  echo "Installed $INSTALL_PATH"
fi

if $dock; then
  if defaults read com.apple.dock persistent-apps 2>/dev/null | grep -q "LibreMetronome.app"; then
    echo "LibreMetronome is already in the Dock"
  else
    step "Adding to Dock"
    defaults write com.apple.dock persistent-apps -array-add \
      "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>file://$INSTALL_PATH/</string><key>_CFURLStringType</key><integer>15</integer></dict></dict></dict>"
    killall Dock
  fi
fi
