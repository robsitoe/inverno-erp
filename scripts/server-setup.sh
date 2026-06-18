#!/usr/bin/env bash
# Run once on the VPS to set up the server.
# Usage: bash server-setup.sh
set -euo pipefail

APP_DIR=/opt/inverno-erp
REPO_URL=${1:-"https://github.com/robsitoe/inverno-erp.git"}

echo "=== Installing Docker ==="
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

echo "=== Cloning repository ==="
if [ ! -d "$APP_DIR" ]; then
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "=== Creating .env file ==="
if [ ! -f .env ]; then
    cat > .env <<'ENVEOF'
DB_USERNAME=postgres
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_DATABASE=inverno_erp
JWT_SECRET=CHANGE_ME_JWT_SECRET_32CHARS_MIN
LICENSE_JWT_SECRET=CHANGE_ME_LICENSE_JWT_SECRET
ALLOWED_ORIGINS=https://erp.yourdomain.com
APP_PORT=80
ENVEOF
    echo ""
    echo ">>> IMPORTANT: Edit /opt/inverno-erp/.env and set secure values before starting! <<<"
    echo ""
fi

echo "=== First-time build and start ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Done. App is running on port 80 ==="
docker compose -f docker-compose.prod.yml ps
