# 🚀 Production Deployment Roadmap

**Based on**: `TECHNICAL_DOCUMENTATION.md`  
**Analysis**: `PRODUCTION_READINESS_ANALYSIS.md`  
**Current Status**: Architecture Validated, Critical Fixes Identified  
**Goal**: Production-ready ERP system for real businesses

---

## Executive Summary

### Architecture Validation: ✅ APPROVED

Your architecture is **production-capable**:
- ✅ Multi-branch design is solid
- ✅ Context-based state management is appropriate
- ✅ Database schema is well-structured
- ✅ UI/UX standards are professional
- ✅ Security foundation exists (RoleGuard, RLS planned)

### Hidden Risks Found: ⚠️ 8 CRITICAL

1. **V1/V2 Provider Conflict** - Both active, causing confusion
2. **No Database Constraints** - Data integrity at risk
3. **No Transaction Support** - Partial saves possible
4. **localStorage Quota Not Handled** - Silent failures possible
5. **RLS Not Implemented** - CRITICAL SECURITY VULNERABILITY
6. **No Audit Trail** - Cannot track changes or investigate fraud
7. **No Error Boundary** - App crashes show white screen
8. **Demo Mode in Production** - Security bypass if accidentally enabled

### Timeline to Production

| Phase | Duration | Confidence |
|-------|----------|------------|
| Critical Fixes (P1-P5) | 2-3 weeks | 40% → 70% |
| High Priority (P6-P10) | 2-3 weeks | 70% → 85% |
| Testing & Docs | 2 weeks | 85% → 95% |
| Launch Prep | 2 weeks | 95% → 99% |
| **TOTAL** | **8-10 weeks** | **Production-Ready** |

**Recommendation**: Do NOT deploy until Critical Fixes complete.

---

## Priority-Ordered Fix List

### 🔴 CRITICAL (Must Fix Before ANY Production Use)

#### Priority 1: Complete V1 → V2 Migration
**Timeline**: 1-2 days  
**Effort**: Medium  
**Risk**: Technical debt, provider conflicts, confusion

**Why Critical**: Currently running both V1 and V2 providers simultaneously. This causes:
- Double writes to localStorage
- Confusion about which context to use
- Potential race conditions
- Unnecessary memory overhead

**Tasks**:
```bash
# 1. Find all V1 usages
grep -r "useBranch()" components/ app/ --include="*.tsx"

# 2. Replace with V2
# - components/header/BranchSelector.tsx
# - components/layout/ModernDashboardLayout.tsx
# - app/settings/branches/page.tsx
# - All sales/purchase modals

# 3. Remove V1 provider from layout.tsx
# 4. Delete lib/context/BranchContext.tsx
# 5. Rename V2 files (remove "V2" suffix)
```

**Verification**:
```bash
# Should return no results
grep -r "useBranch()" --include="*.tsx" | grep -v "useBranchV2"
```

---

#### Priority 2: Implement RLS Policies
**Timeline**: 2-3 days  
**Effort**: High  
**Risk**: **CRITICAL SECURITY VULNERABILITY**

**Why Critical**: Without RLS, malicious users can:
- Access other businesses' data via API calls
- Modify records they shouldn't have access to
- View sensitive financial information

**Current State**: RLS mentioned in docs but NOT implemented

**Implementation**:

**File**: `database/ENABLE_RLS.sql`
```sql
-- Enable RLS on all critical tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_ledgers ENABLE ROW LEVEL SECURITY;

-- Create helper function
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER AS $$
  SELECT business_id 
  FROM user_profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Sales policies
CREATE POLICY "Users can only access their business sales"
ON sales FOR ALL
USING (business_id = get_user_business_id());

-- Products policies
CREATE POLICY "Users can only access their business products"
ON products FOR ALL
USING (business_id = get_user_business_id());

-- Contacts policies
CREATE POLICY "Users can only access their business contacts"
ON contacts FOR ALL
USING (business_id = get_user_business_id());

-- User profiles policies (special: can only see same business users)
CREATE POLICY "Users can only see users in their business"
ON user_profiles FOR SELECT
USING (business_id = get_user_business_id());

CREATE POLICY "Admins can manage users in their business"
ON user_profiles FOR INSERT, UPDATE, DELETE
USING (
  business_id = get_user_business_id() 
  AND EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Apply similar policies to all other tables
```

