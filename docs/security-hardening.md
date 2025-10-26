# Security Hardening Checklist

## Access Control

- [ ] Enforce short-lived AWS credentials via IAM roles (no static keys).
- [ ] Restrict Secrets Manager access to specific task roles.
- [ ] Enable MFA for all admin accounts (cloud + TikTok + OAuth providers).
- [ ] Use fine-grained Prisma middleware for tenant isolation (verify `tenantId` on every query).

## API Surface

- [ ] Enable rate limiting middleware (e.g., `@nestjs/throttler`) with IP + tenant keys.
- [ ] Enforce CORS allowlist (production domains only).
- [ ] Validate all incoming payloads via DTOs + `class-validator`.
- [ ] Add auth guard (JWT/access token) for API routes; rotate signing keys every 90 days.
- [ ] Audit log for every admin action (persist in `AuditEvent` table).

## Worker Safety

- [ ] Enforce idempotency by storing job fingerprints (TikTok video ID + rule).
- [ ] Clamp media size and duration before upload (protect against oversized payloads).
- [ ] Sanitize captions before reposting (prevent destination injection).
- [ ] Encrypt temporary media at rest (S3 bucket with SSE-KMS).

## Tokens & Cookies

- [ ] Store OAuth tokens in Secrets Manager encrypted with KMS CMK.
- [ ] Rotate `TOKEN_ENCRYPTION_KEY` quarterly (double-write assisted rotation).
- [ ] Build automation to refresh Instagram/YouTube/Twitter tokens and alert on failures.
- [ ] TikTok cookie rotation SOP executed at least weekly.

## Logging & PII

- [ ] Scrub tokens, session IDs, and cookies from logs (`pino` serializers).
- [ ] Limit log retention (14 days CloudWatch, 30 days Datadog).
- [ ] Mark PII fields in Prisma schema (`@@map`) and ensure GDPR compliance (delete on request).

## Dependency Hygiene

- [ ] Enable Dependabot for npm & GitHub Actions.
- [ ] Run `npm audit` weekly; triage CVEs > medium.
- [ ] Pin container base images and scan via Trivy/Grype.

## Network & Data

- [ ] Force TLS 1.2+ everywhere (ALB, RDS, Redis, S3).
- [ ] Configure RDS automated backups + PITR, and enable deletion protection.
- [ ] Turn on Redis AUTH with in-transit encryption.
- [ ] Enable S3 versioning + lifecycle to Glacier.

## Incident Response

- [ ] PagerDuty escalation policy with 24/7 coverage.
- [ ] Playbooks for:
  - TikTok cookie compromise.
  - OAuth token breach.
  - Data exfiltration (S3 or DB).

## Compliance

- [ ] Document data flows and storage locations (data inventory).
- [ ] Draft privacy policy covering auto-reposting.
- [ ] Ensure terms of service include API usage disclaimers per platform (TikTok, Meta, Google, X).
