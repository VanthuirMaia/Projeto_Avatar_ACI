#!/bin/bash
set -e

echo "==> Pull do repo..."
git pull origin main

echo "==> Build e subida dos containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Status:"
docker compose -f docker-compose.prod.yml ps

echo "==> Health check backend (aguardando 15s)..."
sleep 15
curl -s https://avatartea.axiodev.cloud/api/health | python3 -m json.tool
