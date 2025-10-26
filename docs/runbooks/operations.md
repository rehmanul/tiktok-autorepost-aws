# Operations Runbook

## 1. Worker Scaling

### Horizontal
- Autoscale ECS service (worker) based on `ApproximateNumberOfMessagesVisible` in Redis/BullMQ or custom CloudWatch metric.
- Scaling policy: `desired = max(1, min(8, queue_depth / 50))`.
- Ensure new tasks warm-up by running `/health` endpoints before sending jobs.

### Vertical
- Increase `WORKER_CONCURRENCY` incrementally (2 → 4) and monitor Redis CPU/latency.
- Adjust S3 bandwidth and TikTok rate limits accordingly.

## 2. Replay Failed Jobs

1. Use BullMQ UI or CLI:
   ```bash
   node scripts/retry-jobs.js --queue=repost-dispatch --status=failed --count=50
   ```
2. Confirm underlying issue resolved (token refresh, destination outage).
3. Annotate incident in Slack with job IDs and actions taken.

## 3. TikTok Sync Incident

| Symptom | Action |
| --- | --- |
| Sync job timeout | Check TikTok availability, rotate cookies, rerun sync job (`scheduleProcessingJob` with `TIKTOK_SYNC`). |
| HTTP 429 | Reduce sync frequency, ensure cookie rotation not expired. |
| Empty feed | Validate username, ensure account still public. |

Escalation: if outage > 30 min, post status page update; notify TikTok partner contact if available.

## 4. Destination Upload Failures

- **Instagram**: Inspect Graph API response; check video format and IG business account mapping. Run token refresh job.
- **YouTube**: Verify refresh token valid; check Google API quota (YouTube Data API). Rotate client secret if compromise suspected.
- **Twitter**: Confirm consumer/app credentials, ensure media < 512MB/140 seconds.

Document resolution in incident tracker with root cause.

## 5. Disaster Recovery

### Database
- RDS PITR: recover to latest restorable time, restore into new instance, swap connection string.
- Keep daily snapshots for 7 days.

### Redis
- Use ElastiCache backup/restore; if unavailable, rebuild queue, reconcile stuck jobs via `PostLog` + `RepostActivity`.

### S3
- Restore deleted objects via versioning. For catastrophic failure, use cross-region replication bucket.

## 6. Deploy Procedures

1. Merge PR with green CI.
2. Tag release: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. Trigger GitHub Actions deploy workflow (future step) → pushes Docker images to ECR.
4. Terraform apply (staging), run smoke tests:
   ```bash
   npm run smoke:test -- --env=staging
   ```
5. Promote to production via CodeDeploy blue/green.
6. Monitor dashboards for 30 minutes post-deploy.

## 7. On-Call Checklist

- PagerDuty alert received → ack within 5 min.
- Follow runbook relevant to alert.
- Update incident channel every 15 min until resolved.
- After resolution:
  - Postmortem template (within 24h).
  - Identify mitigations (automation, alert tuning).

## 8. Scheduled Maintenance

- TikTok cookie rotation: every Tuesday 09:00 UTC.
- OAuth token refresh validation: run weekly cron to ensure refresh path works.
- Dependency audit: run `npm audit` & `npm outdated` monthly.
- Terraform drift check: `terraform plan` weekly.
- Secrets rotation: `TOKEN_ENCRYPTION_KEY` quarterly; OAuth secrets semiannual.
