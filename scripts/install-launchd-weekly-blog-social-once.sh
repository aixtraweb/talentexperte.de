#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
HOUR="${ONCE_HOUR:-09}"
MINUTE="${ONCE_MINUTE:-30}"
MONTH="$(date +%-m)"
DAY="$(date +%-d)"
PLIST="$HOME/Library/LaunchAgents/de.talentexperte.weekly-blog-social-once.plist"
RUNNER="$PROJECT_DIR/scripts/run-weekly-blog-social-once.sh"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$PROJECT_DIR/logs"

cat > "$RUNNER" <<RUNNER
#!/usr/bin/env bash
set -euo pipefail
cd "$PROJECT_DIR"
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
"$NODE_BIN" "$PROJECT_DIR/scripts/weekly-blog-social.mjs"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
RUNNER
chmod +x "$RUNNER"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>de.talentexperte.weekly-blog-social-once</string>

  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${RUNNER}</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Month</key>
    <integer>${MONTH}</integer>
    <key>Day</key>
    <integer>${DAY}</integer>
    <key>Hour</key>
    <integer>${HOUR}</integer>
    <key>Minute</key>
    <integer>${MINUTE}</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>${PROJECT_DIR}/logs/weekly-blog-social-once.log</string>

  <key>StandardErrorPath</key>
  <string>${PROJECT_DIR}/logs/weekly-blog-social-once.err.log</string>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Installed one-time launchd job: $PLIST"
echo "Schedule: today ${HOUR}:${MINUTE}"
echo "Logs:"
echo "  $PROJECT_DIR/logs/weekly-blog-social-once.log"
echo "  $PROJECT_DIR/logs/weekly-blog-social-once.err.log"
