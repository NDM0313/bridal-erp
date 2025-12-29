# White-Label Design

## 🎯 OVERVIEW

This document outlines the white-label branding system for the SaaS POS platform.

---

## 🎨 BRANDING FEATURES

### Branding Elements

**Database Schema** (organizations table):
```sql
branding_logo_url VARCHAR(500) NULL,
branding_primary_color VARCHAR(7) NULL,  -- Hex: #3B82F6
branding_secondary_color VARCHAR(7) NULL,
branding_favicon_url VARCHAR(500) NULL,
branding_company_name VARCHAR(255) NULL,
branding_support_email VARCHAR(255) NULL,
branding_support_phone VARCHAR(50) NULL,
```

### Implementation

**Frontend**:
```typescript
// Load organization branding
const { organization } = useOrganization();

// Apply branding
<style jsx global>{`
  :root {
    --primary-color: ${organization.branding_primary_color || '#3B82F6'};
    --secondary-color: ${organization.branding_secondary_color || '#1E40AF'};
  }
  
  .logo {
    background-image: url(${organization.branding_logo_url || '/default-logo.png'});
  }
`}</style>

// Use in components
<div className="header">
  <img src={organization.branding_logo_url} alt={organization.branding_company_name} />
  <h1>{organization.branding_company_name || 'POS System'}</h1>
</div>
```

---

## 🌐 CUSTOM DOMAINS

### Implementation

**Database Schema**:
```sql
custom_domain VARCHAR(255) NULL,
custom_domain_verified BOOLEAN DEFAULT false,
custom_domain_ssl_enabled BOOLEAN DEFAULT false,
```

**DNS Setup**:
1. User adds CNAME: `pos.yourdomain.com` → `your-app.vercel.app`
2. System verifies DNS record
3. Vercel automatically provisions SSL
4. Domain active

**Verification**:
```javascript
// Verify custom domain
async function verifyCustomDomain(organizationId, domain) {
  // Check DNS record
  const dnsRecords = await dns.resolveCname(domain);
  const isValid = dnsRecords.includes('your-app.vercel.app');
  
  if (isValid) {
    await supabase
      .from('organizations')
      .update({
        custom_domain: domain,
        custom_domain_verified: true,
      })
      .eq('id', organizationId);
  }
  
  return isValid;
}
```

**Middleware**:
```javascript
// Route by custom domain
export function routeByDomain(req, res, next) {
  const host = req.headers.host;
  
  // Check if custom domain
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('custom_domain', host)
    .eq('custom_domain_verified', true)
    .single();
  
  if (org) {
    req.organizationId = org.id;
  }
  
  next();
}
```

---

## 🔧 FEATURE TOGGLES

### Per-Tenant Configuration

**Database Schema**:
```sql
CREATE TABLE organization_feature_toggles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB NULL,  -- Feature-specific configuration
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, feature_key)
);
```

**Example Features**:
- `whatsapp_enabled`: Enable/disable WhatsApp automation
- `inventory_tracking`: Enable/disable inventory features
- `multi_currency`: Enable/disable multi-currency support
- `advanced_pricing`: Enable/disable advanced pricing rules

**Usage**:
```javascript
// Check feature toggle
async function isFeatureEnabled(organizationId, featureKey) {
  const { data } = await supabase
    .from('organization_feature_toggles')
    .select('enabled')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .single();
  
  return data?.enabled || false;
}
```

---

## 📋 WHITE-LABEL CHECKLIST

### Pro Plan Features
- [ ] Custom logo upload
- [ ] Custom color scheme
- [ ] Custom company name
- [ ] Custom domain
- [ ] Custom favicon
- [ ] Custom support contact

### Implementation
- [ ] Branding UI (admin settings)
- [ ] Domain verification
- [ ] SSL certificate management
- [ ] Feature toggle UI
- [ ] Branding application (frontend)

---

**White-label design complete!** ✅

