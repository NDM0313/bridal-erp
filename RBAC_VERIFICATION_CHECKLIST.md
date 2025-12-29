# RBAC Verification Checklist

## 🎯 PURPOSE

Verify that role-based access control works correctly and maintains security guarantees.

---

## ✅ CHECKLIST 1: CASHIER RESTRICTIONS

### Test 1: Cashier Cannot Access Admin Screens

**Action**:
1. Login as cashier (role = 'cashier')
2. Navigate to `/products`
3. Check if "New Product" button is visible

**Expected**:
- ✅ "New Product" button is hidden (RoleGuard)
- ✅ If accessed directly via `/products/new`, backend returns 403

**Verification**:
```typescript
// Frontend: Button hidden
<RoleGuard permission="canCreateProducts">
  <Button>New Product</Button>
</RoleGuard>

// Backend: API blocked
router.post('/products',
  requirePermission('products.create'), // Blocks cashier
  handler
);
```

**❌ If Button Visible**: RoleGuard not working → Fix RoleGuard component

---

### Test 2: Cashier Cannot Modify Products

**Action**:
1. Login as cashier
2. Try to edit product via API: `PUT /api/v1/products/:id`

**Expected**:
- ✅ Backend returns 403 Forbidden
- ✅ Error message: "This action requires one of these roles: admin, manager"

**Verification**:
```javascript
// Backend blocks cashier
router.put('/products/:id',
  requirePermission('products.edit'), // Blocks cashier
  handler
);
```

**❌ If Request Succeeds**: Backend role check not working → Fix requirePermission middleware

---

### Test 3: Cashier Cannot View Advanced Reports

**Action**:
1. Login as cashier
2. Navigate to `/reports/advanced`

**Expected**:
- ✅ Advanced reports tab is hidden (RoleGuard)
- ✅ If accessed directly, backend returns 403

**Verification**:
```typescript
// Frontend: Tab hidden
<RoleGuard permission="canViewAdvancedReports">
  <Tab>Advanced Reports</Tab>
</RoleGuard>
```

**❌ If Tab Visible**: RoleGuard not working → Fix RoleGuard component

---

## ✅ CHECKLIST 2: MANAGER PERMISSIONS

### Test 1: Manager Can Adjust Stock

**Action**:
1. Login as manager (role = 'manager')
2. Create stock adjustment: `POST /api/v1/adjustments`

**Expected**:
- ✅ Request succeeds (manager allowed)
- ✅ Stock is adjusted

**Verification**:
```javascript
// Backend allows manager
router.post('/adjustments',
  requirePermission('stock.adjust'), // Allows manager
  handler
);
```

**❌ If Request Fails**: Permission check incorrect → Fix requirePermission

---

### Test 2: Manager Cannot Delete Products

**Action**:
1. Login as manager
2. Try to delete product: `DELETE /api/v1/products/:id`

**Expected**:
- ✅ Backend returns 403 Forbidden
- ✅ Error message: "This action requires one of these roles: admin"

**Verification**:
```javascript
// Backend blocks manager
router.delete('/products/:id',
  requirePermission('products.delete'), // Blocks manager (admin only)
  handler
);
```

**❌ If Request Succeeds**: Permission check incorrect → Fix requirePermission

---

### Test 3: Manager Can View Advanced Reports

**Action**:
1. Login as manager
2. Navigate to `/reports/advanced`

**Expected**:
- ✅ Advanced reports tab is visible
- ✅ Reports load successfully

**Verification**:
```typescript
// Frontend: Tab visible
<RoleGuard permission="canViewAdvancedReports">
  <Tab>Advanced Reports</Tab> {/* Manager can see this */}
</RoleGuard>
```

**❌ If Tab Hidden**: RoleGuard incorrect → Fix RoleGuard

---

## ✅ CHECKLIST 3: ADMIN PERMISSIONS

### Test 1: Admin Has Full Control

**Action**:
1. Login as admin (role = 'admin')
2. Try all operations:
   - Create product
   - Edit product
   - Delete product
   - Adjust stock
   - View advanced reports

**Expected**:
- ✅ All operations succeed

**Verification**:
- Admin role has all permissions in `ROLE_PERMISSIONS.admin`

**❌ If Any Operation Fails**: Permission matrix incorrect → Fix ROLE_PERMISSIONS

---

### Test 2: Admin Can View Audit Logs

**Action**:
1. Login as admin
2. View audit logs: `GET /api/v1/audit`

**Expected**:
- ✅ Audit logs are returned
- ✅ Only logs from admin's business are shown (RLS)

**Verification**:
```javascript
// Backend allows admin
router.get('/audit',
  requireRole('admin', 'manager', 'auditor'), // Allows admin
  handler
);
```

**❌ If Request Fails**: Role check incorrect → Fix requireRole

---

## ✅ CHECKLIST 4: ROLE ESCALATION PREVENTION

### Test 1: Roles Cannot Be Forged via Frontend

**Action**:
1. Login as cashier
2. Try to modify `user_profiles.role` via API

**Expected**:
- ✅ No API endpoint exists for role changes
- ✅ Even if endpoint exists, RLS prevents modification
- ✅ Backend validates role from database, not from request

**Verification**:
- Role is extracted from `user_profiles` table (database)
- Role cannot be set via API request
- RLS ensures users can only see their own profile

**❌ If Role Can Be Modified**: Security risk → Remove role modification endpoint

---

