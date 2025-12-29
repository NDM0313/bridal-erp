# Operational Procedures

## 🔐 USER MANAGEMENT

### Disable User Access

**Scenario**: User leaves company or access needs to be revoked

**Steps**:
1. **Disable in Supabase Auth**
   ```sql
   UPDATE auth.users
   SET banned_until = NOW() + INTERVAL '100 years'
   WHERE id = 'user-uuid-here';
   ```

2. **Revoke Role** (optional)
   ```sql
   UPDATE user_profiles
   SET role = 'cashier'  -- or remove entirely
   WHERE user_id = 'user-uuid-here';
   ```

3. **Log Action**
   ```sql
   INSERT INTO audit_logs (
     business_id, user_id, user_role, action, entity_type, details
   ) VALUES (
     (SELECT business_id FROM user_profiles WHERE user_id = 'user-uuid-here'),
     'admin-user-uuid',
     'admin',
     'user_disabled',
     'user',
     '{"disabled_user": "user-uuid-here", "reason": "offboarding"}'
   );
   ```

### Emergency Role Revocation

**Scenario**: Suspected security breach or unauthorized access

**Immediate Actions**:
1. Revoke role (set to cashier)
2. Disable account
3. Review audit logs
4. Notify business owner

**SQL**:
```sql
-- Revoke admin role
UPDATE user_profiles
SET role = 'cashier'
WHERE user_id = 'suspected-user-uuid';

-- Disable account
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '100 years'
WHERE id = 'suspected-user-uuid';

-- Review recent actions
SELECT * FROM audit_logs
WHERE user_id = 'suspected-user-uuid'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 🗄️ DATABASE OPERATIONS

### Manual Backup

**Create Backup**:
```bash
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump
```

**Restore Backup**:
```bash
pg_restore -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  backup_20240101_120000.dump
```

### Point-in-Time Recovery

**Via Supabase Dashboard**:
1. Go to Database → Backups
2. Select point in time
3. Click "Restore to this point"

---

## 📊 MONITORING & ALERTS

### Health Check Endpoints

**Backend**:
```
GET /test/health
Response: { "success": true, "message": "Server and Supabase are connected" }
```

**Frontend**:
- Check Vercel deployment status
- Monitor build logs

### Critical Alerts

**Setup** (UptimeRobot example):
- Monitor: `https://api.yourdomain.com/test/health`
- Interval: 5 minutes
- Alert if: Down for > 1 minute
- Notify: Email + Slack

---

## 🔄 ROLLBACK PROCEDURES

### Application Rollback

**Vercel**:
```bash
vercel rollback
```

**Railway**:
- Dashboard → Deployments → Select previous → Redeploy

**Docker**:
```bash
docker-compose down
docker-compose up -d --image=previous-tag
```

### Database Rollback

**Restore from Backup**:
```bash
pg_restore -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  backup_before_deployment.dump
```

---

## 📝 AUDIT LOG REVIEW

### Review User Actions

```sql
-- User's recent actions
SELECT 
  action,
  entity_type,
  entity_id,
  created_at,
  details
FROM audit_logs
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 50;
```

### Review Business Actions

```sql
-- Business-wide actions (last 24 hours)
SELECT 
  u.email,
  al.action,
  al.entity_type,
  al.created_at
FROM audit_logs al
JOIN auth.users u ON al.user_id = u.id
WHERE al.business_id = 1
  AND al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;
```

---

## 🚨 INCIDENT RESPONSE

### Compromised Account

**Immediate Actions**:
1. Disable account
2. Revoke all sessions
3. Review audit logs
4. Notify business owner
5. Change passwords (if applicable)

**SQL**:
```sql
-- Disable account
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '100 years'
WHERE id = 'compromised-user-uuid';

-- Revoke sessions
DELETE FROM auth.sessions
WHERE user_id = 'compromised-user-uuid';

-- Review actions
SELECT * FROM audit_logs
WHERE user_id = 'compromised-user-uuid'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Database Issue

**Symptoms**: Connection failures, slow queries, errors

**Actions**:
1. Check Supabase status page
2. Review database logs
3. Check connection pool usage
4. Scale database if needed
5. Contact Supabase support if critical

---

**Operational procedures documented!** ✅

