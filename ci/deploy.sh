#!/usr/bin/env bash
set -euo pipefail

HOST="r20.hostingwerk.de"
USER="medina-82"
REMOTE_PATH="/srv/www/medina-82/public/talentexperte"
BACKUP_DIR="/srv/www/medina-82/backups/talentexperte"

echo "=== TALENTEXPERTE DEPLOY ==="
echo "Host: $HOST"
echo "User: $USER"
echo "Remote path: $REMOTE_PATH"
echo

TS="$(date +%Y-%m-%d_%H-%M-%S)"
BACKUP_FILE="${BACKUP_DIR}/backup_${TS}.tar.gz"

echo "1) Creating remote backup..."
ssh "${USER}@${HOST}" "mkdir -p '${BACKUP_DIR}' && tar -czf '${BACKUP_FILE}' -C '${REMOTE_PATH}' ."

echo "Backup created: ${BACKUP_FILE}"
echo

echo "2) Deploying via rsync..."
rsync -avz --delete \
  --exclude ".git" \
  --exclude ".DS_Store" \
  --exclude "ci/" \
  --exclude "steuerberater/" \
  --exclude ".claude/" \
  --exclude ".agents/" \
  --exclude ".agent/" \
  --exclude ".orchids/" \
  --exclude "node_modules/" \
  --exclude ".env.social" \
  --exclude "social-posts.json" \
  --exclude "social-published.json" \
  --exclude "client_secret_*.json" \
  --exclude "SPONSORING-RUNBOOK.md" \
  --exclude "*.ods" \
  --exclude "gutschein-nummern*" \
  --exclude "*.bak" \
  --exclude "*.bak2" \
  ./ "${USER}@${HOST}:${REMOTE_PATH}/"

echo
echo "3) Pruning old backups (keep last 3)..."
ssh "${USER}@${HOST}" "cd '${BACKUP_DIR}' && ls -t backup_*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f"

echo
echo "4) Deploy finished successfully."
