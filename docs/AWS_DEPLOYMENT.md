# AWS Deployment Guide

Complete guide to deploy the TikTok Auto-Repost Platform on AWS using ECS Fargate.

## Architecture Overview

```
Users → CloudFront (CDN) → S3 (Next.js Static Site)
          ↓
     Application Load Balancer
          ↓
    ┌─────────────────────┐
    │   ECS Fargate       │
    │  ┌──────────────┐   │
    │  │  API Service │←──┼──→ Supabase PostgreSQL
    │  └──────────────┘   │
    │  ┌──────────────┐   │
    │  │Worker Service│←──┼──→ Upstash Redis
    │  └──────────────┘   │
    └─────────────────────┘
          ↓
       AWS S3 (Media Storage)
```

## Prerequisites

### 1. AWS Account Setup
- Create an AWS account at https://aws.amazon.com
- Enable billing alerts
- Set up MFA for root account

### 2. Install Required Tools
```bash
# Install AWS CLI
# Windows (PowerShell as Administrator):
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version

# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

### 3. Create IAM User for Deployment
1. Go to AWS Console → IAM → Users → Create User
2. Username: `github-actions-deploy`
3. Attach policies:
   - `AmazonECS_FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `IAMReadOnlyAccess`
4. Create Access Key → Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

---

## Deployment Method 1: AWS ECS Fargate (Recommended)

### Estimated Monthly Cost: $30-50

**Includes:**
- ECS Fargate (API + Worker): ~$20-30/month
- Application Load Balancer: ~$16/month
- S3 Storage: ~$5-10/month
- Data Transfer: ~$5/month

### Step 1: Create ECR Repositories

```bash
# Login to AWS
aws configure
# Enter your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

# Create ECR repositories
aws ecr create-repository --repository-name autorepost-api --region us-east-1
aws ecr create-repository --repository-name autorepost-worker --region us-east-1
```

### Step 2: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name autorepost-cluster \
  --region us-east-1
```

### Step 3: Create Task Execution Role

```bash
# Create IAM role for ECS task execution
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

Create `ecs-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Step 4: Create Task Definitions

Create `api-task-definition.json`:
```json
{
  "family": "autorepost-api-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-api:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "4000"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:DATABASE_URL"},
        {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:REDIS_URL"},
        {"name": "SUPABASE_SERVICE_ROLE_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:SUPABASE_SERVICE_ROLE_KEY"},
        {"name": "TOKEN_ENCRYPTION_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:TOKEN_ENCRYPTION_KEY"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/autorepost-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Create `worker-task-definition.json`:
```json
{
  "family": "autorepost-worker-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-worker:latest",
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:DATABASE_URL"},
        {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:REDIS_URL"},
        {"name": "TOKEN_ENCRYPTION_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:TOKEN_ENCRYPTION_KEY"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/autorepost-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definitions:
```bash
aws ecs register-task-definition --cli-input-json file://api-task-definition.json
aws ecs register-task-definition --cli-input-json file://worker-task-definition.json
```

### Step 5: Store Secrets in AWS Secrets Manager

```bash
# Store environment variables as secrets
aws secretsmanager create-secret \
  --name DATABASE_URL \
  --secret-string "postgresql://postgres.qjgplkbstelsbakaxwdc:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

aws secretsmanager create-secret \
  --name REDIS_URL \
  --secret-string "rediss://default:YOUR_PASSWORD@main-muskrat-27825.upstash.io:6379"

aws secretsmanager create-secret \
  --name TOKEN_ENCRYPTION_KEY \
  --secret-string "YOUR_ENCRYPTION_KEY"

aws secretsmanager create-secret \
  --name SUPABASE_SERVICE_ROLE_KEY \
  --secret-string "YOUR_SERVICE_ROLE_KEY"

aws secretsmanager create-secret \
  --name S3_ACCESS_KEY_ID \
  --secret-string "YOUR_S3_ACCESS_KEY"

aws secretsmanager create-secret \
  --name S3_SECRET_ACCESS_KEY \
  --secret-string "YOUR_S3_SECRET_KEY"
```

### Step 6: Create Application Load Balancer

1. Go to EC2 → Load Balancers → Create Load Balancer
2. Select "Application Load Balancer"
3. Name: `autorepost-alb`
4. Scheme: Internet-facing
5. Select all availability zones
6. Create Security Group:
   - Allow HTTP (80) from anywhere
   - Allow HTTPS (443) from anywhere
7. Create Target Group for API:
   - Name: `autorepost-api-tg`
   - Target type: IP
   - Protocol: HTTP
   - Port: 4000
   - Health check path: `/health`

### Step 7: Create ECS Services

```bash
# Create VPC and subnets (if not already exists)
# Get your default VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text)

# Create security group for ECS tasks
SG_ID=$(aws ec2 create-security-group \
  --group-name autorepost-ecs-sg \
  --description "Security group for ECS tasks" \
  --vpc-id $VPC_ID \
  --output text --query 'GroupId')

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 4000 \
  --source-group ALB_SECURITY_GROUP_ID

# Create API service
aws ecs create-service \
  --cluster autorepost-cluster \
  --service-name autorepost-api-service \
  --task-definition autorepost-api-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=YOUR_TARGET_GROUP_ARN,containerName=api,containerPort=4000"

# Create Worker service
aws ecs create-service \
  --cluster autorepost-cluster \
  --service-name autorepost-worker-service \
  --task-definition autorepost-worker-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}"
```

### Step 8: Deploy Next.js Frontend to S3 + CloudFront

```bash
# Build Next.js app
cd apps/web
npm run build

# Create S3 bucket for web app
aws s3 mb s3://autorepost-web --region us-east-1

# Enable static website hosting
aws s3 website s3://autorepost-web --index-document index.html

# Upload build
aws s3 sync out/ s3://autorepost-web --delete

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name autorepost-web.s3.us-east-1.amazonaws.com \
  --default-root-object index.html
```

---

## Deployment Method 2: AWS App Runner (Simpler, More Expensive)

### Estimated Monthly Cost: $40-60

```bash
# Deploy API to App Runner
aws apprunner create-service \
  --service-name autorepost-api \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/Jkratz01/autorepost-dash.git",
      "SourceCodeVersion": {"Type": "BRANCH", "Value": "main"},
      "CodeConfiguration": {
        "ConfigurationSource": "API",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_20",
          "BuildCommand": "npm install && npm run build --workspace=@autorepost/api",
          "StartCommand": "node apps/api/dist/main.js",
          "Port": "4000"
        }
      }
    }
  }'

