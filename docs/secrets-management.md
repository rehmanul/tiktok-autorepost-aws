# Secrets Management Guide

This guide explains how to move sensitive configuration from local `.env` files into AWS Secrets Manager so services can read them securely.

## Secret Layout

Create a namespaced secret per environment:

- `autorepost/staging/app`
- `autorepost/staging/worker`
- `autorepost/production/app`
- `autorepost/production/worker`

Each secret should contain a JSON payload similar to:

```json
{
  "DATABASE_URL": "postgresql://...",
  "REDIS_URL": "rediss://...",
  "TOKEN_ENCRYPTION_KEY": "base64-32-byte-key",
  "TIKTOK_COOKIE": "[...]",
  "TIKTOK_SESSION_ID": "session-id",
  "TIKTOK_WEBID": "verify_xxx",
  "S3_ENDPOINT": "https://s3.amazonaws.com",
  "S3_BUCKET": "autorepost-prod-media",
  "S3_ACCESS_KEY_ID": "...",
  "S3_SECRET_ACCESS_KEY": "...",
  "INSTAGRAM_APP_ID": "...",
  "INSTAGRAM_APP_SECRET": "...",
  "YOUTUBE_CLIENT_ID": "...",
  "YOUTUBE_CLIENT_SECRET": "...",
  "TWITTER_CONSUMER_KEY": "...",
  "TWITTER_CONSUMER_SECRET": "...",
  "PROMETHEUS_PUSH_URL": "https://push.example.com/metrics"
  "SUPABASE_URL": "https://xyz.supabase.co",
  "SUPABASE_SERVICE_ROLE_KEY": "...",
  "SUPABASE_JWT_SECRET": "...",
  "SUPABASE_ANON_KEY": "..."
}
```

Worker secrets should also include:

```json
{
  "METRICS_PORT": "9400"
}
```

Add destination-specific OAuth tokens per connection to the database after encrypting with `TOKEN_ENCRYPTION_KEY`.

## Provisioning Workflow

1. Create the secret:
   ```bash
   aws secretsmanager create-secret \
     --name autorepost/staging/app \
     --secret-string file://secrets/staging-app.json
   ```
2. Update the ECS task definition to include:
   ```json
   "secrets": [
     {
       "name": "DATABASE_URL",
       "valueFrom": "arn:aws:secretsmanager:...:secret:autorepost/staging/app:DATABASE_URL::"
     },
     ...
   ]
   ```
3. For local development, use `aws secretsmanager get-secret-value` and write to `.env` when needed, but do not commit the file.

## Rotation

- **TikTok cookies/session**: rotate weekly via automation script -> update `TIKTOK_COOKIE`, `TIKTOK_SESSION_ID`, `TIKTOK_WEBID`.
- **TOKEN_ENCRYPTION_KEY**: rotate quarterly. Use double-write strategy: introduce new key, re-encrypt tokens, then retire old key.
- **OAuth credentials**: follow provider requirements (Meta, Google, X) and maintain contact details for emergency rotation.

## Access Control

- Assign Secrets Manager read permissions only to the ECS task roles.
- Deny `secretsmanager:GetSecretValue` for IAM users by default; allow via break-glass role with MFA.
- Log every secret read event with CloudTrail and route to the SIEM.
