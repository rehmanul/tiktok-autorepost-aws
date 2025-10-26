# Observability & Alerting Blueprint

## Logging

| Service | Sink | Retention |
| --- | --- | --- |
| API (`@autorepost/api`) | CloudWatch Logs (log group `autorepost/api`) → Datadog log forwarder | 14 days in CW, 30 days in Datadog |
| Worker (`@autorepost/worker`) | CloudWatch Logs (log group `autorepost/worker`) → Datadog | 14 / 30 days |

Structured logging is already emitted via `pino`. Ensure `LOG_LEVEL` is controllable via env (`info` in prod, `debug` only in staging).

## Metrics

| Metric | Source | Description | Alert Threshold |
| --- | --- | --- | --- |
| `api_http_requests_total` | API middleware (add Prometheus endpoint) | Requests by route/method/status | 5xx > 1% over 5 minutes |
| `api_http_request_duration_ms` | API | Histogram of request latency | P95 > 1.5s |
| `worker_jobs_active` | BullMQ / Redis | Jobs in active state | > 100 for 5 min |
| `worker_jobs_failed_total` | BullMQ | Failed jobs per queue | Any spike > 5/min |
| `tiktok_sync_duration_seconds` | Worker custom metric | TikTok sync duration | > 120s |
| `repost_latency_seconds` | Worker custom metric | Source publish → destination publish | > 180s |

Implementation plan:

1. Add Prometheus metrics endpoint to API (NestJS `@willsoto/nestjs-prometheus`).
2. Expose BullMQ metrics using `@bull-monitor/root` or custom instrumentation.
3. Configure CloudWatch metric filters or Datadog integration.
4. Create Grafana dashboard (Prometheus datasource) with:
   - API latency/throughput heatmaps.
   - Worker queue depth, success/failure rate.
   - TikTok vs destination latency comparison.

## Alerts

| Alert | Condition | Destination |
| --- | --- | --- |
| API Availability | `ALB 5xx` > 1% for 5min | PagerDuty + Slack `#alerts` |
| Worker Failure Spike | `worker_jobs_failed_total` increases by 50 in 10 min | PagerDuty high |
| TikTok Sync Degradation | `tiktok_sync_duration_seconds` P95 > 180s for 3 runs | Slack `#ops` |
| Redis Saturation | ElastiCache CPU > 60% | PagerDuty medium |
| RDS Lag | Replication lag > 5s | PagerDuty medium |
| S3 Error Rate | 4xx/5xx > 3% | Slack `#ops` |

Configure alert runbooks to link to `docs/runbooks/operations.md`.

## Tracing

Adopt OpenTelemetry with the following pipeline:

1. API: add OTEL SDK (HTTP instrumentation, NestJS instrumentation) → OTLP exporter.
2. Worker: instrument job handlers (start span per processing job).
3. Collector: run AWS Distro for OpenTelemetry (ADOT) in ECS sidecar → export to Datadog APM or AWS X-Ray.

## Error Tracking

Integrate Sentry:

- API: send HTTP errors (include request id, user id).
- Worker: capture job failures + metadata (rule id, connection id).

## Status Dashboard

Expose `/healthz` (API) + `/metrics` and publish to a public status page (e.g., Instatus/Statuspage) with:

- API availability.
- Worker job latency.
- TikTok → destination success ratio.

## On-Call Runbook Snapshot

1. Check alert source (Prometheus/Datadog).
2. Review recent deploy in GitHub Actions.
3. Examine CloudWatch logs for correlated errors.
4. Inspect Redis queue backlog (BullMQ UI).
5. If TikTok is failing, verify cookie rotation timestamp and session validity in Secrets Manager.
6. For destination failures, check OAuth token refresh logs + rate limits.
