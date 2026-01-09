# Phase E: Final System Contract

## DO NOT BREAK RULES

**This contract defines what backend GUARANTEES and what frontend/mobile MUST NOT assume. This document is binding for all future development.**

---

## Backend Guarantees

### 1. API Stability

**✅ Backend GUARANTEES**:
- API endpoints will NOT change without versioning (e.g., `/api/v1/` → `/api/v2/`)
- Response formats will remain consistent
- Error codes will remain consistent
- Request formats will remain backward-compatible

**Example**:
```json
// This response format will NEVER change
{
  "success": true,
  "data": { ... }
}

// This error format will NEVER change
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

### 2. Authentication

**✅ Backend GUARANTEES**:
- JWT token authentication required for all protected endpoints
- Token format: `Authorization: Bearer <token>`
- Token validation via Supabase Auth
- Token expiration handled consistently

**Token Format**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Error Response** (if token invalid):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

### 3. Authorization

**✅ Backend GUARANTEES**:
- Role-based access control enforced on every request
- Permissions checked before processing
- `403 Forbidden` returned if user lacks permission
- Role is source of truth (from database, not JWT)

**Error Response** (if unauthorized):
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "This action requires one of these roles: admin, manager. Your role: cashier"
  }
}
```

---

### 4. Business Logic Consistency

**✅ Backend GUARANTEES**:
- Sale creation always follows same rules
- Production order creation always follows same rules
- Stock deduction always follows same rules
- Cost calculation always follows same rules

**Rules**:
- Sale type (studio/normal) determined ONLY by `products.requires_production` flag
- Production orders created automatically when sale finalized AND product requires production
- Stock deducted only when sale status = 'final'
- Costs calculated from `production_steps.cost` sum

---

### 5. Data Integrity

**✅ Backend GUARANTEES**:
- Business context (`business_id`) always enforced
- Location context (`location_id`) always enforced
- RLS policies always active
- Foreign key constraints always enforced

**Multi-Tenancy**:
- All data queries filtered by `business_id`
- Users can only access their business data
- No cross-business data leakage

---

### 6. Error Handling

**✅ Backend GUARANTEES**:
- Consistent error response format
- Error codes are stable
- Error messages are human-readable
- Stack traces NOT exposed in production

**Error Response Format**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": "Optional details (development only)"
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED` - Missing or invalid token
- `INSUFFICIENT_PERMISSIONS` - User lacks required role/permission
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `DATABASE_ERROR` - Database operation failed

---

## What Frontend/Mobile MUST NOT Assume

### ❌ DO NOT ASSUME: Hard-Coded Business Logic

**❌ WRONG**:
```typescript
// DON'T: Assume sale type based on channel
if (channel === 'whatsapp') {
  createStudioOrder(); // WRONG!
}

// DON'T: Assume production order creation
if (sale.status === 'final') {
  createProductionOrder(); // WRONG! Backend handles this
}
```

**✅ CORRECT**:
```typescript
// DO: Check product flag
if (product.requires_production) {
  // Sale will auto-create production order (backend handles)
}

// DO: Let backend handle business logic
const sale = await createSale(saleData);
// Backend automatically creates production order if needed
```

---

### ❌ DO NOT ASSUME: Permission Based on Role

**❌ WRONG**:
```typescript
// DON'T: Assume user has permission
if (userRole === 'admin') {
  showDeleteButton(); // WRONG! Check permission
}
```

**✅ CORRECT**:
```typescript
// DO: Check permission before showing UI
if (hasPermission(userRole, 'products.delete')) {
  showDeleteButton();
}

// DO: Handle 403 gracefully
try {
  await deleteProduct(id);
} catch (error) {
  if (error.code === 'INSUFFICIENT_PERMISSIONS') {
    showError('You do not have permission to delete products');
  }
}
```

---

### ❌ DO NOT ASSUME: Data Structure Won't Change

**❌ WRONG**:
```typescript
// DON'T: Access fields directly without checking
const total = sale.final_total; // WRONG! Field might not exist
```

**✅ CORRECT**:
```typescript
// DO: Use optional chaining
const total = sale?.final_total ?? 0;

// DO: Use TypeScript types (if available)
interface Sale {
  final_total: number;
}

// DO: Handle missing fields gracefully
if (sale.final_total !== undefined) {
  // Use field
}
```

---

### ❌ DO NOT ASSUME: API is Always Available

**❌ WRONG**:
```typescript
// DON'T: Assume API call will succeed
const sales = await fetch('/api/v1/sales');
// No error handling
```

**✅ CORRECT**:
```typescript
// DO: Implement retry logic
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}