# Deploy Worker to App Runner
aws apprunner create-service \
  --service-name autorepost-worker \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/Jkratz01/autorepost-dash.git",
      "SourceCodeVersion": {"Type": "BRANCH", "Value": "main"},
      "CodeConfiguration": {
        "ConfigurationSource": "API",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_20",
          "BuildCommand": "npm install && npm run build --workspace=@autorepost/worker",
          "StartCommand": "node apps/worker/dist/main.js"
        }
      }
    }
  }'
```

---

## GitHub Actions Auto-Deployment

### Setup GitHub Secrets

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `TOKEN_ENCRYPTION_KEY`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`

3. Push to main branch → GitHub Actions will auto-deploy!

---

## Testing Deployment

```bash
# Test API health
curl https://your-alb-url.amazonaws.com/health

# Test API metrics
curl https://your-alb-url.amazonaws.com/metrics

# Check ECS service status
aws ecs describe-services \
  --cluster autorepost-cluster \
  --services autorepost-api-service autorepost-worker-service
```

---

## Monitoring & Logging

### CloudWatch Logs
```bash
# View API logs
aws logs tail /ecs/autorepost-api --follow

# View Worker logs
aws logs tail /ecs/autorepost-worker --follow
```

### CloudWatch Metrics
- Go to CloudWatch → Metrics → ECS
- Monitor CPU, Memory, Network usage

### Set up Alarms
```bash
# Create CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name autorepost-api-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## Scaling Configuration

### Auto-scaling for ECS Services
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/autorepost-cluster/autorepost-api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 5

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/autorepost-cluster/autorepost-api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

---

## Cost Optimization Tips

1. **Use Fargate Spot** for Worker (save 70%):
   ```bash
   --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=1
   ```

2. **Use Reserved Capacity** for predictable workloads

3. **Enable S3 Lifecycle Policies** to move old videos to Glacier

4. **Set CloudWatch log retention** to 7-30 days

5. **Use VPC Endpoints** to avoid NAT Gateway costs

---

## Rollback Strategy

```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster autorepost-cluster \
  --service autorepost-api-service \
  --task-definition autorepost-api-task:PREVIOUS_REVISION \
  --force-new-deployment
```

---

## Troubleshooting

### Container Won't Start
```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster autorepost-cluster \
  --tasks TASK_ID \
  --query 'tasks[0].stopCode'

# View container logs
aws logs tail /ecs/autorepost-api --since 1h
```

### Database Connection Issues
- Check security group allows outbound traffic
- Verify DATABASE_URL is correct in Secrets Manager
- Test connection from container:
  ```bash
  aws ecs execute-command \
    --cluster autorepost-cluster \
    --task TASK_ID \
    --container api \
    --interactive \
    --command "/bin/sh"
  ```

### High Costs
- Review CloudWatch metrics for over-provisioning
- Check for zombie resources (unused load balancers, etc.)
- Enable Cost Explorer and set budgets

---

## Security Checklist

- ✅ Use AWS Secrets Manager for all secrets
- ✅ Enable ECS Exec audit logging
- ✅ Use least-privilege IAM roles
- ✅ Enable VPC Flow Logs
- ✅ Use AWS WAF with ALB
- ✅ Enable GuardDuty for threat detection
- ✅ Rotate secrets regularly
- ✅ Enable MFA for AWS console access

---

## Support

For issues or questions:
- Check CloudWatch Logs
- Review ECS service events
- Check ALB target health
- Contact: your-email@example.com
