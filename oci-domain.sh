#!/usr/bin/env bash
# Free proper URL for BilliFi on OCI via DuckDNS + nginx + Let's Encrypt
# Usage: sudo -u ubuntu bash oci-domain.sh YOURNAME YOUR_DUCKDNS_TOKEN
set -euo pipefail

SUBDOMAIN="${1:-}"
TOKEN="${2:-}"

if [ -z "$SUBDOMAIN" ] || [ -z "$TOKEN" ]; then
  echo "Usage: bash oci-domain.sh YOURNAME YOUR_DUCKDNS_TOKEN"
  echo "Get both free at: https://www.duckdns.org"
  exit 1
fi

DOMAIN="${SUBDOMAIN}.duckdns.org"
export DEBIAN_FRONTEND=noninteractive

echo "==> Point ${DOMAIN} to this VM"
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh << EOF
#!/usr/bin/env bash
echo url="https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF
chmod 700 ~/duckdns/duck.sh
~/duckdns/duck.sh
cat ~/duckdns/duck.log
(crontab -l 2>/dev/null | grep -v duck.sh; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

echo "==> Open ports 80/443 in iptables"
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 4 -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 4 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true

echo "==> nginx reverse proxy (no :8080 in URL)"
sudo tee /etc/nginx/sites-available/billifi >/dev/null << NGINX
server {
    listen 80;
    server_name ${DOMAIN} 137.23.53.90;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/billifi /etc/nginx/sites-enabled/billifi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "==> Update app public URL"
cd ~/Billifi
if [ -f .env ]; then
  sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN},http://${DOMAIN},http://137.23.53.90|" .env
  sed -i "s|^APP_PUBLIC_URL=.*|APP_PUBLIC_URL=https://${DOMAIN}|" .env
fi
pm2 restart billifi --update-env || true

echo "==> Free HTTPS (Let's Encrypt)"
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo "Certbot pending — open OCI Ingress TCP 80 + 443 first, then rerun:"
  echo "  sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --register-unsafely-without-email --redirect"
}

echo "DONE → https://${DOMAIN}"
