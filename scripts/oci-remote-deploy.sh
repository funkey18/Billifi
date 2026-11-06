#!/usr/bin/env bash
# Runs ON the OCI server after GitHub Actions uploads a new dist/ and syncs code.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/Billifi}"
cd "$APP_DIR"

echo "==> Sync git to origin/main (keep .env + data/)"
git fetch origin main
git reset --hard origin/main
# Keep runtime data, env, built assets, and deps
git clean -fd \
  -e data \
  -e dist \
  -e .env \
  -e node_modules \
  -e "Saved Invoices" \
  -e Trash

echo "==> Production deps"
# Ignore postinstall if OOM-prone; tesseract assets come from the Actions build in dist/public if needed
npm install --omit=dev --no-audit --no-fund

echo "==> Restart PM2"
pm2 restart billifi --update-env || pm2 start server.js --name billifi --cwd "$APP_DIR"
pm2 save

sleep 2
curl -sf -o /dev/null -w "health=%{http_code}\n" http://127.0.0.1:8080/ || {
  echo "Health check failed"
  pm2 logs billifi --lines 40 --nostream || true
  exit 1
}

echo "Deploy OK → https://billifi.duckdns.org"
