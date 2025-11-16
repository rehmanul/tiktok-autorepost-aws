#!/bin/bash
set -e

ACCOUNT_ID=379262059058
REGION=us-east-1

echo "========================================="
echo "Building and Pushing Docker Images"
echo "========================================="

# Login to ECR
echo "[1/5] Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build API
echo "[2/5] Building API image..."
docker build -t $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-api:latest -f apps/api/Dockerfile .

# Push API
echo "[3/5] Pushing API image..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-api:latest

# Build Worker
echo "[4/5] Building Worker image..."
docker build -t $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-worker:latest -f apps/worker/Dockerfile .

# Push Worker
echo "[5/5] Pushing Worker image..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-worker:latest

echo ""
echo "✅ Success! Images pushed to ECR:"
echo "  - $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-api:latest"
echo "  - $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-worker:latest"
