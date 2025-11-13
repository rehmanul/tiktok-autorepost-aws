# Security Checklist

Pre-deployment security checklist for autorepost-dash platform.

## 🔐 Pre-Deployment Checklist

### Environment Variables

- [ ] **`.env` file is gitignored** - Verify it's listed in `.gitignore`
- [ ] **No secrets in git history** - Check `git log` for accidentally committed secrets
- [ ] **TOKEN_ENCRYPTION_KEY is unique per environment** - Different keys for dev/staging/production
- [ ] **TOKEN_ENCRYPTION_KEY is base64-encoded 32-byte string** - Generated with `npm run generate:token-key`
- [ ] **All required environment variables are set** - Run `npm run verify:setup`
- [ ] **Production URLs are correct** - Check all `*_REDIRECT_URI` and `*_CALLBACK_URL` variables

### Database & Authentication

- [ ] **Using Supabase SERVICE_ROLE_KEY (not anon key)** - Service role key required for backend
- [ ] **Supabase Row Level Security (RLS) enabled** - Check policies in Supabase dashboard
- [ ] **Database backups configured** - Enable point-in-time recovery in Supabase
- [ ] **DATABASE_URL uses Direct connection** - Not connection pooler URL
- [ ] **Database password is strong** - At least 20 characters, randomly generated
- [ ] **Admin user created with strong password** - Run `npm run setup:supabase`

### Network Security

- [ ] **HTTPS enabled for all services** - Never use HTTP in production
- [ ] **CORS_ORIGIN set to production frontend URL** - Not wildcard (`*`)
- [ ] **Redis TLS enabled** - `REDIS_TLS=true` for production
- [ ] **S3 bucket is private** - Public access blocked by default
- [ ] **S3 access keys have minimal permissions** - Only what's needed for the app

### OAuth Security

- [ ] **OAuth redirect URIs match exactly** - No wildcards, exact match required
- [ ] **OAuth apps in production mode** - Not development/sandbox
- [ ] **OAuth secrets are strong** - If you can generate them, make them long/random
- [ ] **OAuth tokens encrypted at rest** - Verified `TOKEN_ENCRYPTION_KEY` is set
- [ ] **OAuth scopes are minimal** - Only request what you need

### Application Security

- [ ] **Rate limiting enabled** - `@nestjs/throttler` configured
- [ ] **Admin role properly restricted** - Check `RolesGuard` implementation
- [ ] **Tenant isolation enforced** - All queries filter by `tenantId`
- [ ] **JWT tokens expire** - Check token TTL in Supabase settings
- [ ] **Audit logging enabled** - Activity tracking via `AuditEvent` model
- [ ] **Input validation active** - `class-validator` DTOs on all endpoints

### Infrastructure

- [ ] **Firewall rules configured** - Only necessary ports exposed
- [ ] **DDoS protection enabled** - Use Cloudflare or similar
- [ ] **Services run as non-root user** - Check Dockerfile/process manager
- [ ] **File upload size limited** - Check `serverActions.bodySizeLimit` in Next.js config
- [ ] **Dependencies up to date** - Run `npm audit` and fix vulnerabilities
- [ ] **Node.js version supported** - Using LTS version

## 🚨 High-Risk Areas

### Critical to Review Before Launch

1. **Token Encryption**
   - Location: `apps/api/src/modules/security/token-cipher.service.ts`
   - Risk: If `TOKEN_ENCRYPTION_KEY` leaks, all OAuth tokens are compromised
   - Mitigation: Store in secure secret manager, rotate if compromised

2. **Supabase Service Role Key**
   - Used in: `apps/api/src/modules/auth/supabase.service.ts`
   - Risk: Bypasses Row Level Security policies
   - Mitigation: Never expose in frontend, use only in backend services

3. **Multi-Tenancy Enforcement**
   - Locations: All Prisma queries in service files
   - Risk: Data leakage between tenants
   - Mitigation: Always filter by `tenantId`, use `TenantScopeGuard`

4. **OAuth State Parameter**
   - Location: `apps/api/src/modules/oauth/oauth.service.ts`
   - Risk: CSRF attacks on OAuth flows
   - Mitigation: Validate state parameter, store in Redis with expiration

5. **File Upload Handling**
   - Locations: Worker S3 upload logic in `apps/worker/src/main.ts`
   - Risk: Malicious file uploads, storage exhaustion
   - Mitigation: Validate file types, implement size limits, scan for malware

