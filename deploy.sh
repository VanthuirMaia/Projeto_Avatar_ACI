#!/bin/bash
set -e

echo "==> Pull do repo..."
# Protege arquivos de dados de serem sobrescritos pelo git pull
git update-index --assume-unchanged Backend/data/users.json 2>/dev/null || true
git update-index --assume-unchanged Backend/data/peis.json 2>/dev/null || true
git update-index --assume-unchanged Backend/data/alunos.json 2>/dev/null || true
git pull origin main
# Garante que os arquivos existem (necessários para os volume mounts do Docker)
[ -f ./Backend/data/users.json ] || echo '{"users":[]}' > ./Backend/data/users.json
[ -f ./Backend/data/peis.json ] || echo '{"peis":[]}' > ./Backend/data/peis.json
[ -f ./Backend/data/alunos.json ] || echo '{"alunos":[]}' > ./Backend/data/alunos.json

echo "==> Build e subida dos containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Status:"
docker compose -f docker-compose.prod.yml ps

echo "==> Health check backend (aguardando 15s)..."
sleep 15
curl -s https://avatartea.axiodev.cloud/api/health | python3 -m json.tool
