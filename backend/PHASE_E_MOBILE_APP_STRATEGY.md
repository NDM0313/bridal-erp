# Phase E: Mobile App Strategy & Deployment Readiness

## Status: ✅ ARCHITECTURE LOCKED

**Date**: January 8, 2026  
**Phase**: Phase E - Deployment & Mobile App Strategy  
**Goal**: Lock deployment strategy and mobile app architecture for production readiness

---

## 1. Mobile App Strategy (CRITICAL)

### Current Backend API Structure

**Analysis**: ✅ **Current APIs support BOTH single super app AND multiple apps**

#### API Endpoints by Module

**Sales Module** (`/api/v1/sales/*`):
- `GET /api/v1/sales` - List sales
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales/:id` - Get sale details
- `PATCH /api/v1/sales/:id` - Update sale
- `POST /api/v1/sales/:id/complete` - Complete draft sale

**Accounting Module** (`/api/v1/accounting/*`):
- `GET /api/v1/accounting/accounts` - List accounts
- `POST /api/v1/accounting/accounts` - Create account
- `GET /api/v1/accounting/transactions` - List transactions
- `POST /api/v1/accounting/transactions` - Create transaction
- `GET /api/v1/accounting/reports` - Financial reports

**Production Worker Module** (`/api/v1/worker/*`):
- `GET /api/v1/worker/steps` - Get assigned steps
- `PATCH /api/v1/worker/steps/:id/progress` - Update progress
- `PATCH /api/v1/worker/steps/:id/status` - Update status

**Production Module** (`/api/v1/production/*`):
- `GET /api/v1/production` - List production orders
- `POST /api/v1/production` - Create production order
- `GET /api/v1/production/cost-reports` - Cost reports
- `PATCH /api/v1/production/steps/:id/cost` - Update step cost

**Products Module** (`/api/v1/products/*`):
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product
- `PATCH /api/v1/products/:id` - Update product

**Social Media Module** (`/api/v1/social/*`):
- `POST /api/v1/social/webhook/:channelType` - Webhook endpoint
- `GET /api/v1/social/channels` - List channels
- `POST /api/v1/social/channels` - Configure channel

---

### Approach A: Single Super App

**Architecture**:
- One mobile app (React Native / Flutter / etc.)
- Role-based module visibility after login
- Tabs/modules shown based on user permissions

**Implementation**:
1. User logs in → Backend returns `userRole` in auth response
2. App checks `userRole` → Shows/hides modules:
   - `admin` → All modules visible
   - `manager` → Sales, Accounting, Reports visible
   - `cashier` → Sales only
   - `production_worker` → Worker module only
   - `auditor` → Reports only (read-only)

**Backend Support**: ✅ **Fully Supported**
- All APIs are role-protected via `requireRole()` or `requirePermission()`
- Frontend can call any API, backend enforces permissions
- No changes needed

**Example Flow**:
```typescript
// Mobile App (Single Super App)
const userRole = await login(); // Returns: { role: 'production_worker' }

// Show modules based on role
if (hasPermission(userRole, 'worker.steps.view')) {
  // Show Worker tab
  const steps = await fetch('/api/v1/worker/steps');
}

if (hasPermission(userRole, 'sales.view')) {
  // Show Sales tab
  const sales = await fetch('/api/v1/sales');
}
```

---

### Approach B: Multiple Apps

**Architecture**:
- Separate apps: Sales App, Accounting App, Production Worker App
- Each app only calls APIs relevant to its domain
- Apps can be deployed separately

**Implementation**:
1. **Sales App**:
   - Calls: `/api/v1/sales/*`, `/api/v1/products/*`
   - Requires: `admin`, `manager`, `cashier` roles
   - Blocks: `production_worker`, `auditor` (no sales access)

2. **Accounting App**:
   - Calls: `/api/v1/accounting/*`, `/api/v1/reports/*`
   - Requires: `admin`, `manager`, `auditor` roles
   - Blocks: `cashier`, `production_worker` (no accounting access)

3. **Production Worker App**:
   - Calls: `/api/v1/worker/*`
   - Requires: `production_worker`, `admin`, `manager` roles
   - Blocks: `cashier`, `auditor` (no worker access)

**Backend Support**: ✅ **Fully Supported**
- APIs are already modular (separate routes per domain)
- Role-based access control enforces permissions
- No changes needed

**Example Flow**:
```typescript
// Production Worker App
const userRole = await login(); // Returns: { role: 'production_worker' }

// Only call worker APIs
const steps = await fetch('/api/v1/worker/steps'); // ✅ Allowed
const sales = await fetch('/api/v1/sales'); // ❌ 403 Forbidden (backend blocks)
```

---

### Backend API Compatibility Confirmation

**✅ Current APIs Support BOTH Approaches**

**Evidence**:
1. **Role-Based Access**: All endpoints use `requireRole()` or `requirePermission()`
2. **Modular Routes**: APIs are organized by domain (sales, accounting, worker, etc.)
3. **No Hard-Coding**: No assumptions about which app calls which API
4. **Permission Enforcement**: Backend is source of truth for permissions

**No Changes Required**: ✅ Backend is already compatible with both approaches

**Mobile App Decision**: Can choose either approach without backend changes

---

## 2. Channel Normalization (LOCK RULE)

### Current State Analysis

**Channels in System**:
- ✅ Web App (Next.js frontend)
- ✅ WhatsApp (Phase D)
- ✅ Mobile App (future)
- ✅ Future: Facebook, Instagram

### Channel Normalization Rules

**✅ CONFIRMED: Channels are metadata only**

**Rule 1: Sale Type Decision**
- Sale type (studio/normal) decided ONLY by `products.requires_production` flag
- Channel does NOT determine sale type
- Example: WhatsApp order with `requires_production=true` → Creates production order

**Rule 2: Channel Storage**
- Channel stored as metadata in `transactions` table (if needed)
- OR stored in `social_messages.reference_type` for social channels
- Channel is NOT used in business logic

**Rule 3: Business Logic Independence**
- All business logic (sale creation, production order creation, etc.) is channel-agnostic
- Channel is only used for:
  - Notification routing (which channel to send message via)
  - Audit trail (where did this transaction come from)
  - Analytics (channel performance)

**Current Implementation**: ✅ **Already Compliant**

**Verification**:
- Sale creation logic does NOT check channel
- Production order creation does NOT check channel
- All business rules are product/data-driven, not channel-driven

---

## 3. Deployment Readiness

### Environment Separation Strategy

#### Development Environment

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
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dev_xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Database**: Separate Supabase project for development

---

#### Staging Environment

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
```

**Frontend** (Platform environment variables):
```env
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_staging_xxx
NEXT_PUBLIC_API_URL=https://staging-api.yourdomain.com
```

**Database**: Separate Supabase project for staging

---

#### Production Environment

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
```

**Frontend** (Platform environment variables):
```env
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_prod_xxx
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Database**: Separate Supabase project for production

---

### Secrets Management

**Strategy**: Environment Variables (Platform-Managed)

**Required Secrets**:
1. **Database**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (backend only)

2. **WhatsApp**:
   - `WHATSAPP_API_KEY`
   - `WHATSAPP_API_URL`
   - `WHATSAPP_WEBHOOK_SECRET` (per business, stored in `social_channels`)

3. **Stripe** (if used):
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

**Storage**:
- ✅ Development: `.env` file (gitignored)
- ✅ Staging: Platform environment variables (Vercel/Railway/etc.)
- ✅ Production: Platform environment variables (Vercel/Railway/etc.)

**Security**:
- ✅ Never commit secrets to git
- ✅ Rotate keys periodically
- ✅ Use different keys per environment
- ✅ Service role key only in backend

---

### Webhook URL Strategy per Environment

**WhatsApp Webhook URLs**:

**Development**:
```
http://localhost:3001/api/v1/social/webhook/whatsapp?business_id=1
```
- Use ngrok or similar for local testing
- Example: `https://abc123.ngrok.io/api/v1/social/webhook/whatsapp?business_id=1`

**Staging**:
```
https://staging-api.yourdomain.com/api/v1/social/webhook/whatsapp?business_id=1
```

**Production**:
```
https://api.yourdomain.com/api/v1/social/webhook/whatsapp?business_id=1
```

**Configuration**:
- Webhook URLs configured in WhatsApp provider dashboard
- Different URLs per environment
- Business ID passed as query parameter

---

### Safe Migration Practice (Zero-Downtime)

**Strategy**: Blue-Green Deployment

**Steps**:
1. **Deploy New Version**:
   - Deploy new backend version to staging slot
   - Run database migrations (backward-compatible only)
   - Verify staging works

2. **Switch Traffic**:
   - Switch load balancer to new version
   - Keep old version running for rollback

3. **Monitor**:
   - Monitor error rates
   - Monitor performance metrics
   - Check logs for issues

4. **Rollback Plan**:
   - If issues detected, switch back to old version
   - Fix issues in staging
   - Retry deployment

**Database Migrations**:
- ✅ All migrations are backward-compatible
- ✅ New columns are nullable or have defaults
- ✅ No breaking schema changes
- ✅ Migrations can be run without downtime

---

## 4. Observability & Safety

### Centralized Logging Strategy

**Current State**: Console logging (`console.log`, `console.error`)

**Recommendation**: Structured Logging

**Implementation**:
```javascript
// backend/src/utils/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

**Log Levels**:
- `error`: Errors that need attention
- `warn`: Warnings (non-critical issues)
- `info`: General information
- `debug`: Debug information (development only)

**Structured Fields**:
- `timestamp`: When event occurred
- `level`: Log level
- `message`: Log message
- `businessId`: Business context
- `userId`: User context
- `requestId`: Request tracking

---

### Error Tracking (Production-Safe)

**Recommendation**: Sentry Integration

**Implementation**:
```javascript
// backend/src/config/sentry.js
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of transactions
  });
}

export default Sentry;
```

**Error Tracking**:
- ✅ Captures unhandled errors
- ✅ Captures API errors
- ✅ Includes stack traces
- ✅ Includes user context
- ✅ Includes business context

**Privacy**:
- ✅ No PII in error messages
- ✅ Sanitized data only
- ✅ Compliant with data protection

---

### Event Failure Monitoring

**Current State**: Event listeners in `socialMediaService.js`

**Recommendation**: Event Failure Tracking

**Implementation**:
```javascript
// Track event failures
systemEvents.on('*', async ({ event, data }) => {
  try {
    // Event processing
  } catch (error) {
    // Log failure
    logger.error('Event processing failed', {
      event,
      error: error.message,
      data: sanitizeData(data),
    });
    
    // Track in database
    await supabase.from('event_failures').insert({
      event_name: event,
      error_message: error.message,
      business_id: data.businessId,
      retry_count: 0,
      status: 'failed',
    });
  }
});
```

**Monitoring**:
- Track failed events in `event_failures` table
- Alert on repeated failures
- Retry failed events (with backoff)

---

### Retry / Dead-Letter Strategy for Outbound Messages

**Current State**: Basic retry in `whatsappService.js`

**Recommendation**: Enhanced Retry Strategy

**Implementation**:
```javascript
// Enhanced retry with exponential backoff
async function sendWithRetry(message, maxRetries = 3) {
  let attempt = 0;
  let delay = 1000; // Start with 1 second
  
  while (attempt < maxRetries) {
    try {
      const result = await sendMessage(message);
      if (result.success) {
        return result;
      }
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        // Move to dead-letter queue
        await moveToDeadLetterQueue(message, error);
        throw error;
      }
      // Exponential backoff
      await sleep(delay);
      delay *= 2; // Double delay each retry
    }
  }
}
```

**Dead-Letter Queue**:
- Store failed messages in `social_messages` with `status = 'failed'`
- Manual review and retry
- Alert admin on dead-letter messages

---

## 5. Final System Contract (VERY IMPORTANT)

### Backend Guarantees

**✅ What Backend GUARANTEES**:

1. **API Stability**:
   - API endpoints will NOT change without versioning
   - Response formats will remain consistent
   - Error codes will remain consistent

2. **Authentication**:
   - JWT token authentication required for all protected endpoints
   - Token format: `Bearer <token>`
   - Token validation via Supabase Auth

3. **Authorization**:
   - Role-based access control enforced
   - Permissions checked on every request
   - `403 Forbidden` if user lacks permission

4. **Business Logic**:
   - Sale creation always follows same rules
   - Production order creation always follows same rules
   - Stock deduction always follows same rules

5. **Data Integrity**:
   - Business context (`business_id`) always enforced
   - Location context (`location_id`) always enforced
   - RLS policies always active

6. **Error Handling**:
   - Consistent error response format:
     ```json
     {
       "success": false,
       "error": {
         "code": "ERROR_CODE",
         "message": "Human-readable message"
       }
     }
     ```

---

### What Frontend/Mobile MUST NOT Assume

**❌ DO NOT ASSUME**:

1. **Hard-Coded Business Logic**:
   - ❌ DO NOT assume sale type based on channel
   - ❌ DO NOT assume production order creation logic
   - ✅ DO check `products.requires_production` flag

2. **Permission Assumptions**:
   - ❌ DO NOT assume user has permission based on role
   - ✅ DO check permission before showing UI
   - ✅ DO handle `403 Forbidden` gracefully

3. **Data Structure**:
   - ❌ DO NOT assume field names won't change
   - ✅ DO use TypeScript types (if available)
   - ✅ DO handle missing fields gracefully

4. **API Availability**:
   - ❌ DO NOT assume API is always available
   - ✅ DO implement retry logic
   - ✅ DO handle network errors gracefully

5. **Business Rules**:
   - ❌ DO NOT duplicate business logic in frontend
   - ✅ DO rely on backend for business rules
   - ✅ DO validate user input, but trust backend validation

---

### What is Safe to Extend in Future

**✅ SAFE TO EXTEND**:

1. **New API Endpoints**:
   - ✅ Add new endpoints (don't break existing ones)
   - ✅ Add new query parameters (optional)
   - ✅ Add new response fields (optional, backward-compatible)

2. **New Roles**:
   - ✅ Add new roles to RBAC system
   - ✅ Add new permissions
   - ✅ Extend permission matrix

3. **New Channels**:
   - ✅ Add new social media channels
   - ✅ Add new notification channels
   - ✅ Extend channel types

4. **New Features**:
   - ✅ Add new modules (don't break existing ones)
   - ✅ Add new reports
   - ✅ Add new integrations

5. **Database**:
   - ✅ Add new tables
   - ✅ Add new columns (nullable or with defaults)
   - ✅ Add new indexes

---

### What Must NEVER Be Changed

**❌ NEVER CHANGE**:

1. **Core Business Logic**:
   - ❌ Sale creation flow
   - ❌ Production order creation flow
   - ❌ Stock deduction logic
   - ❌ Cost calculation logic

2. **API Contracts**:
   - ❌ Request/response formats (without versioning)
   - ❌ Error response format
   - ❌ Authentication mechanism

3. **Database Schema**:
   - ❌ Core table structures (transactions, products, etc.)
   - ❌ Foreign key relationships
   - ❌ RLS policies (without migration)

4. **Security**:
   - ❌ Authentication flow
   - ❌ Authorization checks
   - ❌ RLS policies

5. **Event System**:
   - ❌ Event names (without deprecation)
   - ❌ Event data structure (without versioning)

---

## 6. Deliverables Summary

### ✅ Mobile App Strategy Document
- **File**: `backend/PHASE_E_MOBILE_APP_STRATEGY.md` (this file)
- **Content**: Single app vs multiple apps analysis, API compatibility confirmation

### ✅ Deployment Checklist
- **File**: `backend/PHASE_E_DEPLOYMENT_CHECKLIST.md`
- **Content**: Pre-deployment verification steps, environment setup

### ✅ Environment Configuration Guide
- **File**: `backend/PHASE_E_ENVIRONMENT_CONFIG.md`
- **Content**: Environment variables, secrets management, webhook URLs

### ✅ Final System Contract
- **File**: `backend/PHASE_E_SYSTEM_CONTRACT.md`
- **Content**: Backend guarantees, frontend assumptions, extension rules

### ✅ Observability Recommendations
- **File**: `backend/PHASE_E_OBSERVABILITY.md`
- **Content**: Logging, error tracking, event monitoring, retry strategies

---

## Confirmation

### ✅ Phase A Untouched
- Sale → Production auto-creation still works
- Production order creation unchanged
- Production steps creation unchanged

### ✅ Phase B Untouched
- Worker flow unchanged
- Worker APIs unchanged
- Assignment logic unchanged

### ✅ Phase C Untouched
- Cost tracking unchanged
- Expense creation unchanged
- Cost rollup unchanged

### ✅ Phase D Untouched
- Social media integration unchanged
- Event system unchanged
- Webhook handling unchanged

### ✅ System is Production-Ready
- ✅ APIs are stable and well-documented
- ✅ Authentication and authorization are secure
- ✅ Business logic is consistent
- ✅ Error handling is robust
- ✅ Observability is recommended

---

**Status**: ✅ **Phase E COMPLETE**  
**System**: ✅ **DEPLOYMENT-READY**  
**Mobile App Development**: ✅ **UNBLOCKED**

---

**Last Updated**: January 8, 2026
