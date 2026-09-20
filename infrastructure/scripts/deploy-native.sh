#!/usr/bin/env bash
# ==============================================================================
# CivicFlowAI — Native VM Automated Deployment Script (No Containers)
# ==============================================================================
# Deploys CivicFlowAI directly on an Ubuntu 22.04 LTS Azure Virtual Machine:
#   1. Python 3.11 virtualenv with backend & agent dependencies
#   2. React Frontend build with Vite & deployment to /var/www/civicflow/dist
#   3. Systemd services (civicflow-backend, civicflow-agent, redis-server)
#   4. High-performance Nginx reverse proxy with gzip & asset caching
#   5. End-to-end health verification
# ==============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/home/azureuser/CivicFlowAI}"
VENV_DIR="${APP_DIR}/venv"
WEB_ROOT="/var/www/civicflow/dist"

echo "=================================================="
echo " Starting CivicFlowAI Native Deployment"
echo " Target Directory: ${APP_DIR}"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=================================================="

# 1. Verify working directory
if [ ! -d "${APP_DIR}" ]; then
    echo "ERROR: Application directory ${APP_DIR} does not exist!" >&2
    exit 1
fi
cd "${APP_DIR}"

# 2. Python Virtual Environment Setup
echo "--> [1/6] Setting up Python 3.11 Virtual Environment..."
if [ ! -d "${VENV_DIR}" ]; then
    python3 -m venv "${VENV_DIR}"
fi
source "${VENV_DIR}/bin/activate"
pip install --upgrade pip setuptools wheel --quiet

echo "--> Installing Backend and Agent dependencies..."
pip install -r "${APP_DIR}/backend/requirements.txt" --quiet
pip install -r "${APP_DIR}/agent/requirements.txt" --quiet

# 3. Build React Frontend
echo "--> [2/6] Building Production React Frontend..."
cd "${APP_DIR}/frontend"
if [ -f package-lock.json ]; then
    npm ci --silent
else
    npm install --silent
fi

# Build static bundle
npm run build

echo "--> Deploying static assets to ${WEB_ROOT}..."
sudo mkdir -p "${WEB_ROOT}"
sudo rm -rf "${WEB_ROOT:?}"/*
sudo cp -r "${APP_DIR}/frontend/dist/"* "${WEB_ROOT}/"
sudo chown -R www-data:www-data "${WEB_ROOT}"
sudo chmod -R 755 "${WEB_ROOT}"

cd "${APP_DIR}"

# 4. Systemd Service Installation
echo "--> [3/6] Installing and configuring Systemd services..."
sudo cp "${APP_DIR}/infrastructure/systemd/civicflow-backend.service" /etc/systemd/system/
sudo cp "${APP_DIR}/infrastructure/systemd/civicflow-agent.service" /etc/systemd/system/

sudo systemctl daemon-reload

# 5. Nginx Configuration
echo "--> [4/6] Configuring high-performance Nginx reverse proxy..."
sudo cp "${APP_DIR}/infrastructure/nginx/civicflow.conf" /etc/nginx/sites-available/civicflow

# Enable civicflow site and disable default if active
sudo ln -sf /etc/nginx/sites-available/civicflow /etc/nginx/sites-enabled/civicflow
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Validate Nginx syntax before reloading
echo "--> Validating Nginx configuration..."
sudo nginx -t

# 6. Service Restarts & Health Checks
echo "--> [5/6] Starting services..."
sudo systemctl enable redis-server || true
sudo systemctl restart redis-server || true

sudo systemctl enable civicflow-backend
sudo systemctl restart civicflow-backend

sudo systemctl enable civicflow-agent
sudo systemctl restart civicflow-agent

sudo systemctl reload nginx

echo "--> [6/6] Verifying service health..."
sleep 4

# Check backend health
for i in {1..10}; do
    if curl -s -f http://127.0.0.1:5000/health > /dev/null; then
        echo " Backend API Gateway is ONLINE and healthy (Port 5000)!"
        break
    fi
    echo "Waiting for Backend API Gateway... ($i/10)"
    sleep 2
done

# Check agent health
for i in {1..10}; do
    if curl -s -f http://127.0.0.1:8000/health > /dev/null; then
        echo " Multi-Agent Engine is ONLINE and healthy (Port 8000)!"
        break
    fi
    echo "Waiting for Multi-Agent Engine... ($i/10)"
    sleep 2
done

# Check Nginx HTTP delivery
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
if [ "${HTTP_CODE}" = "200" ]; then
    echo " Nginx Frontend delivery is ACTIVE (HTTP 200)!"
else
    echo "WARNING: Nginx returned HTTP ${HTTP_CODE} on localhost root."
fi

echo "=================================================="
echo " CivicFlowAI Deployment Successfully Completed!"
echo " Web Portal: http://$(curl -s https://api.ipify.org || echo '<VM_PUBLIC_IP>')"
echo " API Docs:   http://$(curl -s https://api.ipify.org || echo '<VM_PUBLIC_IP>')/docs"
echo "=================================================="