**Testing**:
1. Create 2 test businesses
2. Create users for each business
3. Try to access other business data via API
4. Should return empty results (not error)

**Verification**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Should show all critical tables
```

---

#### Priority 3: Add Database Constraints
**Timeline**: 1 day  
**Effort**: Low  
**Risk**: Data corruption, orphaned records, duplicate invoices

**Why Critical**: Without constraints:
- Products can be deleted while sales reference them (orphaned records)
- Duplicate invoice numbers possible (accounting nightmare)
- Negative quantities/prices possible (invalid data)
- Slow queries at scale (no indexes)

**Implementation**:

**File**: `database/ADD_CONSTRAINTS.sql`
```sql
-- Foreign keys with proper CASCADE/RESTRICT
ALTER TABLE sale_items 
  ADD CONSTRAINT fk_sale_items_sale 
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;

ALTER TABLE sale_items 
  ADD CONSTRAINT fk_sale_items_product 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE sales 
  ADD CONSTRAINT fk_sales_branch 
  FOREIGN KEY (branch_id) REFERENCES business_locations(id) ON DELETE RESTRICT;

ALTER TABLE sales 
  ADD CONSTRAINT fk_sales_customer 
  FOREIGN KEY (customer_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- Unique constraints (business logic)
ALTER TABLE sales 
  ADD CONSTRAINT unique_invoice_per_business 
  UNIQUE (business_id, invoice_number);

ALTER TABLE products 
  ADD CONSTRAINT unique_sku_per_business 
  UNIQUE (business_id, sku);

ALTER TABLE product_variations 
  ADD CONSTRAINT unique_variation_sku 
  UNIQUE (sku);

-- Check constraints (data validation)
ALTER TABLE sale_items 
  ADD CONSTRAINT positive_quantity CHECK (quantity >= 0);

ALTER TABLE sale_items 
  ADD CONSTRAINT positive_unit_price CHECK (unit_price >= 0);

ALTER TABLE sale_items 
  ADD CONSTRAINT valid_discount CHECK (discount >= 0 AND discount <= 100);

ALTER TABLE sales 
  ADD CONSTRAINT positive_total CHECK (total >= 0);

ALTER TABLE products 
  ADD CONSTRAINT positive_price CHECK (price >= 0);

ALTER TABLE products 
  ADD CONSTRAINT positive_cost CHECK (cost >= 0);

-- Indexes (performance)
CREATE INDEX idx_sales_business_id ON sales(business_id);
CREATE INDEX idx_sales_branch_id ON sales(branch_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);
CREATE INDEX idx_sales_created_at ON sales(created_at);

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);

CREATE INDEX idx_contacts_business_id ON contacts(business_id);
CREATE INDEX idx_contacts_type ON contacts(type);

