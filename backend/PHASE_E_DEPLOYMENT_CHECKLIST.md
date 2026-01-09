# Phase E: Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Variables

**Backend**:
- [ ] `SUPABASE_URL` set (production project)
- [ ] `SUPABASE_ANON_KEY` set (production anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (production service role key)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` set to production frontend URL
- [ ] `WHATSAPP_API_KEY` set (if using WhatsApp)
- [ ] `WHATSAPP_API_URL` set (if using WhatsApp)
- [ ] `PORT` set (default: 3001)

**Frontend**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set (production project)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (production anon key)
- [ ] `NEXT_PUBLIC_API_URL` set (production backend URL)
- [ ] NO service role key in frontend

**Verification**:
```bash
# Check backend env vars
echo $SUPABASE_URL
echo $NODE_ENV

# Check frontend env vars (in deployment platform)
# Verify no secrets in code
git grep -i "service_role" -- "*.js" "*.ts"
```

---

### 2. Database

**Supabase Production Project**:
- [ ] Production project created (separate from staging/dev)
- [ ] All migrations applied:
  - [ ] Core schema
  - [ ] Phase A migrations (Sale → Production)
  - [ ] Phase B migrations (Worker)
  - [ ] Phase C migrations (Costing)
  - [ ] Phase D migrations (Social Media)
- [ ] RLS policies enabled on all tables
- [ ] RLS policies tested
- [ ] Indexes created
- [ ] Foreign keys verified

**Verification**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false;

-- Check critical tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'transactions', 'products', 'production_orders', 
    'production_steps', 'social_channels', 'social_messages'
  );
```

---

### 3. API Endpoints

**Health Check**:
- [ ] `GET /test/health` returns 200
- [ ] Database connection verified
- [ ] Supabase connection verified

**Critical Endpoints**:
- [ ] `POST /api/v1/sales` - Create sale
- [ ] `GET /api/v1/sales` - List sales
- [ ] `GET /api/v1/worker/steps` - Worker steps
- [ ] `POST /api/v1/social/webhook/whatsapp` - WhatsApp webhook
- [ ] `GET /api/v1/production/cost-reports` - Cost reports

**Verification**:
```bash
# Health check
curl https://api.yourdomain.com/test/health

# Test authentication
curl -H "Authorization: Bearer <token>" \
     https://api.yourdomain.com/api/v1/sales
```

---

### 4. Security

**Authentication**:
- [ ] JWT token validation working
- [ ] Token expiration handled
- [ ] Refresh token flow (if implemented)

**Authorization**:
- [ ] Role-based access control working
- [ ] `403 Forbidden` returned for unauthorized access
- [ ] Production worker can only access assigned steps

**Secrets**:
- [ ] No secrets in code
- [ ] No secrets in git history
- [ ] Service role key only in backend
- [ ] Webhook secrets stored securely

**Verification**:
```bash
# Test unauthorized access
curl -H "Authorization: Bearer invalid_token" \
     https://api.yourdomain.com/api/v1/sales
# Should return 401

# Test role-based access
curl -H "Authorization: Bearer <production_worker_token>" \
     https://api.yourdomain.com/api/v1/sales
# Should return 403
```

---

### 5. Webhooks

**WhatsApp Webhook**:
- [ ] Webhook URL configured in WhatsApp provider
- [ ] Webhook secret set in `social_channels` table
- [ ] Signature validation working
- [ ] Test webhook received successfully

**Verification**:
```bash
# Test webhook endpoint
curl -X POST https://api.yourdomain.com/api/v1/social/webhook/whatsapp?business_id=1 \
     -H "Content-Type: application/json" \
     -H "X-Signature: <signature>" \
     -d '{"phoneNumber": "+1234567890", "messageText": "test"}'
```

---

### 6. Monitoring & Logging

**Logging**:
- [ ] Logging configured (Winston or similar)
- [ ] Log levels set appropriately
- [ ] Logs accessible in deployment platform

**Error Tracking**:
- [ ] Sentry configured (if using)
- [ ] Error alerts set up
- [ ] Error notifications working

**Monitoring**:
- [ ] Uptime monitoring configured
- [ ] Performance monitoring configured
- [ ] Database monitoring configured

---

### 7. Backup & Recovery

**Database Backups**:
- [ ] Supabase automatic backups enabled
- [ ] Backup retention policy set
- [ ] Backup restoration tested

**Code Backups**:
- [ ] Git repository backed up
- [ ] Deployment configuration backed up
- [ ] Environment variables backed up (securely)

---

### 8. Performance

**API Performance**:
- [ ] Response times acceptable (< 500ms for most endpoints)
- [ ] Database queries optimized
- [ ] Indexes created on frequently queried columns

**Load Testing**:
- [ ] Load testing performed
- [ ] Concurrent user limits known
- [ ] Scaling strategy defined

---

## Deployment Steps

### Step 1: Deploy Backend

1. **Set Environment Variables** in deployment platform
2. **Deploy Code** (git push or manual deploy)
3. **Verify Deployment** (health check)
4. **Test Critical Endpoints**

### Step 2: Deploy Frontend

1. **Set Environment Variables** in deployment platform
2. **Build Frontend** (`npm run build`)
3. **Deploy Frontend** (Vercel/Netlify/etc.)
4. **Verify Deployment** (visit URL, test login)

### Step 3: Configure Webhooks

1. **Update WhatsApp Webhook URL** in provider dashboard
2. **Set Webhook Secret** in `social_channels` table
3. **Test Webhook** (send test message)

### Step 4: Monitor

1. **Monitor Logs** for errors
2. **Monitor Performance** metrics
3. **Monitor Error Rates**
4. **Monitor User Activity**

---

## Post-Deployment Verification

### Day 1
- [ ] All critical endpoints working
- [ ] No errors in logs
- [ ] User login working
- [ ] Sale creation working
- [ ] Production order creation working

### Day 7
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Monitoring alerts configured

### Day 30
- [ ] System stable
- [ ] No major issues
- [ ] Scaling plan ready (if needed)
- [ ] Documentation updated

---

## Rollback Plan

**If Issues Detected**:

1. **Immediate Rollback**:
   - Switch load balancer to previous version
   - Verify previous version working

2. **Investigate**:
   - Check logs for errors
   - Identify root cause
   - Fix in staging

3. **Re-deploy**:
   - Test fix in staging
   - Deploy to production
   - Monitor closely

---

**Status**: ✅ **Checklist Complete**  
**Ready For**: Production Deployment

---

**Last Updated**: January 8, 2026
