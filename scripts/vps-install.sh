#!/usr/bin/env bash
# Run on Ubuntu 22.04/24.04 VPS (e.g. freevps.edu.pl) as a sudo user.
# Usage: curl -sO ... or copy repo, then: bash scripts/vps-install.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/sims}"
APP_USER="${APP_USER:-sims}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PUBLIC_URL="${PUBLIC_URL:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/vps-install.sh"
  exit 1
fi

echo "==> System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ufw ca-certificates build-essential

echo "==> Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node -v
npm -v

echo "==> PM2"
npm install -g pm2

if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
fi

if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "ERROR: App not found at $APP_DIR"
  echo "Upload or clone the project there first, then re-run this script."
  exit 1
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

if [[ ! -f "$APP_DIR/.env" ]]; then
  if [[ -f "$APP_DIR/.env.production.example" ]]; then
    cp "$APP_DIR/.env.production.example" "$APP_DIR/.env"
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    echo "Created $APP_DIR/.env — edit NEXTAUTH_URL and NEXTAUTH_SECRET before going live."
  else
    echo "ERROR: Create $APP_DIR/.env (see .env.production.example)"
    exit 1
  fi
fi

echo "==> Build app (as $APP_USER)"
sudo -u "$APP_USER" bash -lc "
  set -e
  cd '$APP_DIR'
  export NODE_OPTIONS='--max-old-space-size=2048'
  npm ci
  npm run db:setup
  npm run build
"

echo "==> PM2 process"
sudo -u "$APP_USER" bash -lc "
  cd '$APP_DIR'
  pm2 delete sims 2>/dev/null || true
  pm2 start npm --name sims -- start
  pm2 save
"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash || true

NGINX_SITE="/etc/nginx/sites-available/sims"
cat > "$NGINX_SITE" <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/sims
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl reload nginx

echo "==> Firewall (SSH + HTTP)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "Done. Next steps:"
echo "  1. Edit $APP_DIR/.env — set NEXTAUTH_URL to http://YOUR_VPS_IP (or https://your-domain)"
echo "  2. Generate secret: openssl rand -base64 32  →  NEXTAUTH_SECRET"
echo "  3. sudo -u $APP_USER bash -lc 'cd $APP_DIR && pm2 restart sims'"
echo "  4. Open http://YOUR_VPS_IP in a browser (demo login in seed: admin@demo.org / password123 — change after deploy)"
if [[ -n "$PUBLIC_URL" ]]; then
  echo "  Public URL hint: $PUBLIC_URL"
fi