CREATE INDEX idx_user_profiles_business_id ON user_profiles(business_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
```

**Testing**:
```sql
-- Test FK constraint
DELETE FROM products WHERE id = 1;  -- Should fail if sale_items reference it

-- Test unique constraint
INSERT INTO sales (business_id, invoice_number, ...) VALUES (1, 'INV-001', ...);
INSERT INTO sales (business_id, invoice_number, ...) VALUES (1, 'INV-001', ...);
-- Second insert should fail

-- Test check constraint
INSERT INTO sale_items (quantity, unit_price) VALUES (-5, 100);  -- Should fail
```

---

#### Priority 4: Implement Global Error Boundary
**Timeline**: 1 day  
**Effort**: Low  
**Risk**: Poor UX, entire app crashes on unhandled errors

**Why Critical**: Currently, any unhandled error crashes the entire app with white screen.

**Implementation**:

**File**: `components/ErrorBoundary.tsx`
```tsx
'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 ErrorBoundary caught error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);
    
    // TODO: Send to error logging service (Sentry)
    // logErrorToService(error, errorInfo);
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
          <div className="max-w-2xl w-full bg-slate-900 rounded-lg border border-slate-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle size={32} className="text-red-500" />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <p className="text-red-400 font-mono text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="text-slate-400 cursor-pointer hover:text-white">
                  Show error details (dev only)
                </summary>
                <pre className="mt-4 bg-slate-800 rounded-lg p-4 text-xs overflow-x-auto">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Update** `app/layout.tsx`:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap children
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

---

#### Priority 5: Add localStorage Quota Handling
**Timeline**: 0.5 day  
**Effort**: Low  
**Risk**: Silent failures on some browsers/users

**Why Critical**: localStorage has 5MB limit. When exceeded:
- Branch selection silently fails
- User confused why branch doesn't switch
- No error message shown

**Implementation**:

**File**: `lib/utils/storage.ts`
```typescript
/**
 * Safe localStorage wrapper with quota handling
 */

export const setLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('❌ localStorage quota exceeded');
      
      // Strategy 1: Remove old cache entries
      const cacheKeys = ['branches_cache_v2', 'user_preferences', 'recent_searches'];
      let freed = false;
      
      for (const cacheKey of cacheKeys) {
        try {
          const item = localStorage.getItem(cacheKey);
          if (item && item.length > 1000) {  // Remove large items
            localStorage.removeItem(cacheKey);
            console.log(`🧹 Removed ${cacheKey} (${item.length} chars)`);
            freed = true;
          }
        } catch {}
      }
      
      // Strategy 2: Retry after cleanup
      if (freed) {
        try {
          localStorage.setItem(key, value);
          console.log('✅ Retry successful after cleanup');
          return true;
        } catch {}
      }
      
      // Strategy 3: User notification
      alert('Storage full. Please clear browser cache or use private browsing mode.');
      return false;
    }
    
    console.error('❌ localStorage error:', e);
    return false;
  }
};

export const getLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('❌ localStorage read error:', e);
    return null;
  }
};

export const removeLocalStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('❌ localStorage remove error:', e);
    return false;
  }
};
```

**Update** `lib/context/BranchContextV2.tsx`:
```typescript
import { setLocalStorage, getLocalStorage } from '@/lib/utils/storage';

const switchBranch = (branchId: number) => {
  // ...
  
  const success = setLocalStorage('active_branch_id_v2', branchId.toString());
  if (!success) {
    console.error('Failed to save branch selection');
    return;  // Don't reload if save failed
  }
  
  // Verify
  const verify = getLocalStorage('active_branch_id_v2');
  if (verify !== branchId.toString()) {
    alert('Failed to save branch selection. Please try again.');
    return;
  }
  
  window.location.reload();
};
```

---

### 🟡 HIGH (Fix in First Sprint - Week 3-4)

#### Priority 6: Implement Audit Trail System
**Timeline**: 2-3 days  
**Effort**: Medium  
**Risk**: Cannot investigate fraud, data discrepancies, or compliance issues

**Why Important**:
- Regulatory compliance (who changed what when)
- Fraud detection (unusual patterns)
- Debugging (trace data corruption)
- User accountability

**Implementation**:

**File**: `database/CREATE_AUDIT_SYSTEM.sql`
```sql
-- Audit logs table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  user_id UUID REFERENCES auth.users(id),
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_business ON audit_logs(business_id);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  user_business_id INTEGER;
BEGIN
  -- Get business_id from context or record
  user_business_id := COALESCE(
    TG_ARGV[0]::INTEGER,  -- Passed as argument
    NEW.business_id,
    OLD.business_id
  );

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (business_id, table_name, record_id, action, old_values)
    VALUES (user_business_id, TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (business_id, table_name, record_id, action, old_values, new_values)
    VALUES (user_business_id, TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (business_id, table_name, record_id, action, new_values)
    VALUES (user_business_id, TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables
CREATE TRIGGER audit_sales 
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_products 
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_users 
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Apply to all other critical tables...
```

**UI Component**: `app/audit/page.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    loadLogs();
  }, []);
  
  const loadLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setLogs(data || []);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Audit Trail</h1>
      <table className="w-full">
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Table</th>
            <th>Record ID</th>
            <th>Changes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.user_id}</td>
              <td>{log.action}</td>
              <td>{log.table_name}</td>
              <td>{log.record_id}</td>
              <td>
                <details>
                  <summary>View</summary>
                  <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

#### Priority 7: Add Transaction Support (Atomic Operations)
**Timeline**: 2-3 days  
**Effort**: Medium  
**Risk**: Data inconsistency (partial saves)

**Why Important**: Currently, multi-step operations can fail mid-way:
- Sale created ✅
- Stock update fails ❌
- Result: Sale recorded but stock not deducted

**Implementation**:

**File**: `lib/utils/transactions.ts`
```typescript
import { supabase } from '@/utils/supabase/client';

/**
 * Execute multiple operations in a transaction
 * If any fails, all are rolled back
 */
export const executeTransaction = async (
  operations: Array<() => Promise<any>>
): Promise<{ success: boolean; error?: string }> => {
  // Supabase doesn't support client-side transactions
  // Use server-side RPC function instead
  
  try {
    // Call server-side transaction function
    const { data, error } = await supabase.rpc('execute_transaction', {
      operations: operations.map(op => op.toString())
    });
    
    if (error) {
      console.error('Transaction failed:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (e: any) {
    console.error('Transaction error:', e);
    return { success: false, error: e.message };
  }
};
```

**Database Function**:
```sql
-- database/CREATE_TRANSACTION_SUPPORT.sql
CREATE OR REPLACE FUNCTION create_sale_with_stock_update(
  p_sale_data JSONB,
  p_sale_items JSONB[],
  p_stock_updates JSONB[]
)
RETURNS JSONB AS $$
DECLARE
  v_sale_id INTEGER;
  v_item JSONB;
  v_stock JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Insert sale
  INSERT INTO sales (business_id, branch_id, customer_id, invoice_number, sale_date, total, payment_status)
  VALUES (
    (p_sale_data->>'business_id')::INTEGER,
    (p_sale_data->>'branch_id')::INTEGER,
    (p_sale_data->>'customer_id')::INTEGER,
    p_sale_data->>'invoice_number',
    (p_sale_data->>'sale_date')::DATE,
    (p_sale_data->>'total')::DECIMAL,
    p_sale_data->>'payment_status'
  )
  RETURNING id INTO v_sale_id;
  
  -- 2. Insert sale items
  FOREACH v_item IN ARRAY p_sale_items LOOP
    INSERT INTO sale_items (sale_id, product_id, variation_id, quantity, unit_price, total)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::INTEGER,
      (v_item->>'variation_id')::INTEGER,
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total')::DECIMAL
    );
  END LOOP;
  
  -- 3. Update stock
  FOREACH v_stock IN ARRAY p_stock_updates LOOP
    UPDATE branch_inventory
    SET quantity = quantity - (v_stock->>'quantity')::DECIMAL,
        updated_at = NOW()
    WHERE branch_id = (v_stock->>'branch_id')::INTEGER
      AND product_id = (v_stock->>'product_id')::INTEGER
      AND (variation_id = (v_stock->>'variation_id')::INTEGER OR (variation_id IS NULL AND v_stock->>'variation_id' IS NULL));
    
    -- Check if stock went negative
    IF (SELECT quantity FROM branch_inventory 
        WHERE branch_id = (v_stock->>'branch_id')::INTEGER 
        AND product_id = (v_stock->>'product_id')::INTEGER) < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_stock->>'product_id';
    END IF;
  END LOOP;
  
  -- Return success
  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

**Usage in Component**:
```typescript
// components/sales/AddSaleModal.tsx
const handleSave = async () => {
  const { data, error } = await supabase.rpc('create_sale_with_stock_update', {
    p_sale_data: saleData,
    p_sale_items: items,
    p_stock_updates: stockUpdates,
  });
  
  if (error) {
    toast.error('Failed to create sale: ' + error.message);
    return;
  }
  
  toast.success('Sale created successfully!');
};
```

---

#### Priority 8: Complete SettingsContext Implementation
**Timeline**: 2-3 days  
**Effort**: Medium  
**Risk**: Hardcoded values, not business-configurable

**Why Important**: Currently, currency, tax, date format are hardcoded.

**Implementation**:

**File**: `database/CREATE_SETTINGS_TABLE.sql`
```sql
CREATE TABLE business_settings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) UNIQUE,
  currency_code VARCHAR(3) DEFAULT 'USD',
  currency_symbol VARCHAR(5) DEFAULT '$',
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  decimal_places INTEGER DEFAULT 2,
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(20) DEFAULT '12h',
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  invoice_start_number INTEGER DEFAULT 1,
  low_stock_threshold DECIMAL(10,2) DEFAULT 10.00,
  enable_multi_currency BOOLEAN DEFAULT false,
  enable_barcode_scanning BOOLEAN DEFAULT false,
  enable_receipt_printing BOOLEAN DEFAULT true,
  settings_json JSONB,  -- For future extensibility
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_business_settings ON business_settings(business_id);
```

**File**: `lib/context/SettingsContext.tsx`
```tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

interface BusinessSettings {
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
  decimal_places: number;
  date_format: string;
  time_format: string;
  invoice_prefix: string;
  invoice_start_number: number;
  low_stock_threshold: number;
  enable_multi_currency: boolean;
  enable_barcode_scanning: boolean;
  enable_receipt_printing: boolean;
}

interface SettingsContextType {
  settings: BusinessSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<BusinessSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      // Get user's business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Get business settings
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', profile.business_id)
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        // Use defaults
        setSettings(getDefaultSettings());
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<BusinessSettings>) => {
    // Implementation...
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}

const getDefaultSettings = (): BusinessSettings => ({
  currency_code: 'USD',
  currency_symbol: '$',
  tax_rate: 0.00,
  decimal_places: 2,
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  invoice_prefix: 'INV',
  invoice_start_number: 1,
  low_stock_threshold: 10.00,
  enable_multi_currency: false,
  enable_barcode_scanning: false,
  enable_receipt_printing: true,
});
```

**Usage**:
```typescript
import { useSettings } from '@/lib/context/SettingsContext';

const { settings } = useSettings();

// Display price with correct currency
<span>{settings.currency_symbol}{price.toFixed(settings.decimal_places)}</span>
```

---

#### Priority 9: Configure Session Timeout
**Timeline**: 1 day  
**Effort**: Low  
**Risk**: Stolen tokens = permanent access

**Why Important**: JWT tokens currently don't expire, creating security risk.

**Implementation**:

**Supabase Dashboard**:
1. Go to Authentication → Settings
2. Set JWT expiry: 24 hours
3. Enable automatic token refresh

**Client-Side** (`lib/hooks/useAuth.ts`):
```typescript
useEffect(() => {
  // Listen for token refresh
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 Token refreshed');
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('🚪 Session expired');
      router.push('/login');
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

**Add Session Expiry Warning**:
```typescript
// Show warning 5 minutes before expiry
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const expiresAt = session.expires_at * 1000;  // Convert to ms
      const now = Date.now();
      const timeLeft = expiresAt - now;
      
      if (timeLeft < 5 * 60 * 1000) {  // Less than 5 minutes
        toast.warning('Your session will expire soon. Please save your work.');
      }
    }
  };
  
  const interval = setInterval(checkSession, 60000);  // Check every minute
  return () => clearInterval(interval);
}, []);
```

---

#### Priority 10: Remove Demo Mode from Production Builds
**Timeline**: 0.5 day  
**Effort**: Low  
**Risk**: Security bypass if accidentally enabled

**Why Important**: Demo mode bypasses ALL security checks (RoleGuard).

**Implementation**:

**File**: `lib/config/demoConfig.ts`
```typescript
export const isDemoMode = (): boolean => {
  // CRITICAL: Only enable in development
  if (process.env.NODE_ENV === 'production') {
    return false;  // ALWAYS false in production
  }
  
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

export const bypassPermissions = (): boolean => {
  // NEVER bypass in production
  return isDemoMode() && process.env.NODE_ENV !== 'production';
};
```

**Update** `components/auth/RoleGuard.tsx`:
```typescript
import { isDemoMode, bypassPermissions } from '@/lib/config/demoConfig';

export function RoleGuard({ allowedRoles, children }) {
  const { user, role } = useRole();
  
  // CRITICAL: Only bypass in development
  if (bypassPermissions()) {
    console.warn('⚠️ Demo mode: Bypassing role check (DEV ONLY)');
    return children;
  }
  
  if (!allowedRoles.includes(role)) {
    return <AccessDenied />;
  }
  
  return children;
}
```

**Build-Time Check** (`next.config.js`):
```javascript
module.exports = {
  // Fail build if demo mode enabled in production
  webpack: (config, { isServer, dev }) => {
    if (!dev && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      throw new Error('❌ BUILD FAILED: Demo mode cannot be enabled in production builds');
    }
    return config;
  },
};
```

---

### 🟢 MEDIUM (Fix in Second Sprint - Week 5-6)

#### Priority 11: Branch Switching Confirmation
**Timeline**: 1 day  
**Effort**: Low  

**Implementation**:
```typescript
const handleBranchSwitch = (branchId: number) => {
  // Check for unsaved changes
  const hasUnsavedChanges = checkUnsavedChanges();  // Custom hook
  
  if (hasUnsavedChanges) {
    if (confirm('You have unsaved changes. Switch branch anyway?')) {
      switchBranch(branchId);
    }
  } else {
    switchBranch(branchId);
  }
};
```

#### Priority 12: Branch Access Control
**Timeline**: 2 days  
**Effort**: Medium  

**Database**:
```sql
CREATE TABLE user_branch_access (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  branch_id INTEGER REFERENCES business_locations(id),
  access_level VARCHAR,  -- 'full', 'read_only'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);
```

#### Priority 13: Rate Limiting
**Timeline**: 1 day  
**Effort**: Low  

**Supabase Edge Function**:
```typescript
// Rate limit: 100 requests per minute per user
const rateLimiter = new Map();

Deno.serve(async (req) => {
  const userId = getUserId(req);
  const now = Date.now();
  
  const userRequests = rateLimiter.get(userId) || [];
  const recentRequests = userRequests.filter(t => now - t < 60000);
  
  if (recentRequests.length >= 100) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  
  // Continue with request...
});
```

---

### ⚪ LOW (Post-Launch)

#### Priority 14-18: See `PRODUCTION_READINESS_ANALYSIS.md`

---

## What NOT to Touch

### ❌ Stable Systems (Leave As-Is)
1. **UI/UX Standards** - Finalized, documented, working
2. **Packing System** - Complex but stable
3. **Product Search (V2)** - ProductSearchPortal is production-ready
4. **Decimal Formatting** - 2-decimal standard is final
5. **Dark Mode Theme** - Design system is complete

### ❌ Out of Scope (Post-Launch)
1. Light mode
2. Mobile app
3. Multi-currency
4. Barcode scanning
5. Advanced analytics

---

## Production Readiness Checklist

### 🔴 CRITICAL (Deployment Blockers)

- [ ] **P1**: V1 → V2 migration complete
- [ ] **P2**: RLS policies implemented and tested
- [ ] **P3**: Database constraints added
- [ ] **P4**: Error boundary implemented
- [ ] **P5**: localStorage quota handling added

**Status**: 0/5 complete  
**Estimated Time**: 2-3 weeks  
**Confidence After**: 70%

### 🟡 HIGH (Required for Launch)

- [ ] **P6**: Audit trail system implemented
- [ ] **P7**: Transaction support added
- [ ] **P8**: SettingsContext completed
- [ ] **P9**: Session timeout configured
- [ ] **P10**: Demo mode removed from production

**Status**: 0/5 complete  
**Estimated Time**: 2-3 weeks  
**Confidence After**: 85%

### 🟢 MEDIUM (Post-Launch)

- [ ] **P11-P15**: See detailed list above

**Status**: 0/5 complete  
**Estimated Time**: 2-3 weeks  
**Confidence After**: 95%

### 📋 DOCUMENTATION & TESTING

- [ ] Environment variables documented
- [ ] Deployment guide written
- [ ] Backup/restore procedure tested
- [ ] Integration tests for critical workflows
- [ ] Security testing completed
- [ ] Load testing (50+ concurrent users)
- [ ] Cross-browser testing

**Status**: Partial  
**Estimated Time**: 2 weeks  
**Confidence After**: 99%

---

## Timeline to Production

### Sprint 1 (Week 1-2): Critical Fixes
**Goal**: Fix security and data integrity issues  
**Tasks**: P1, P2, P3, P4, P5  
**Outcome**: System is secure and won't corrupt data  
**Confidence**: 40% → 70%

### Sprint 2 (Week 3-4): High Priority Fixes
**Goal**: Add audit trail, transactions, settings  
**Tasks**: P6, P7, P8, P9, P10  
**Outcome**: System is traceable and configurable  
**Confidence**: 70% → 85%

### Sprint 3 (Week 5-6): Testing & Documentation
**Goal**: Verify everything works  
**Tasks**: Integration tests, load tests, security tests, docs  
**Outcome**: System is tested and documented  
**Confidence**: 85% → 95%

### Sprint 4 (Week 7-8): Launch Preparation
**Goal**: Final polish, monitoring setup  
**Tasks**: Production environment, monitoring, backup, training  
**Outcome**: Ready for production launch  
**Confidence**: 95% → 99%

### Post-Launch: Stabilization
**Goal**: Monitor, fix issues, add features  
**Tasks**: Bug fixes, medium priority features  
**Outcome**: Stable production system  
**Confidence**: 99% → 100%

---

## Risk Assessment

### Current Risk Level: 🔴 HIGH

**Reasons**:
- RLS not implemented (security vulnerability)
- No database constraints (data integrity risk)
- No transaction support (partial saves possible)
- Demo mode can bypass security

**Impact**: **DO NOT DEPLOY TO PRODUCTION**

### After Critical Fixes: 🟡 MEDIUM

**Reasons**:
- Security vulnerabilities fixed
- Data integrity ensured
- Missing audit trail (compliance risk)
- Missing background jobs (UX issue)

**Impact**: Can deploy to **pilot users** (limited production)

### After High Priority Fixes: 🟢 LOW

**Reasons**:
- All major systems implemented
- Minor features missing (branch access control, rate limiting)

**Impact**: Can deploy to **full production**

---

## Final Verdict

### Current State
- **Architecture**: ✅ Solid, production-capable
- **Security**: ❌ RLS not implemented (BLOCKER)
- **Data Integrity**: ❌ No constraints (BLOCKER)
- **Functionality**: ✅ Core features working
- **Documentation**: ✅ Excellent

### Recommendation

**DO NOT DEPLOY** until Critical Fixes (P1-P5) are complete.

**Timeline**:
- Minimum: 2-3 weeks (critical fixes only)
- Recommended: 6-8 weeks (includes high priority + testing)
- Safe: 8-10 weeks (includes all medium priority)

### Deployment Path

1. **Week 1-2**: Fix P1-P5 (critical)
2. **Week 3-4**: Fix P6-P10 (high)
3. **Week 5-6**: Testing & documentation
4. **Week 7**: Staging deployment
5. **Week 8**: Pilot launch (5-10 users)
6. **Week 9-10**: Monitor, fix issues
7. **Week 11**: Full production launch

---

## Next Actions (Start Immediately)

### Action 1: Complete V1 → V2 Migration
```bash
# Find all V1 usages
grep -r "useBranch()" components/ app/ --include="*.tsx"

# Expected files to update:
# - components/header/BranchSelector.tsx
# - components/layout/ModernDashboardLayout.tsx
# - app/settings/branches/page.tsx
# - components/sales/AddSaleModal.tsx (if using branch context)
# - components/purchases/AddPurchaseModal.tsx (if using branch context)
```

### Action 2: Create RLS Migration Script
```bash
# Create file
touch database/ENABLE_RLS.sql

# Add policies for all tables
# Test with multiple business accounts
```

### Action 3: Create Constraints Migration Script
```bash
# Create file
touch database/ADD_CONSTRAINTS.sql

# Add FK, unique, check constraints
# Add indexes
# Test with invalid data
```

### Action 4: Implement Error Boundary
```bash
# Create component
touch components/ErrorBoundary.tsx

# Update layout.tsx
# Test by throwing error in component
```

### Action 5: Add localStorage Quota Handling
```bash
# Create utility
touch lib/utils/storage.ts

# Update BranchContextV2
# Test by filling localStorage to limit
```

---

**Roadmap Version**: 1.0  
**Created**: January 8, 2026  
**Status**: Ready for Execution  
**Estimated Production Date**: March 2026 (with full testing)