### Test 2: JWT Does Not Contain Role

**Action**:
1. Login as any user
2. Inspect JWT token (decode at jwt.io)

**Expected**:
- ✅ JWT contains user ID and email only
- ✅ JWT does NOT contain role
- ✅ Role is fetched from database by backend

**Verification**:
```javascript
// Backend extracts role from database
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

req.userRole = profile.role; // From database, not JWT
```

**❌ If JWT Contains Role**: Security risk → Remove role from JWT

---

### Test 3: Backend Validates Role from Database

**Action**:
1. Login as cashier
2. Try to send request with modified role in header

**Expected**:
- ✅ Backend ignores role in header
- ✅ Backend fetches role from database
- ✅ Request is blocked (cashier cannot perform admin action)

**Verification**:
- Backend always fetches role from `user_profiles` table
- Role is never read from request headers or body

**❌ If Backend Uses Header Role**: Security risk → Fix backend to use database role

---

## ✅ CHECKLIST 5: AUDIT LOGGING

### Test 1: Audit Logs Are Created

**Action**:
1. Login as admin
2. Create a product
3. Check audit logs: `GET /api/v1/audit`

**Expected**:
- ✅ Audit log entry is created
- ✅ Log contains: user_id, user_role, action, entity_type, entity_id
- ✅ Log is immutable (cannot be modified)

**Verification**:
```javascript
// Audit log created after product creation
createAuditLog({
  businessId: req.businessId,
  userId: req.user.id,
  userRole: req.userRole,
  action: 'product_created',
  entityType: 'product',
  entityId: product.id,
  ...
});
```

**❌ If Log Not Created**: Audit logging not working → Fix audit service

---

### Test 2: Audit Logs Are Business-Scoped

**Action**:
1. Login as admin from business_id = 1
2. View audit logs: `GET /api/v1/audit`

**Expected**:
- ✅ Only logs from business_id = 1 are shown
- ✅ RLS ensures business isolation

**Verification**:
- RLS policy: `business_id = get_user_business_id()`
- Backend filters by `req.businessId`

**❌ If Other Business Logs Visible**: RLS policy broken → Fix RLS policy

---

### Test 3: Audit Logs Are Immutable

**Action**:
1. Login as admin
2. Try to modify audit log via API

**Expected**:
- ✅ No API endpoint exists for modifying audit logs
- ✅ Even if endpoint exists, RLS prevents modification

**Verification**:
- No UPDATE or DELETE endpoints for audit_logs
- RLS policy only allows SELECT (read-only)

**❌ If Logs Can Be Modified**: Security risk → Remove modification endpoints

---

## ✅ CHECKLIST 6: RLS + ROLE CHECKS

### Test 1: RLS Enforces Business Isolation

**Action**:
1. Login as admin from business_id = 1
2. Try to access product from business_id = 2

**Expected**:
- ✅ RLS blocks access (product not found)
- ✅ Backend returns 404 or empty result

**Verification**:
- RLS policy: `business_id = get_user_business_id()`
- Backend also filters by `req.businessId`

**❌ If Cross-Business Access**: RLS policy broken → Fix RLS policy

---

### Test 2: Role Checks Work Within Business

**Action**:
1. Login as cashier from business_id = 1
2. Try to edit product from business_id = 1

**Expected**:
- ✅ RLS allows access (same business)
- ✅ Backend role check blocks access (cashier cannot edit)
- ✅ Backend returns 403 Forbidden

**Verification**:
- RLS: ✅ (same business)
- Role check: ❌ (cashier cannot edit)
- Result: 403 Forbidden

**❌ If Request Succeeds**: Role check not working → Fix requirePermission

---

## 📋 COMPLETE VERIFICATION CHECKLIST

### Cashier Restrictions
- [ ] Cashier cannot access admin screens
- [ ] Cashier cannot modify products
- [ ] Cashier cannot view advanced reports
- [ ] Cashier can create sales
- [ ] Cashier can view invoices/receipts

### Manager Permissions
- [ ] Manager can adjust stock
- [ ] Manager can view advanced reports
- [ ] Manager cannot delete products
- [ ] Manager cannot manage users

### Admin Permissions
- [ ] Admin has full control
- [ ] Admin can view audit logs
- [ ] Admin can manage users
- [ ] Admin can delete products

### Role Escalation Prevention
- [ ] Roles cannot be forged via frontend
- [ ] JWT does not contain role
- [ ] Backend validates role from database

### Audit Logging
- [ ] Audit logs are created
- [ ] Audit logs are business-scoped
- [ ] Audit logs are immutable

### RLS + Role Checks
- [ ] RLS enforces business isolation
- [ ] Role checks work within business

---

## 🎯 EXPECTED RESULTS

### ✅ Success Indicators

1. **Cashier**: Cannot access admin features, can create sales
2. **Manager**: Can adjust stock, view reports, cannot delete products
3. **Admin**: Full access to all features
4. **Role Escalation**: Impossible (roles from database, not JWT)
5. **Audit Logging**: All sensitive actions logged
6. **RLS + Roles**: Both layers work together

### ❌ Failure Indicators

1. **Cashier**: Can access admin features
2. **Manager**: Can delete products
3. **Role Escalation**: Possible (roles in JWT or modifiable)
4. **Audit Logging**: Not working or logs can be modified
5. **RLS + Roles**: One layer broken

---

**If all checks pass**: RBAC is secure and production-ready! ✅

