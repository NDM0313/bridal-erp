# Phase E: Environment Configuration Guide

## Environment Variables Reference

### Backend Environment Variables

#### Required Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_xxx

# Server Configuration
NODE_ENV=production|staging|development
PORT=3001

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

#### Optional Variables

```env
# WhatsApp Integration (Phase D)
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_API_URL=https://api.whatsapp.com

# Error Tracking (Recommended)
SENTRY_DSN=https://xxx@sentry.io/xxx

# Logging
LOG_LEVEL=info|warn|error|debug
```

---

### Frontend Environment Variables

#### Required Variables

```env
# Supabase Configuration (Anon Key Only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx

# Backend API
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### Optional Variables

```env
# Analytics (if using)
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

---

## Environment-Specific Configuration

### Development

**Backend** (`backend/.env`):
```env
NODE_ENV=development
SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_dev_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_dev_xxx
PORT=3001
CORS_ORIGIN=http://localhost:3000
WHATSAPP_API_KEY=dev_key
WHATSAPP_API_URL=http://localhost:3002
LOG_LEVEL=debug
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dev_xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Database**: Separate Supabase project for development

---

### Staging

**Backend** (Platform environment variables):
```env
NODE_ENV=staging
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_staging_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_staging_xxx
PORT=3001
CORS_ORIGIN=https://staging.yourdomain.com
WHATSAPP_API_KEY=staging_key
WHATSAPP_API_URL=https://staging-whatsapp-api.com
LOG_LEVEL=info
```

**Frontend** (Platform environment variables):
```env
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_staging_xxx
NEXT_PUBLIC_API_URL=https://staging-api.yourdomain.com
```

**Database**: Separate Supabase project for staging

---

### Production

**Backend** (Platform environment variables):
```env
NODE_ENV=production
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=sb_publishable_prod_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_prod_xxx
PORT=3001
CORS_ORIGIN=https://yourdomain.com
WHATSAPP_API_KEY=prod_key
WHATSAPP_API_URL=https://prod-whatsapp-api.com
LOG_LEVEL=warn
SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Frontend** (Platform environment variables):
```env
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_prod_xxx
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Database**: Separate Supabase project for production

---

## Secrets Management

### Storage Strategy

**Development**:
- `.env` file (gitignored)
- Local machine only
- Never commit to git

**Staging/Production**:
- Platform environment variables (Vercel/Railway/etc.)
- Encrypted at rest
- Access controlled

### Secret Rotation

**Frequency**: Every 90 days (recommended)

**Process**:
1. Generate new keys in Supabase dashboard
2. Update environment variables in deployment platform
3. Restart services
4. Verify functionality
5. Delete old keys

---

## Webhook URL Strategy

### WhatsApp Webhook URLs

**Development**:
```
http://localhost:3001/api/v1/social/webhook/whatsapp?business_id=1
```
- Use ngrok: `https://abc123.ngrok.io/api/v1/social/webhook/whatsapp?business_id=1`

**Staging**:
```
https://staging-api.yourdomain.com/api/v1/social/webhook/whatsapp?business_id=1
```

**Production**:
```
https://api.yourdomain.com/api/v1/social/webhook/whatsapp?business_id=1
```

### Configuration

**In WhatsApp Provider Dashboard**:
1. Go to Webhook settings
2. Set webhook URL (environment-specific)
3. Set webhook secret
4. Save webhook secret in `social_channels.webhook_secret`

**In Database**:
```sql
UPDATE social_channels
SET webhook_secret = 'your_webhook_secret'
WHERE business_id = 1
  AND channel_type = 'whatsapp';
```

---

## Environment Verification

### Pre-Deployment Check

```bash
# Check backend env vars are set
echo $SUPABASE_URL
echo $NODE_ENV
echo $CORS_ORIGIN

# Check frontend env vars (in deployment platform)
# Verify no secrets in code
git grep -i "service_role" -- "*.js" "*.ts" "*.json"
```

### Post-Deployment Check

```bash
# Test health endpoint
curl https://api.yourdomain.com/test/health

# Test authentication
curl -H "Authorization: Bearer <token>" \
     https://api.yourdomain.com/api/v1/sales
```

---

## Security Best Practices

1. **Never Commit Secrets**:
   - ✅ `.env` files in `.gitignore`
   - ✅ No secrets in code
   - ✅ No secrets in git history

2. **Use Different Keys Per Environment**:
   - ✅ Development keys for dev
   - ✅ Staging keys for staging
   - ✅ Production keys for production

3. **Rotate Keys Regularly**:
   - ✅ Every 90 days (recommended)
   - ✅ Immediately if compromised
   - ✅ Document rotation process

4. **Limit Access**:
   - ✅ Only authorized personnel can access secrets
   - ✅ Use platform access controls
   - ✅ Audit secret access

---

**Status**: ✅ **Configuration Guide Complete**  
**Ready For**: Environment Setup

---

**Last Updated**: January 8, 2026
