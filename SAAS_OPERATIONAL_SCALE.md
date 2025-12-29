# Operational Scale & Fair Usage

## 🎯 OVERVIEW

This document outlines operational controls, fair usage policies, and abuse prevention for the SaaS platform.

---

## 📊 TENANT LIMITS

### Plan-Based Limits

**Database Schema** (organizations table):
```sql
max_businesses INTEGER DEFAULT 1,
max_users INTEGER DEFAULT 3,
max_locations INTEGER DEFAULT 1,
max_transactions_per_month INTEGER DEFAULT 100,
max_storage_gb INTEGER DEFAULT 1,
max_api_requests_per_hour INTEGER DEFAULT 1000,
```

### Enforcement

**Before Creating Business**:
```javascript
async function canCreateBusiness(organizationId) {
  const { data: org } = await supabase
    .from('organizations')
    .select('max_businesses')
    .eq('id', organizationId)
    .single();
  
  const { count } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  if ((count || 0) >= org.max_businesses) {
    throw new Error('Business limit reached. Upgrade plan to add more businesses.');
  }
  
  return true;
}
```

**Before Creating User**:
```javascript
async function canCreateUser(organizationId) {
  const { data: org } = await supabase
    .from('organizations')
    .select('max_users')
    .eq('id', organizationId)
    .single();
  
  const { count } = await supabase
    .from('organization_users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  if ((count || 0) >= org.max_users) {
    throw new Error('User limit reached. Upgrade plan to add more users.');
  }
  
  return true;
}
```

---

## ⚖️ FAIR USAGE POLICIES

### Rate Limiting

**Per Organization**:
- Free: 100 API requests/hour, 100 transactions/month
- Basic: 1,000 API requests/hour, 1,000 transactions/month
- Pro: 10,000 API requests/hour, unlimited transactions
- Enterprise: Unlimited

**Implementation**:
```javascript
import rateLimit from 'express-rate-limit';

const orgRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    const org = await getOrganization(req.organizationId);
    const limits = {
      free: 100,
      basic: 1000,
      pro: 10000,
      enterprise: 1000000,
    };
    return limits[org.subscription_plan] || 100;
  },
  keyGenerator: (req) => req.organizationId,
  message: 'Rate limit exceeded. Upgrade plan for higher limits.',
});

// Apply to API routes
app.use('/api/v1', orgRateLimit);
```

### Storage Limits

**Tracking**:
```sql
-- Calculate storage usage
SELECT 
  pg_size_pretty(
    pg_total_relation_size('products') +
    pg_total_relation_size('transactions') +
    pg_total_relation_size('audit_logs')
  ) as total_size
FROM organizations
WHERE id = 1;
```

**Enforcement**:
```javascript
async function checkStorageLimit(organizationId) {
  const { data: org } = await supabase
    .from('organizations')
    .select('max_storage_gb')
    .eq('id', organizationId)
    .single();
  
  const storageUsed = await calculateStorageUsage(organizationId);
  
  if (storageUsed > org.max_storage_gb) {
    throw new Error('Storage limit exceeded. Upgrade plan or delete old data.');
  }
  
  return true;
}
```

---

## 🚨 ABUSE PREVENTION

### Monitoring

**Metrics to Track**:
- API request rate (per hour)
- Transaction volume (per day/month)
- User creation rate
- Failed authentication attempts
- Cross-organization access attempts
- Unusual data patterns

**Database Schema**:
```sql
-- Organization flags
CREATE TABLE organization_flags (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,  -- 'abuse', 'fraud', 'suspicious', 'rate_limit'
    reason TEXT,
    severity VARCHAR(20) NOT NULL,  -- 'low', 'medium', 'high', 'critical'
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Usage anomalies
CREATE TABLE usage_anomalies (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(50) NOT NULL,  -- 'spike', 'unusual_pattern', 'abuse'
    metric_type VARCHAR(50) NOT NULL,  -- 'api_requests', 'transactions', 'users'
    metric_value NUMERIC(10, 2) NOT NULL,
    threshold_value NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Automated Actions

**Auto-Suspend on Critical Flags**:
```sql
CREATE OR REPLACE FUNCTION auto_suspend_abuse()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    UPDATE organizations
    SET subscription_status = 'suspended'
    WHERE id = NEW.organization_id;
    
    -- Log event
    INSERT INTO subscription_events (organization_id, event_type, event_data)
    VALUES (
      NEW.organization_id,
      'auto_suspended',
      jsonb_build_object('reason', NEW.reason, 'flag_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_critical_flag
AFTER INSERT ON organization_flags
FOR EACH ROW
WHEN (NEW.severity = 'critical')
EXECUTE FUNCTION auto_suspend_abuse();
```

**Rate Limit Enforcement**:
```javascript
// Check and flag rate limit violations
async function checkRateLimit(organizationId) {
  const requestsLastHour = await getApiRequestCount(organizationId, '1 hour');
  const org = await getOrganization(organizationId);
  
  const limit = getRateLimit(org.subscription_plan);
  
  if (requestsLastHour > limit * 1.5) {
    // Flag as abuse
    await supabase
      .from('organization_flags')
      .insert({
        organization_id: organizationId,
        flag_type: 'rate_limit',
        reason: `API requests exceeded limit: ${requestsLastHour} > ${limit}`,
        severity: 'high',
      });
    
    // Suspend if critical
    if (requestsLastHour > limit * 10) {
      await suspendOrganization(organizationId, 'Excessive API usage');
    }
  }
}
```

---

## 📈 SCALING CONSIDERATIONS

### Database Scaling

**Read Replicas**:
- Use Supabase read replicas for reporting queries
- Route read-heavy queries to replicas
- Keep writes on primary

**Connection Pooling**:
- Use Supabase connection pooler
- Limit connections per organization
- Monitor connection usage

### Application Scaling

**Horizontal Scaling**:
- Stateless backend (easy to scale)
- Load balancer for multiple instances
- Session storage in database (not memory)

**Caching**:
- Redis for session management
- CDN for static assets
- Cache product catalogs (with invalidation)

---

## 🔍 MONITORING & ALERTS

### Key Metrics

**Per Organization**:
- API request rate
- Transaction volume
- Storage usage
- User count
- Error rate

**System-Wide**:
- Total organizations
- Active subscriptions
- Revenue metrics
- Churn rate
- Support tickets

### Alerting Rules

**Critical**:
- Organization exceeds limits by 10x
- Suspicious activity detected
- Payment fraud indicators

**High Priority**:
- Organization approaching limits
- Unusual usage patterns
- Multiple failed payments

---

**Operational scale design complete!** ✅

