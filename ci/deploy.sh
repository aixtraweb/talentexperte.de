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

if [[ "${SKIP_BACKUP:-0}" == "1" ]]; then
  echo "1) Reusing the backup created earlier in this rollout."
else
  echo "1) Creating remote backup..."
  ssh "${USER}@${HOST}" "mkdir -p '${BACKUP_DIR}' && tar -czf '${BACKUP_FILE}' -C '${REMOTE_PATH}' ."
  echo "Backup created: ${BACKUP_FILE}"
fi
echo

echo "2) Deploying public web artifact via allowlist..."
# Security boundary: only files required by the static website may enter the
# public document root. Repository sources, runbooks, exports, logs, secrets,
# Supabase functions and automation payloads are excluded by default.
rsync -avz --delete --delete-excluded --prune-empty-dirs \
  --filter "protect /.well-known/***" \
  --include "/404.html" \
  --include "/admin.html" \
  --include "/agb.html" \
  --include "/anmeldung-saint-gobain.html" \
  --include "/anmeldung.html" \
  --include "/bestaetigung-firma.html" \
  --include "/bestaetigung.html" \
  --include "/datenschutz.html" \
  --include "/demo-default.html" \
  --include "/firmen-anmeldung.html" \
  --include "/gutschein.html" \
  --include "/impressum.html" \
  --include "/index.html" \
  --include "/teams.html" \
  --include "/zahlung-start.html" \
  --include "/robots.txt" \
  --include "/sitemap.xml" \
  --include "/llms.txt" \
  --include "/.htaccess" \
  --include "/css/***" \
  --exclude "/images/social-input/***" \
  --exclude ".DS_Store" \
  --include "/images/***" \
  --include "/fonts/***" \
  --include "/pdf/***" \
  --include "/favicon/***" \
  --include "/camps-in/***" \
  --include "/newsreader/***" \
  --include "/ci/" \
  --include "/ci/logo.png" \
  --include "/ci/logo.webp" \
  --include "/ci/talentexperte-logo-jubilaeum-2005-2025.png" \
  --exclude "*" \
  ./ "${USER}@${HOST}:${REMOTE_PATH}/"

echo
echo "3) Verifying that internal sources are absent..."
ssh "${USER}@${HOST}" "test ! -e '${REMOTE_PATH}/supabase' && test ! -e '${REMOTE_PATH}/scripts' && test ! -e '${REMOTE_PATH}/package.json' && test ! -e '${REMOTE_PATH}/SECURITY-IMPLEMENTATION.md'"

echo
echo "4) Pruning old backups (keep last 3)..."
ssh "${USER}@${HOST}" "cd '${BACKUP_DIR}' && ls -t backup_*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f"

echo
echo "5) Deploy finished successfully."
