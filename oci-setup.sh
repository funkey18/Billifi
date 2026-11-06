#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl git ufw

echo "==> Node.js 22"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node -v
npm -v

echo "==> App source"
cd ~
if [ -d Billifi/.git ]; then
  cd Billifi
  git fetch --all
  git reset --hard origin/main
else
  git clone https://github.com/funkey18/Billifi.git
  cd Billifi
fi

echo "==> Install & build"
npm install --include=dev --no-audit --no-fund
npm run build
mkdir -p data

echo "==> .env"
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
ENV

echo "==> PM2"
sudo npm install -g pm2
pm2 delete billifi >/dev/null 2>&1 || true
pm2 start server.js --name billifi
pm2 save
STARTUP_CMD=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1)
echo "Running: $STARTUP_CMD"
eval sudo $STARTUP_CMD || true

echo "==> UFW"
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo y | sudo ufw enable || true

echo "==> Health"
pm2 status
sleep 2
curl -s -o /dev/null -w "local_http=%{http_code}\n" http://127.0.0.1:8080/ || true
echo "DONE — open http://137.23.53.90:8080"
