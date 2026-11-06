#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> Add 2G swap (free VM is only ~1GB RAM)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
free -h

cd ~/Billifi

echo "==> Production deps only (no vite build on server)"
# Keep existing dist/ uploaded from PC
npm install --omit=dev --ignore-scripts --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

mkdir -p data

cat > .env << 'ENV'
NODE_ENV=production
HOST=0.0.0.0
PORT=8080
JWT_SECRET=billifi-oci-prod-7c6bd5bc344d0f88284ee783a91f2e40
JWT_DAYS=14
DATA_DIR=/home/ubuntu/Billifi/data
DATABASE_PATH=/home/ubuntu/Billifi/data/gst_multitenant.db
ALLOWED_ORIGINS=http://137.23.53.90:8080
APP_PUBLIC_URL=http://137.23.53.90:8080
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
ENV
echo "NOTE: Fill RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env (or let GitHub Actions sync them)."

echo "==> PM2"
sudo npm install -g pm2
pm2 delete billifi >/dev/null 2>&1 || true
pm2 start server.js --name billifi --cwd /home/ubuntu/Billifi
pm2 save
STARTUP_CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1)
echo "$STARTUP_CMD"
eval sudo $STARTUP_CMD || true

sudo ufw allow OpenSSH || true
sudo ufw allow 8080/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
echo y | sudo ufw enable || true

pm2 status
sleep 2
curl -s -o /dev/null -w "local_http=%{http_code}\n" http://127.0.0.1:8080/ || true
echo "DONE http://137.23.53.90:8080"