## 🔍 Post-Deployment Verification

### Health Checks

```bash
# API health endpoint
curl https://your-api-domain.com/health

# Expected: {"status":"ok"}

# Prometheus metrics
curl https://your-api-domain.com/metrics

# Expected: Prometheus metrics output
```

### Security Headers

```bash
# Check security headers
curl -I https://your-frontend-domain.com

# Should include:
# - Strict-Transport-Security
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
```

### OAuth Flows

- [ ] Test Instagram connection end-to-end
- [ ] Test YouTube connection end-to-end
- [ ] Test Twitter connection end-to-end
- [ ] Verify tokens are encrypted in database
- [ ] Verify token refresh works correctly

### Monitoring Setup

- [ ] **Error tracking configured** - Sentry, Rollbar, or similar
- [ ] **Uptime monitoring** - Pingdom, UptimeRobot, or similar
- [ ] **Log aggregation** - CloudWatch, Datadog, or similar
- [ ] **Metrics dashboard** - Prometheus + Grafana
- [ ] **Alert thresholds set** - For errors, downtime, queue depth

## 🛡️ Ongoing Security Practices

### Weekly

- [ ] Review audit logs for suspicious activity
- [ ] Check error logs for security issues
- [ ] Monitor API rate limits and abuse patterns

### Monthly

- [ ] Run `npm audit` and update dependencies
- [ ] Review user access and revoke unused accounts
- [ ] Check S3 storage usage and costs
- [ ] Verify backups are working

### Quarterly

- [ ] Rotate OAuth secrets (if provider allows)
- [ ] Review and update security policies
- [ ] Conduct security audit
- [ ] Test disaster recovery procedures

### Annually

- [ ] Penetration testing
- [ ] Security compliance review
- [ ] Rotate TOKEN_ENCRYPTION_KEY (complex - requires data migration)

## 🔧 Security Incident Response

### If TOKEN_ENCRYPTION_KEY is Compromised

1. **Immediate**: Rotate the key in environment variables
2. **Alert**: Notify all users that their social media connections need to be re-authenticated
3. **Cleanup**: Delete all encrypted tokens from database
4. **Investigation**: Check logs for unauthorized access
5. **Prevention**: Implement secret rotation policy

### If OAuth Credentials are Compromised

1. **Immediate**: Revoke credentials in OAuth provider dashboard
2. **Generate**: Create new credentials
3. **Update**: Update environment variables in all environments
4. **Redeploy**: Restart all services
5. **Notify**: Inform users if their accounts were affected

### If Database is Compromised

1. **Immediate**: Disable database public access
2. **Reset**: Change all database passwords
3. **Review**: Check audit logs for data access
4. **Rotate**: Rotate TOKEN_ENCRYPTION_KEY (see above)
5. **Notify**: Follow data breach notification requirements

### If User Account is Compromised

1. **Immediate**: Revoke user sessions (delete from `UserSession` table)
2. **Reset**: Force password reset via Supabase
3. **Review**: Check audit logs for unauthorized actions
4. **Notify**: Email user about suspicious activity
5. **Cleanup**: Revoke affected social media connections

## 📚 Security Resources

### Documentation

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)

### Tools

- `npm audit` - Check for known vulnerabilities
- [Snyk](https://snyk.io/) - Dependency scanning
- [OWASP ZAP](https://www.zaproxy.org/) - Web application scanner
- [Prisma Studio](https://www.prisma.io/studio) - Database inspection

### Compliance

- **GDPR** - If serving EU users
- **CCPA** - If serving California users
- **SOC 2** - If handling sensitive data
- **COPPA** - If allowing users under 13

## ✅ Pre-Launch Sign-Off

Final checklist before going live:

- [ ] All items in "Pre-Deployment Checklist" completed
- [ ] All "High-Risk Areas" reviewed
- [ ] "Post-Deployment Verification" tests passed
- [ ] Security incident response plan documented
- [ ] Team trained on security procedures
- [ ] Backup/restore tested successfully
- [ ] Monitoring and alerting configured
- [ ] Legal/compliance requirements met

**Signed off by:** ___________________________

**Date:** ___________________________

---

**Remember:** Security is an ongoing process, not a one-time checklist. Review and update this document regularly as threats evolve and the application changes.
