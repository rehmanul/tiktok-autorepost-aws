#!/bin/bash
set -e

echo "Building all packages and services..."

# Build packages first (dependencies)
echo "[1/5] Building @autorepost/domain..."
cd packages/domain && npm run build && cd ../..

echo "[2/5] Building @autorepost/common..."
cd packages/common && npm run build && cd ../..

echo "[3/5] Building @autorepost/integrations-tiktok..."
cd packages/integrations-tiktok && npm run build && cd ../..

# Build services
echo "[4/5] Building @autorepost/api..."
cd apps/api && npm run build && cd ../..

echo "[5/5] Building @autorepost/worker..."
cd apps/worker && npm run build && cd ../..

echo "✅ All builds complete!"
echo "API dist: $(ls -la apps/api/dist/apps/api/src/main.js 2>&1 | grep main || echo 'NOT FOUND')"
echo "Worker dist: $(ls -la apps/worker/dist/apps/worker/src/main.js 2>&1 | grep main || echo 'NOT FOUND')"
