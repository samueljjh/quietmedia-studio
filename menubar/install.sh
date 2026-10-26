#!/bin/bash
# Installs or updates "Studio Menu Bar.app" in Applications and starts it at login.
# Also removes the older "Quiet Studio.app" menu bar app it replaces. Needs Xcode Command Line Tools.
set -e
cd "$(dirname "$0")"
killall "Studio Menu Bar" "Quiet Studio" 2>/dev/null || true
sleep 1
bash build.sh
rm -rf "/Applications/Quiet Studio.app" "/Applications/Studio Menu Bar.app"
mv "Studio Menu Bar.app" /Applications/
# start at login: swap the old login item for the new one (macOS may ask to let Terminal control System Events; allow it)
osascript -e 'tell application "System Events"
  delete (every login item whose name is "Quiet Studio" or name is "Studio Menu Bar")
  make login item at end with properties {path:"/Applications/Studio Menu Bar.app", hidden:true}
end tell' >/dev/null 2>&1 || echo "Could not add it to Login Items. Add it by hand: System Settings > General > Login Items."
open "/Applications/Studio Menu Bar.app"
echo "Done. The ring is in the menu bar; Studio Menu Bar is in Applications and starts at login."
