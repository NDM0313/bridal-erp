# RBAC Quick Start Guide

## 🚀 SETUP

### 1. Run Database Migration

```sql
-- Execute in Supabase SQL Editor
\i database/RBAC_SETUP.sql
```

This will:
- ✅ Add role column to `user_profiles` (if not exists)
- ✅ Add CHECK constraint for valid roles
- ✅ Create `get_user_role()` function
- ✅ Create `audit_logs` table
- ✅ Enable RLS on audit_logs

### 2. Assign Roles to Users

```sql
-- Set user role (replace user_id and business_id)
UPDATE user_profiles
SET role = 'admin'  -- or 'manager', 'cashier', 'auditor'
WHERE user_id = 'user-uuid-here'
  AND business_id = 1;
```

### 3. Verify Setup

```sql
-- Check user roles
SELECT user_id, business_id, role
FROM user_profiles;

-- Check audit_logs table exists
SELECT * FROM audit_logs LIMIT 1;
```

---

## 📋 ROLES OVERVIEW

| Role | Products | Stock | Reports | Audit | Users |
|------|----------|-------|---------|-------|-------|
| **Admin** | Full | Full | Full | View | Manage |
| **Manager** | Create/Edit | Adjust | Advanced | View | - |
| **Cashier** | View Only | View | Basic | - | - |
| **Auditor** | View Only | View | Full | View | - |

---

## 🔒 SECURITY GUARANTEES

✅ **Roles stored in database** (not JWT)  
✅ **Backend validates roles** (frontend cannot forge)  
✅ **RLS enforces business isolation**  
✅ **Role checks enforce permissions**  
✅ **Audit logs are immutable**  
✅ **Defense in depth** (RLS + backend checks)

---

## 📝 USAGE EXAMPLES

### Frontend: Hide UI Elements

```typescript
import { RoleGuard, AdminOnly } from '@/components/auth/RoleGuard';

// Hide button if user lacks permission
<RoleGuard permission="canCreateProducts">
  <Button>New Product</Button>
</RoleGuard>

// Admin-only button
<AdminOnly>
  <Button>Delete Product</Button>
</AdminOnly>
```

### Backend: Protect Routes

```javascript
import { requirePermission, requireRole } from '../middleware/auth.js';

// Require specific permission
router.post('/products',
  authenticateUser,
  requirePermission('products.create'),
  handler
);

// Require one of multiple roles
router.get('/audit',
  authenticateUser,
  requireRole('admin', 'manager', 'auditor'),
  handler
);
```

---

## ✅ VERIFICATION

See `RBAC_VERIFICATION_CHECKLIST.md` for complete verification steps.

**Quick Test**:
1. Login as cashier
2. Try to create product → Should be blocked (403)
3. Try to view products → Should succeed
4. Check audit logs → Should be blocked (403)

---

**RBAC is ready for production use!** ✅

