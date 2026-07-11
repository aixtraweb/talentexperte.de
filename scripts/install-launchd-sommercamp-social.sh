#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"
PLIST_PLAN="$HOME/Library/LaunchAgents/de.talentexperte.sommercamp.plan.plist"
PLIST_PUBLISH="$HOME/Library/LaunchAgents/de.talentexperte.sommercamp.publish.plist"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$PROJECT_DIR/logs"

cat > "$PLIST_PLAN" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>de.talentexperte.sommercamp.plan</string>

  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${PROJECT_DIR}/scripts/sommercamp-plan.mjs</string>
    <string>--deploy</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/logs/sommercamp-plan.log</string>

  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/logs/sommercamp-plan.err.log</string>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

cat > "$PLIST_PUBLISH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>de.talentexperte.sommercamp.publish</string>

  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${PROJECT_DIR}/scripts/sommercamp-publish-approved.mjs</string>
  </array>

  <key>StartCalendarInterval</key>
  <array>
    <dict>
      <key>Weekday</key>
      <integer>2</integer>
      <key>Hour</key>
      <integer>18</integer>
      <key>Minute</key>
      <integer>30</integer>
    </dict>
    <dict>
      <key>Weekday</key>
      <integer>5</integer>
      <key>Hour</key>
      <integer>17</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
  </array>

  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/logs/sommercamp-publish.log</string>

  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/logs/sommercamp-publish.err.log</string>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PLAN" 2>/dev/null || true
launchctl unload "$PLIST_PUBLISH" 2>/dev/null || true
launchctl load "$PLIST_PLAN"
launchctl load "$PLIST_PUBLISH"

echo "Installed launchd jobs:"
echo "  $PLIST_PLAN (weekly Monday 09:00: generates plan + deploys)"
echo "  $PLIST_PUBLISH (Tue 18:30 & Fri 17:00: publishes ONLY if social-posts.approved.json exists)"
echo
echo "Approve step:"
echo "  cd \"$PROJECT_DIR\" && npm run sommercamp:approve"

