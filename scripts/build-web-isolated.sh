#!/bin/bash
set -e

echo "=============================================="
echo "Building Web App in Complete Isolation"
echo "=============================================="

# Step 1: Install only web dependencies
echo "[1/2] Installing web dependencies only..."
cd apps/web
npm install --legacy-peer-deps

# Step 2: Build Next.js directly
echo "[2/2] Building Next.js app..."
NODE_ENV=production npm run build

echo ""
echo "✅ Web build complete!"
echo "Output directory: apps/web/out"
