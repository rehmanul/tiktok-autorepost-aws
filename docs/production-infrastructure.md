# Production Infrastructure Playbook

This document captures the baseline blueprint for running the autorepost platform in production. Treat it as the source of truth for the infra-as-code repo (`infra/terraform`) and keep it updated as we evolve the stack.

## Target Environment

| Component | Recommendation |
| --- | --- |
| Cloud provider | AWS (RDS + ElastiCache + S3 + ECS/EKS/EC2) |
| Database | Amazon RDS for PostgreSQL (multi-AZ, automatic backups) |
| Cache/Queue | Amazon ElastiCache for Redis (cluster mode disabled, TLS in-transit) |
| Object storage | Amazon S3 (versioned bucket, default encryption SSE-S3/KMS) |
| Runtime | ECS Fargate services (`api`, `worker`) behind an ALB with HTTPS (ACM issued cert) |
| Secrets | AWS Secrets Manager (per-service secret bundles) |
| CI/CD | GitHub Actions → AWS CodeDeploy (or ECS blue/green) |
| Observability | CloudWatch metrics/logs + Datadog/Sentry for APM/error tracking |

## Networking & Security

1. **VPC**: three AZs, public subnets for ALB, private subnets for ECS tasks and databases.
2. **Security groups**:
   - ALB: allow `0.0.0.0/0` on 443 → forward to API target group.
   - API/worker: allow inbound only from ALB/peer security groups; outbound 443.
   - RDS/Redis: allow inbound from ECS tasks only.
3. **IAM**:
   - Task roles with least privilege (S3 read/write limited to `S3_BUCKET`, Secrets Manager read, CloudWatch logs).
   - S3 bucket policy forcing TLS + encryption.
4. **TLS**:
   - ACM certificate on ALB.
   - Force HTTPS redirect.

## Secrets & Config

Use AWS Secrets Manager to store the following per environment (`prod`, `staging`):

| Secret key | Notes |
| --- | --- |
| `DATABASE_URL` | RDS endpoint with IAM auth or password, rotate quarterly. |
| `REDIS_URL` | `rediss://` scheme (TLS). |
| `TOKEN_ENCRYPTION_KEY` | Base64 32-byte value, rotate every 90 days. |
| `TIKTOK_COOKIE` | Encrypted copy of cookie jar, rotate weekly (automation webhook). |
| `TIKTOK_SESSION_ID`, `TIKTOK_WEBID` | Extracted from cookie jar after rotation. |
| OAuth payloads | `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `TWITTER_CONSUMER_KEY`, `TWITTER_CONSUMER_SECRET`. |
| Worker credentials | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `PROMETHEUS_PUSH_URL` (if using pushgateway). |

Automation: create a Secrets Manager rotation Lambda for cookie/session values to keep them fresh.

## Deployment Workflow

1. Developer merges to `main`.
2. GitHub Actions workflow runs lint/test/build, publishes images to ECR.
3. Terraform pipeline updates infrastructure (tagged release).
4. ECS service updated via CodeDeploy blue/green.
5. Post-deploy smoke tests executed (API health, worker job execution).

## Health Gates

Mandatory checks before promoting to `prod`:

- `npm run test` (unit/integration) passing.
- Prisma migrations applied in staging (`npx prisma migrate deploy`).
- Synthetic TikTok sync + repost job executed end-to-end in staging.
- Error budgets within SLOs (24h rolling).

## Cookie Rotation SOP

1. Login to TikTok business account with puppeteer automation.
2. Extract cookie jar → Secrets Manager (base64 encoded JSON).
3. Update `TIKTOK_SESSION_ID` and `TIKTOK_WEBID`.
4. Trigger worker `TOKEN_REFRESH` job for all TikTok connections to ensure continuity.

## Infra Repo Layout (`infra/terraform`)

```
infra/terraform
├── environments/
│   ├── staging/
│   │   └── main.tf
│   └── production/
│       └── main.tf
├── modules/
│   ├── network/ (VPC, subnets, security groups)
│   ├── ecs-service/ (task definition, service, autoscaling)
│   ├── db/ (RDS)
│   ├── redis/ (ElastiCache)
│   └── s3-bucket/
└── providers.tf
```

Keep Terraform state in an S3 backend with state locking via DynamoDB.

## Next Steps Checklist

- [ ] Bootstrap Terraform backend (S3/Dynamo).
- [ ] Provision VPC + networking.
- [ ] Spin up staging RDS, Redis, S3 bucket.
- [ ] Configure Secrets Manager entries.
- [ ] Deploy ECS services with latest containers.
- [ ] Set up Route53 + ALB with ACM cert.
- [ ] Implement cookie rotation automation (Lambda or GitHub Action).
- [ ] Complete staging soak tests and document results in release notes.
