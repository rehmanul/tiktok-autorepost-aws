# AWS Deployment Automation Script for TikTok Auto-Repost Platform
# Run this script in PowerShell to deploy to AWS ECS Fargate

param(
    [Parameter(Mandatory=$true)]
    [string]$AwsAccountId,

    [Parameter(Mandatory=$true)]
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "[1/10] Checking AWS CLI installation..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Installing..." -ForegroundColor Red
    Write-Host "Please install AWS CLI from: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
Write-Host "[2/10] Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
Write-Host "[3/10] Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --query "Account" --output text
    Write-Host "✅ AWS Account ID: $identity" -ForegroundColor Green

    if ($identity -ne $AwsAccountId) {
        Write-Host "⚠️  Warning: Provided Account ID ($AwsAccountId) doesn't match configured credentials ($identity)" -ForegroundColor Yellow
        $continue = Read-Host "Continue anyway? (yes/no)"
        if ($continue -ne "yes") {
            exit 1
        }
    }
} catch {
    Write-Host "❌ AWS credentials not configured. Run: aws configure" -ForegroundColor Red
    exit 1
}

# Create ECR repositories
Write-Host "[4/10] Creating ECR repositories..." -ForegroundColor Yellow
try {
    aws ecr create-repository --repository-name autorepost-api --region $AwsRegion 2>$null
    Write-Host "✅ Created autorepost-api repository" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  autorepost-api repository already exists" -ForegroundColor Cyan
}

try {
    aws ecr create-repository --repository-name autorepost-worker --region $AwsRegion 2>$null
    Write-Host "✅ Created autorepost-worker repository" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  autorepost-worker repository already exists" -ForegroundColor Cyan
}

# Login to ECR
Write-Host "[5/10] Logging in to Amazon ECR..." -ForegroundColor Yellow
$ecrLogin = aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully logged in to ECR" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to login to ECR" -ForegroundColor Red
    exit 1
}

# Build and push API image
Write-Host "[6/10] Building API Docker image..." -ForegroundColor Yellow
docker build -t autorepost-api -f apps/api/Dockerfile .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ API image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build API image" -ForegroundColor Red
    exit 1
}

Write-Host "[7/10] Pushing API image to ECR..." -ForegroundColor Yellow
docker tag autorepost-api:latest "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/autorepost-api:latest"
docker push "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/autorepost-api:latest"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ API image pushed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push API image" -ForegroundColor Red
    exit 1
}

# Build and push Worker image
Write-Host "[8/10] Building Worker Docker image..." -ForegroundColor Yellow
docker build -t autorepost-worker -f apps/worker/Dockerfile .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Worker image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to build Worker image" -ForegroundColor Red
    exit 1
}

Write-Host "[9/10] Pushing Worker image to ECR..." -ForegroundColor Yellow
docker tag autorepost-worker:latest "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/autorepost-worker:latest"
docker push "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/autorepost-worker:latest"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Worker image pushed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push Worker image" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Docker Images Deployed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Image: $AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/autorepost-api:latest" -ForegroundColor White
Write-Host "Worker Image: $AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/autorepost-worker:latest" -ForegroundColor White
Write-Host ""
Write-Host "[10/10] Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create ECS Cluster: https://console.aws.amazon.com/ecs/v2/clusters" -ForegroundColor White
Write-Host "2. Create Task Definitions (see docs/AWS_DEPLOYMENT.md)" -ForegroundColor White
Write-Host "3. Create Application Load Balancer" -ForegroundColor White
Write-Host "4. Create ECS Services" -ForegroundColor White
Write-Host ""
Write-Host "OR use the AWS Console wizard:" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/ecs/v2/create-service" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Rotate your AWS credentials after deployment!" -ForegroundColor Red
