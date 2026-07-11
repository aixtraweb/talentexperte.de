#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PLIST="$HOME/Library/LaunchAgents/de.talentexperte.weekly-blog-social.plist"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$PROJECT_DIR/logs"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>de.talentexperte.weekly-blog-social</string>

  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${PROJECT_DIR}/scripts/weekly-blog-social.mjs</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/logs/weekly-blog-social.log</string>

  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/logs/weekly-blog-social.err.log</string>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Installed launchd job: $PLIST"
echo "Schedule: weekly Monday 08:00"
echo "Test manually with:"
echo "  cd \"$PROJECT_DIR\" && $NODE_BIN scripts/weekly-blog-social.mjs"
