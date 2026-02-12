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
  ./ "${USER}@${HOST}:${REMOTE_PATH}/"

echo
echo "3) Deploy finished successfully."
