# Default Business Resources Setup

## Overview
This system automatically creates default accounts and contacts when a new business is registered. These are standard resources that every business needs.

## Default Resources Created

### 1. Financial Accounts
- **Cash in Hand** (type: `cash`)
  - Default account for cash transactions
  - Opening balance: 0
  - Automatically used for Cash payments

- **Bank Account** (type: `bank`)
  - Default account for bank transactions
  - Opening balance: 0
  - Automatically used for Card/Bank Transfer payments

### 2. Contacts
- **Walk-in Customer** (type: `customer`)
  - Default customer for walk-in sales
  - Used when no specific customer is selected
  - Mobile and email: NULL

## Implementation Methods

### Method 1: Database Trigger (Recommended)
**File:** `database/AUTO_CREATE_DEFAULT_RESOURCES_TRIGGER.sql`

Automatically creates default resources when a business is inserted into the database.

**Usage:**
```sql
-- Run this script once in Supabase SQL Editor
-- It creates a trigger that fires automatically
```

**Benefits:**
- Works regardless of how business is created
- No code changes needed
- Guaranteed to run

### Method 2: Backend Service
**File:** `backend/src/services/businessSetupService.js`

Called during onboarding process.

**Usage:**
```javascript
import { setupDefaultBusinessResources } from '../services/businessSetupService.js';

await setupDefaultBusinessResources(businessId, userId);
```

**Benefits:**
- Integrated with application flow
- Can handle errors gracefully
- Logs creation status

### Method 3: Frontend Utility
**File:** `lib/services/businessSetupService.ts`

Ensures default resources exist when dashboard loads.

**Usage:**
```typescript
import { ensureDefaultResourcesExist } from '@/lib/services/businessSetupService';

// Called automatically on dashboard load
await ensureDefaultResourcesExist();
```

**Benefits:**
- Catches any missed cases
- Works for existing businesses
- Non-blocking operation

### Method 4: SQL Script (Manual Setup)
**File:** `database/CREATE_DEFAULT_BUSINESS_RESOURCES.sql`

Creates default resources for all existing businesses that don't have them.

**Usage:**
```sql
-- Run this script in Supabase SQL Editor
-- It will create default resources for all businesses
```

**Benefits:**
- One-time setup for existing businesses
- Can be run anytime
- Safe to run multiple times (checks for existing resources)

## Setup Instructions

### For New Installations

1. **Run Database Trigger Script** (Recommended)
   ```sql
   -- Run: database/AUTO_CREATE_DEFAULT_RESOURCES_TRIGGER.sql
   ```
   This ensures all future businesses get default resources automatically.

2. **Update SETUP_USER_BUSINESS.sql** (Already done)
   - Script now includes default resource creation
   - Run when setting up a new user/business

### For Existing Businesses

1. **Run Manual Setup Script**
   ```sql
   -- Run: database/CREATE_DEFAULT_BUSINESS_RESOURCES.sql
   ```
   This will create default resources for all existing businesses.

2. **Or Use Frontend Utility**
   - Dashboard automatically ensures default resources exist
   - Just load the dashboard and resources will be created if missing

## Verification

Check if default resources exist:

```sql
SELECT 
    b.id as business_id,
    b.name as business_name,
    (SELECT COUNT(*) FROM financial_accounts 
     WHERE business_id = b.id AND name = 'Cash in Hand' AND type = 'cash') as has_cash_account,
    (SELECT COUNT(*) FROM financial_accounts 
     WHERE business_id = b.id AND name = 'Bank Account' AND type = 'bank') as has_bank_account,
    (SELECT COUNT(*) FROM contacts 
     WHERE business_id = b.id AND name = 'Walk-in Customer' AND type = 'customer') as has_walkin_customer
FROM businesses b
ORDER BY b.id;
```

## Notes

- All methods are idempotent (safe to run multiple times)
- Duplicate key errors (23505) are ignored
- Resources are created with `is_active = true`
- Opening balances are set to 0
- `created_by` is set to the business owner or first user

## Troubleshooting

### Resources Not Created

1. Check if tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('financial_accounts', 'contacts');
   ```

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('financial_accounts', 'contacts');
   ```

3. Check trigger exists:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_create_default_business_resources';
   ```

### Manual Creation

If automatic creation fails, create manually:

```sql
-- Replace v_business_id and v_user_id with actual values
INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
VALUES (v_business_id, 'Cash in Hand', 'cash', 0, 0, true, v_user_id);

INSERT INTO financial_accounts (business_id, name, type, current_balance, opening_balance, is_active, created_by)
VALUES (v_business_id, 'Bank Account', 'bank', 0, 0, true, v_user_id);

INSERT INTO contacts (business_id, type, name, mobile, email, created_by)
VALUES (v_business_id, 'customer', 'Walk-in Customer', NULL, NULL, v_user_id);
```

