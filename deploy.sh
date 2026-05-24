#!/bin/bash
set -e

echo "==> Pull do repo..."
# Protege users.json de ser sobrescrito pelo git pull
git update-index --assume-unchanged Backend/data/users.json 2>/dev/null || true
git pull origin main
# Garante que o arquivo existe (necessário para o volume mount do Docker)
[ -f ./Backend/data/users.json ] || echo '{"users":[]}' > ./Backend/data/users.json

echo "==> Build e subida dos containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Status:"
docker compose -f docker-compose.prod.yml ps

echo "==> Health check backend (aguardando 15s)..."
sleep 15
curl -s https://avatartea.axiodev.cloud/api/health | python3 -m json.tool
