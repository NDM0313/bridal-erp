# Architecture Decisions - POS Core Flows

## 🎯 Overview

This document explains the architectural decisions for implementing core POS business flows, including when to use direct Supabase queries vs backend API.

---

## 📊 Decision Matrix

| Operation | Method | Reason |
|-----------|--------|--------|
| **List Products** | Direct Supabase | Simple read, RLS enforces security |
| **Create Product** | Direct Supabase | Simple write, RLS ensures business_id |
| **Update Product** | Direct Supabase | Simple write, RLS enforces same business |
| **List Sales** | Direct Supabase | Simple read, RLS enforces security |
| **Create Sale** | Backend API | Complex: stock validation + atomic operations |
| **Check Stock** | Direct Supabase | Simple read, RLS enforces security |
| **Update Stock** | Backend API | Complex: atomic operations + prevent negative |
| **Daily Sales Report** | Direct Supabase | Simple aggregation, RLS enforces security |
| **Monthly Sales Report** | Direct Supabase | Simple aggregation, RLS enforces security |
| **Product Sales Report** | Direct Supabase | Simple aggregation, RLS enforces security |

---

## 🔐 Direct Supabase (Anon + JWT)

### When to Use

**✅ Use for**:
- Simple read operations (list, get by ID)
- Simple write operations (create, update single record)
- Reports and aggregations
- Stock queries (read-only)

**✅ Benefits**:
- Faster (no backend round-trip)
- Simpler code
- RLS automatically enforces security
- Less server load

**✅ Security**:
- RLS enforces `business_id = get_user_business_id()`
- JWT token automatically included
- No service_role key needed
- Multi-tenant isolation guaranteed

### Examples

```typescript
// ✅ List products (Direct Supabase)
const products = await listProducts({ search: 'laptop' });
// RLS automatically filters by business_id

// ✅ Create product (Direct Supabase)
const product = await createProduct({
  name: 'Laptop',
  sku: 'LAP-001',
  unit_id: 1,
});
// RLS ensures business_id is set correctly

// ✅ Get daily sales (Direct Supabase)
const dailySales = await getDailySalesTotal('2024-01-01', '2024-01-31');
// RLS automatically filters by business_id
```

---

## 🏗️ Backend API (JWT Verification)

### When to Use

**✅ Use for**:
- Complex operations (multi-step)
- Atomic operations (transaction + stock update)
- Business logic enforcement (stock validation, unit conversion)
- Operations requiring consistency guarantees

**✅ Benefits**:
- Ensures atomicity
- Enforces business rules
- Prevents race conditions
- Handles complex validations

**✅ Security**:
- Backend verifies JWT token
- Backend extracts business_id from user_profiles
- Backend uses service_role for admin operations only
- RLS still enforced on database level

### Examples

```typescript
// ✅ Create sale (Backend API)
const sale = await salesApi.create({
  locationId: 1,
  customerType: 'retail',
  items: [
    { variationId: 1, quantity: 2, unitId: 1 }
  ],
  status: 'final',
});
// Backend validates stock, creates transaction, updates stock atomically

// ✅ Create purchase (Backend API)
const purchase = await purchasesApi.create({
  locationId: 1,
  items: [
    { variationId: 1, quantity: 10, unitId: 1 }
  ],
  status: 'final',
});
// Backend validates, creates transaction, increases stock atomically
```

---

## 🔒 Security Guarantees

### Direct Supabase

**Security Model**:
- ✅ Uses anon key (safe to expose)
- ✅ JWT token automatically included
- ✅ RLS enforces `business_id = get_user_business_id()`
- ✅ Unauthenticated users see no data
- ✅ Cross-business access blocked

**Verification**:
```typescript
// RLS automatically filters
const products = await supabase
  .from('products')
  .select('*');
// Only products where business_id = get_user_business_id() are returned
```

### Backend API

**Security Model**:
- ✅ Backend verifies JWT token
- ✅ Backend extracts business_id from user_profiles
- ✅ Backend filters by business_id
- ✅ RLS still enforced on database
- ✅ Service_role used only for admin operations

**Verification**:
```typescript
// Backend middleware verifies JWT
authenticateUser(req, res, next) {
  // Verify JWT
  // Extract business_id from user_profiles
  // Attach to req.businessId
}

// Backend service filters by business_id
const products = await supabase
  .from('products')
  .select('*')
  .eq('business_id', businessId);
```

---

## 📋 Implementation Checklist

### Product Management
- [x] List products - Direct Supabase ✅
- [x] Create product - Direct Supabase ✅
- [x] Update product - Direct Supabase ✅
- [x] RLS enforces business_id isolation ✅

### Sales Flow
- [x] List sales - Direct Supabase ✅
- [x] Create sale - Backend API ✅
- [x] Stock validation - Backend API ✅
- [x] Atomic operations - Backend API ✅

### Stock Management
- [x] Query stock - Direct Supabase ✅
- [x] Check availability - Direct Supabase ✅
- [x] Update stock - Backend API ✅
- [x] Prevent negative - Backend API ✅

### Reports
- [x] Daily sales - Direct Supabase ✅
- [x] Monthly sales - Direct Supabase ✅
- [x] Product sales - Direct Supabase ✅
- [x] RLS enforces business_id isolation ✅

---

## 🎯 Best Practices

### 1. Use Direct Supabase When:
- Operation is simple (single table read/write)
- No complex business logic required
- RLS can enforce security
- Performance is critical

### 2. Use Backend API When:
- Operation is complex (multi-step)
- Atomic operations required
- Business logic enforcement needed
- Consistency guarantees required

### 3. Security First:
- Always verify JWT token
- Always filter by business_id
- Never expose service_role key
- Always respect RLS policies

---

## 📝 Code Examples

### Direct Supabase Pattern

```typescript
// lib/services/productService.ts
export async function listProducts() {
  // RLS automatically filters by business_id
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) throw new Error(error.message);
  return data || [];
}
```

### Backend API Pattern

```typescript
// lib/api/sales.ts
export const salesApi = {
  create: (data: CreateSaleDto) => 
    api.post<Sale>('/sales', data),
};

// Backend handles:
// - JWT verification
// - Stock validation
// - Atomic operations
// - Business logic
```

---

## ✅ Production Readiness

**Status**: ✅ **READY**

**Security**:
- ✅ All operations respect RLS
- ✅ Business-level isolation enforced
- ✅ JWT required for all operations
- ✅ No service_role key in frontend

**Architecture**:
- ✅ Clear separation of concerns
- ✅ Appropriate use of Direct Supabase vs Backend API
- ✅ Security-first design
- ✅ Production-safe implementation

---

**Architecture decisions are documented and production-ready!** ✅