// DO: Handle network errors
try {
  const sales = await fetchWithRetry('/api/v1/sales');
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

---

### ❌ DO NOT ASSUME: Business Rules in Frontend

**❌ WRONG**:
```typescript
// DON'T: Duplicate business logic
if (sale.status === 'final' && product.requires_production) {
  await createProductionOrder(); // WRONG! Backend handles this
}
```

**✅ CORRECT**:
```typescript
// DO: Let backend handle business rules
const sale = await createSale({
  items: [...],
  status: 'final'
});
// Backend automatically creates production order if needed

// DO: Trust backend validation
// Frontend can validate for UX, but backend is source of truth
```

---

## What is Safe to Extend in Future

### ✅ SAFE: New API Endpoints

**✅ Allowed**:
- Add new endpoints (don't break existing ones)
- Add new query parameters (optional)
- Add new response fields (optional, backward-compatible)

**Example**:
```javascript
// ✅ SAFE: New endpoint
GET /api/v1/products/search?q=shirt

// ✅ SAFE: New optional parameter
GET /api/v1/sales?include_cancelled=true

// ✅ SAFE: New response field (optional)
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_no": "INV-001",
    "new_field": "value" // ✅ New field is safe
  }
}
```

---

### ✅ SAFE: New Roles

**✅ Allowed**:
- Add new roles to RBAC system
- Add new permissions
- Extend permission matrix

**Example**:
```javascript
// ✅ SAFE: New role
'warehouse_manager': {
  canViewStock: true,
  canAdjustStock: true,
  // ... other permissions
}

// ✅ SAFE: New permission
'warehouse.transfer': ['warehouse_manager', 'admin']
```

---

### ✅ SAFE: New Channels

**✅ Allowed**:
- Add new social media channels
- Add new notification channels
- Extend channel types

**Example**:
```javascript
// ✅ SAFE: New channel type
channel_type: 'telegram' // New channel type

// ✅ SAFE: New notification channel
notification_channels: ['whatsapp', 'email', 'sms'] // New channels
```

---

### ✅ SAFE: New Features

**✅ Allowed**:
- Add new modules (don't break existing ones)
- Add new reports
- Add new integrations

**Example**:
```javascript
// ✅ SAFE: New module
GET /api/v1/inventory/adjustments // New module

// ✅ SAFE: New report
GET /api/v1/reports/inventory-valuation // New report
```

---

### ✅ SAFE: Database Extensions

**✅ Allowed**:
- Add new tables
- Add new columns (nullable or with defaults)
- Add new indexes

**Example**:
```sql
-- ✅ SAFE: New table
CREATE TABLE inventory_transfers (...);

-- ✅ SAFE: New nullable column
ALTER TABLE products ADD COLUMN barcode VARCHAR(50) NULL;

-- ✅ SAFE: New column with default
ALTER TABLE sales ADD COLUMN discount_reason VARCHAR(255) DEFAULT NULL;
```

---

## What Must NEVER Be Changed

### ❌ NEVER: Core Business Logic

**❌ FORBIDDEN**:
- Sale creation flow
- Production order creation flow
- Stock deduction logic
- Cost calculation logic

**Reason**: These are core business rules. Changing them breaks existing functionality.

---

### ❌ NEVER: API Contracts

**❌ FORBIDDEN**:
- Request/response formats (without versioning)
- Error response format
- Authentication mechanism

**Reason**: Frontend/mobile apps depend on these contracts. Breaking them breaks all clients.

---

### ❌ NEVER: Database Schema (Breaking Changes)

**❌ FORBIDDEN**:
- Removing columns
- Changing column types (without migration)
- Removing foreign keys
- Removing RLS policies (without migration)

**Reason**: Breaking schema changes cause data loss and break existing functionality.

---

### ❌ NEVER: Security

**❌ FORBIDDEN**:
- Authentication flow
- Authorization checks
- RLS policies (without migration)

**Reason**: Security changes can introduce vulnerabilities or break access control.

---

### ❌ NEVER: Event System

**❌ FORBIDDEN**:
- Event names (without deprecation)
- Event data structure (without versioning)

**Reason**: Event listeners depend on event names and data structure. Breaking them breaks integrations.

---

## Versioning Strategy

### API Versioning

**Current**: `/api/v1/*`

**Future**: `/api/v2/*` (when breaking changes needed)

**Rules**:
- Keep `/api/v1/*` working (backward compatibility)
- New features can go in `/api/v2/*`
- Deprecate `/api/v1/*` gradually (with notice)

---

### Event Versioning

**Current**: Event names are stable

**Future**: Add version suffix if needed (e.g., `sale.created.v2`)

**Rules**:
- Keep old events working
- Emit both old and new events during transition
- Deprecate old events gradually

---

## Extension Guidelines

### Adding New Features

1. **Check Contract**: Does it break any guarantees?
2. **Backward Compatible**: Can existing clients still work?
3. **Version if Needed**: Use `/api/v2/*` if breaking changes
4. **Document**: Update API documentation
5. **Test**: Test with existing clients

---

### Modifying Existing Features

1. **Impact Analysis**: What clients depend on this?
2. **Backward Compatible**: Can we add without breaking?
3. **Deprecation**: If breaking, deprecate old version first
4. **Migration Path**: Provide clear migration path
5. **Communication**: Notify clients of changes

---

## Contract Enforcement

### For Developers

- ✅ Read this contract before making changes
- ✅ Check if change breaks any guarantee
- ✅ Use versioning if breaking changes needed
- ✅ Test backward compatibility
- ✅ Update documentation

### For AI Agents

- ✅ Follow this contract strictly
- ✅ Do NOT break any guarantees
- ✅ Use versioning for breaking changes
- ✅ Verify backward compatibility
- ✅ Document all changes

---

**Status**: ✅ **System Contract Locked**  
**Binding For**: All future development  
**Last Updated**: January 8, 2026

---

**This contract is FINAL and must be followed for all future development.**
