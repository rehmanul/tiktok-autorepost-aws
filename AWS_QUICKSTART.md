# AWS Deployment Quick Start Guide

🚀 **Everything is ready for AWS deployment!**

## What's Been Created

✅ **Docker Configuration**
- `apps/api/Dockerfile` - Production Docker image for NestJS API
- `apps/worker/Dockerfile` - Production Docker image for Worker service
- `.dockerignore` - Optimizes Docker builds (excludes node_modules, .env, etc.)
- `docker-compose.yml` - Test containers locally before deploying

✅ **CI/CD Pipeline**
- `.github/workflows/deploy-aws.yml` - Auto-deploy on every push to main branch
- Builds Docker images → Pushes to AWS ECR → Deploys to ECS Fargate

✅ **Documentation**
- `docs/AWS_DEPLOYMENT.md` - Complete 500+ line deployment guide with:
  - Step-by-step AWS setup instructions
  - Cost estimates ($30-50/month)
  - Security best practices
  - Monitoring & logging setup
  - Troubleshooting guide

---

## Deployment Options

### Option 1: ECS Fargate (Recommended) 💰 $30-50/month
**Pros:**
- Full control over infrastructure
- Best cost/performance ratio
- Auto-scaling built-in
- Production-grade reliability

**Cons:**
- Requires more setup (15-30 minutes)
- Need to configure VPC, ALB, Security Groups

### Option 2: App Runner (Easiest) 💰 $40-60/month
**Pros:**
- Deploy in 5 minutes
- Zero infrastructure management
- Auto-deploy from GitHub

**Cons:**
- Slightly more expensive
- Less control over networking

---

## Quick Deploy (ECS Fargate)

### Step 1: Install AWS CLI
```powershell
# Windows
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

### Step 2: Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

### Step 3: Create ECR Repositories
```bash
aws ecr create-repository --repository-name autorepost-api --region us-east-1
aws ecr create-repository --repository-name autorepost-worker --region us-east-1
```

### Step 4: Build and Push Docker Images
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push API
docker build -t autorepost-api -f apps/api/Dockerfile .
docker tag autorepost-api:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-api:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-api:latest

# Build and push Worker
docker build -t autorepost-worker -f apps/worker/Dockerfile .
docker tag autorepost-worker:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-worker:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-worker:latest
```

### Step 5: Deploy Using AWS Console

1. **Create ECS Cluster:**
   - Go to: https://console.aws.amazon.com/ecs
   - Click "Create Cluster"
   - Name: `autorepost-cluster`
   - Infrastructure: AWS Fargate

2. **Create Task Definition for API:**
   - Click "Task Definitions" → "Create new Task Definition"
   - Family: `autorepost-api-task`
   - Launch type: Fargate
   - CPU: 0.5 vCPU
   - Memory: 1 GB
   - Container image: `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autorepost-api:latest`
   - Port mappings: 4000
   - Environment variables: Add from your `.env` file

3. **Create Task Definition for Worker:**
   - Same steps as API
   - Family: `autorepost-worker-task`
   - CPU: 0.25 vCPU
   - Memory: 0.5 GB
   - No port mappings (worker doesn't expose HTTP)

4. **Create Application Load Balancer:**
   - Go to: https://console.aws.amazon.com/ec2/v2/home?#LoadBalancers
   - Create ALB → Internet-facing
   - Target group: HTTP 4000 → Health check: `/health`

5. **Create ECS Services:**
   - API Service: Link to ALB target group
   - Worker Service: No load balancer

### Step 6: Setup GitHub Actions for Auto-Deploy

1. Go to your repo: https://github.com/Jkratz01/autorepost-dash/settings/secrets/actions
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID` → Your AWS access key
   - `AWS_SECRET_ACCESS_KEY` → Your AWS secret key
3. Update `.github/workflows/deploy-aws.yml` with your:
   - AWS Account ID
   - ECS Cluster name
   - ECS Service names
4. Push to main → Auto-deploys! 🎉

---

## Test Locally First (Recommended)

```bash
# Copy your .env file
cp .env .env.local

# Start all services with Docker Compose
docker-compose up

# Test API
curl http://localhost:4000/health

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Stop services
docker-compose down
```

---

## Cost Breakdown

### ECS Fargate Monthly Costs:
- **API Service** (0.5 vCPU, 1 GB RAM): ~$15/month
- **Worker Service** (0.25 vCPU, 0.5 GB RAM): ~$7/month
- **Application Load Balancer**: ~$16/month
- **S3 Storage** (media files): ~$5/month
- **Data Transfer**: ~$5/month
- **CloudWatch Logs**: ~$2/month

**Total:** ~$50/month

### Keep Using (Free Tier):
- Supabase PostgreSQL: Free (up to 500MB)
- Upstash Redis: Free (10k commands/day)
- Supabase Storage: Free (1GB)

---

## Monitoring After Deployment

### Check Service Health
```bash
aws ecs describe-services --cluster autorepost-cluster --services autorepost-api-service
```

### View Logs
```bash
aws logs tail /ecs/autorepost-api --follow
aws logs tail /ecs/autorepost-worker --follow
```

### Check Costs
- Go to: https://console.aws.amazon.com/billing
- Enable Cost Explorer
- Set budget alerts

---

## Troubleshooting

### Container Won't Start?
- Check CloudWatch Logs for errors
- Verify all environment variables are set
- Check task execution role has ECR pull permissions

### Database Connection Failed?
- Ensure security group allows outbound traffic
- Verify DATABASE_URL in environment variables
- Check Supabase allows connections from AWS region

### High Costs?
- Check for zombie resources (old task definitions, images)
- Use Fargate Spot for worker (70% cheaper)
- Set CloudWatch log retention to 7 days

---

## Next Steps

1. ✅ **Change your AWS API key** (you shared it publicly - rotate immediately!)
2. 📖 **Read full guide:** `docs/AWS_DEPLOYMENT.md`
3. 🐳 **Test locally:** `docker-compose up`
4. ☁️ **Deploy to AWS:** Follow Step 1-6 above
5. 🔄 **Setup CI/CD:** Add GitHub secrets
6. 📊 **Monitor:** Setup CloudWatch alarms

---

## Support Resources

- **AWS Documentation:** https://docs.aws.amazon.com/ecs/
- **Docker Documentation:** https://docs.docker.com/
- **Your Full Guide:** `docs/AWS_DEPLOYMENT.md`
- **GitHub Actions Logs:** https://github.com/Jkratz01/autorepost-dash/actions

---

## Security Reminder 🔒

**IMPORTANT:** The AWS API key you shared earlier must be rotated immediately:
1. Go to: https://console.aws.amazon.com/iam/home#/security_credentials
2. Delete the exposed key
3. Generate a new key
4. Never share keys in chat again - use GitHub Secrets instead

---

**Questions?** Everything you need is in `docs/AWS_DEPLOYMENT.md`!

Good luck with your deployment! 🚀
