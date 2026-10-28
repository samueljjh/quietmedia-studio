#!/bin/bash
# Builds "Studio Menu Bar.app" (the Quiet Studio menu bar ring) next to this script. Needs Xcode Command Line Tools (xcode-select --install).
set -e
cd "$(dirname "$0")"
APP="Studio Menu Bar.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
echo "Compiling…"
swiftc -O -framework Cocoa -framework WebKit -framework UserNotifications main.swift -o "$APP/Contents/MacOS/Studio Menu Bar"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>Studio Menu Bar</string>
<key>CFBundleDisplayName</key><string>Studio Menu Bar</string>
<key>CFBundleIdentifier</key><string>co.uk.quietmedia.studio.menubar</string>
<key>CFBundleVersion</key><string>9</string>
<key>CFBundleShortVersionString</key><string>9.0</string>
<key>CFBundleExecutable</key><string>Studio Menu Bar</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>LSUIElement</key><true/>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsArbitraryLoads</key><false/><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
# app icon from the brand png
if [ -f icon-512.png ]; then
  ICONSET=$(mktemp -d)/AppIcon.iconset; mkdir -p "$ICONSET"
  for s in 16 32 128 256 512; do
    sips -z $s $s icon-512.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
    d=$((s*2)); [ $d -le 1024 ] && sips -z $d $d icon-512.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
fi
codesign --force --deep --sign - "$APP" 2>/dev/null || true
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
echo "Built $APP — open it, then add it to Login Items if you want it at startup."
echo "If macOS blocks it: System Settings → Privacy & Security → Open Anyway."
