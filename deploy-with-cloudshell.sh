#!/bin/bash
# AWS Deployment Script - Run this in AWS CloudShell (has Docker pre-installed!)

set -e

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

echo "========================================="
echo "AWS Deployment via CloudShell"
echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo "========================================="

# Step 1: Clone repository
echo "[1/6] Cloning repository..."
cd ~
rm -rf autorepost-dash
git clone https://github.com/Jkratz01/autorepost-dash.git
cd autorepost-dash

# Step 2: Create ECR repositories
echo "[2/6] Creating ECR repositories..."
aws ecr create-repository --repository-name autorepost-api --region $REGION 2>/dev/null || echo "Repository already exists"
aws ecr create-repository --repository-name autorepost-worker --region $REGION 2>/dev/null || echo "Repository already exists"

# Step 3: Login to ECR
echo "[3/6] Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Step 4: Build and push API image
echo "[4/6] Building and pushing API image..."
docker build -t autorepost-api -f apps/api/Dockerfile .
docker tag autorepost-api:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-api:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-api:latest

# Step 5: Build and push Worker image
echo "[5/6] Building and pushing Worker image..."
docker build -t autorepost-worker -f apps/worker/Dockerfile .
docker tag autorepost-worker:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-worker:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-worker:latest

echo "[6/6] ✅ Images pushed successfully!"
echo ""
echo "API Image: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-api:latest"
echo "Worker Image: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/autorepost-worker:latest"
echo ""
echo "Next: Create App Runner services in AWS Console"
echo "https://console.aws.amazon.com/apprunner/home"
