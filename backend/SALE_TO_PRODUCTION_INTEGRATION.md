# Sale to Production Order Integration Design

## Overview

Safe integration logic for automatically creating production orders when sales are made. This design ensures data integrity, respects business context, and maintains backward compatibility.

---

## Integration Requirements

### Business Rules
1. **Automatic Creation**: Production order created automatically after sale is finalized
2. **Sale Linkage**: Production order must be linked to the sale transaction
3. **Business Context**: Must respect `business_id` and `location_id` from sale
4. **No Manual Creation**: Production orders can only be created via sales (no manual studio order creation)
5. **Semi-Advanced Structure**: Use existing `production_orders` table with minimal changes

### Constraints
- Do NOT change frontend logic
- Do NOT break existing sale creation flow
- Do NOT allow orphaned production orders
- Must handle failures gracefully (rollback if needed)

---

## Step-by-Step Backend Logic

### Insertion Point: `salesService.js` → `createSale()`

**Location**: After transaction and sell lines are created, before stock deduction

**Flow**:
```
1. Create transaction (existing)
2. Create transaction_sell_lines (existing)
3. [NEW] Check if production order needed
4. [NEW] Create production_order if needed
5. [NEW] Create production_steps if needed
6. Deduct stock (existing)
7. Trigger notifications (existing)
```

### Detailed Logic

#### Step 1: Identify Products Requiring Production

**Decision Point**: Which sales should trigger production orders?

**Option A**: All sales (simple, but may create unnecessary orders)
**Option B**: Products with flag `requires_production = true` (recommended)
**Option C**: Category-based (e.g., "Custom Orders" category)
**Option D**: Customer type based (e.g., wholesale customers)

**Recommended**: **Option B** - Add `requires_production` flag to products table

**Logic**:
```javascript
// After transaction and sell lines are created
const { data: products } = await supabase
  .from('products')
  .select('id, name, requires_production')
  .in('id', productIds)
  .eq('business_id', businessId);

const productsNeedingProduction = products.filter(p => p.requires_production === true);
```

#### Step 2: Create Production Order

**When**: Only if `productsNeedingProduction.length > 0` AND `status === 'final'`

**Data Mapping**:
```javascript
const productionOrderData = {
  business_id: businessId,
  customer_id: contactId, // From sale
  order_no: `PO-${transaction.invoice_no}`, // Link to sale invoice
  status: 'new', // Initial status
  total_cost: 0, // Will be calculated from steps
  final_price: transaction.final_total, // Link to sale total
  description: `Auto-generated from Sale ${transaction.invoice_no}`,
  created_by: userId,
  // Link to sale
  transaction_id: transaction.id, // NEW COLUMN NEEDED
  location_id: locationId, // NEW COLUMN NEEDED (optional, for branch tracking)
};
```

#### Step 3: Create Production Steps

**Default Steps**: Based on business requirements

**Logic**:
```javascript
// Default production steps for auto-created orders
const defaultSteps = [
  { stepName: 'Dyeing', cost: 0, status: 'pending' },
  { stepName: 'Stitching', cost: 0, status: 'pending' },
  { stepName: 'Handwork', cost: 0, status: 'pending' },
];

// Or fetch from business settings
const { data: defaultSteps } = await supabase
  .from('system_settings')
  .select('value')
  .eq('business_id', businessId)
  .eq('key', 'default_production_steps')
  .single();
```

#### Step 4: Link Materials (Optional)

**If sale items should be tracked as materials**:
```javascript
// Create production_materials from sale items
const materials = items.map(item => ({
  production_order_id: productionOrder.id,
  product_id: item.product_id,
  variation_id: item.variation_id,
  quantity_used: item.quantity,
  unit_id: item.unit_id,
  unit_cost: item.unit_price,
  total_cost: item.quantity * item.unit_price,
}));
```

---

## Required Minimal DB Changes

### 1. Add `transaction_id` Column to `production_orders`

**Purpose**: Link production order to sale transaction

**SQL**:
```sql
ALTER TABLE production_orders
ADD COLUMN IF NOT EXISTS transaction_id INTEGER NULL;

-- Add foreign key constraint
ALTER TABLE production_orders
ADD CONSTRAINT fk_production_orders_transaction
FOREIGN KEY (transaction_id)
REFERENCES transactions(id)
ON DELETE SET NULL;

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_production_orders_transaction_id
ON production_orders(transaction_id);

-- Add comment
COMMENT ON COLUMN production_orders.transaction_id IS 
'Links production order to sale transaction. NULL for manually created orders (if allowed in future).';
```

**Safety**: 
- Column is nullable (backward compatible)
- Foreign key uses `ON DELETE SET NULL` (safe if sale is deleted)
- Index for performance

### 2. Add `location_id` Column to `production_orders` (Optional)

**Purpose**: Track which branch/location the production order belongs to

**SQL**:
```sql
ALTER TABLE production_orders
ADD COLUMN IF NOT EXISTS location_id INTEGER NULL;

-- Add foreign key constraint
ALTER TABLE production_orders
ADD CONSTRAINT fk_production_orders_location
FOREIGN KEY (location_id)
REFERENCES business_locations(id)
ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_production_orders_location_id
ON production_orders(location_id);

-- Add comment
COMMENT ON COLUMN production_orders.location_id IS 
'Branch/location where production order was created. Inherited from sale transaction.';
```

**Safety**: 
- Column is nullable (backward compatible)
- Foreign key uses `ON DELETE SET NULL`

### 3. Add `requires_production` Flag to `products` (Recommended)

**Purpose**: Identify which products need production orders

**SQL**:
```sql
ALTER TABLE products
ADD COLUMN IF NOT EXISTS requires_production BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_products_requires_production
ON products(requires_production)
WHERE requires_production = true;

-- Add comment
COMMENT ON COLUMN products.requires_production IS 
'If true, sale of this product automatically creates a production order.';
```

**Safety**: 
- Default is `false` (backward compatible)
- Existing products unaffected
- Partial index for performance

### 4. Add Unique Constraint (Optional)

**Prevent duplicate production orders for same sale**:
```sql
-- Only if one sale should create one production order
ALTER TABLE production_orders
ADD CONSTRAINT uq_production_orders_transaction_id
UNIQUE (transaction_id)
WHERE transaction_id IS NOT NULL;
```

**Note**: This assumes one sale = one production order. If multiple orders per sale are needed, remove this constraint.

---

## Implementation Logic

### Function: `createProductionOrderFromSale()`

**Location**: `backend/src/services/productionService.js`

```javascript
/**
 * Create production order from sale transaction
 * @param {object} transaction - Sale transaction
 * @param {array} saleItems - Transaction sell lines
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Created production order or null if not needed
 */
export async function createProductionOrderFromSale(transaction, saleItems, businessId, userId) {
  // Step 1: Check if any products require production
  const productIds = saleItems.map(item => item.product_id);
  
  const { data: products } = await supabase
    .from('products')
    .select('id, requires_production')
    .in('id', productIds)
    .eq('business_id', businessId);
  
  const needsProduction = products.some(p => p.requires_production === true);
  
  if (!needsProduction) {
    return null; // No production order needed
  }
  
  // Step 2: Generate order number
  const orderNo = `PO-${transaction.invoice_no}`;
  
  // Step 3: Check if order already exists (idempotency)
  const { data: existing } = await supabase
    .from('production_orders')
    .select('id')
    .eq('business_id', businessId)
    .eq('transaction_id', transaction.id)
    .single();
  
  if (existing) {
    // Already created, return existing
    return existing;
  }
  
  // Step 4: Create production order
  const { data: productionOrder, error: orderError } = await supabase
    .from('production_orders')
    .insert({
      business_id: businessId,
      customer_id: transaction.contact_id,
      order_no: orderNo,
      status: 'new',
      total_cost: 0, // Will be calculated from steps
      final_price: transaction.final_total,
      description: `Auto-generated from Sale ${transaction.invoice_no}`,
      transaction_id: transaction.id,
      location_id: transaction.location_id,
      created_by: userId,
    })
    .select()
    .single();
  
  if (orderError) {
    throw new Error(`Failed to create production order: ${orderError.message}`);
  }
  
  // Step 5: Create default production steps
  const defaultSteps = [
    { stepName: 'Dyeing', cost: 0 },
    { stepName: 'Stitching', cost: 0 },
    { stepName: 'Handwork', cost: 0 },
  ];
  
  const stepInserts = defaultSteps.map(step => ({
    production_order_id: productionOrder.id,
    step_name: step.stepName,
    cost: step.cost,
    status: 'pending',
  }));
  
  const { error: stepsError } = await supabase
    .from('production_steps')
    .insert(stepInserts);
  
  if (stepsError) {
    // Rollback production order
    await supabase.from('production_orders').delete().eq('id', productionOrder.id);
    throw new Error(`Failed to create production steps: ${stepsError.message}`);
  }
  
  // Step 6: Create production materials (optional)
  const materialInserts = saleItems.map(item => ({
    production_order_id: productionOrder.id,
    product_id: item.product_id,
    variation_id: item.variation_id,
    quantity_used: item.quantity,
    unit_id: item.unit_id,
    unit_cost: item.unit_price,
    total_cost: item.quantity * item.unit_price,
  }));
  
  if (materialInserts.length > 0) {
    const { error: materialsError } = await supabase
      .from('production_materials')
      .insert(materialInserts);
    
    if (materialsError) {
      console.error('Failed to create production materials:', materialsError);
      // Don't rollback - materials are optional
    }
  }
  
  return productionOrder;
}
```

### Integration Point: `salesService.js`

**Modify `createSale()` function**:

```javascript
// After transaction and sell lines are created (around line 208)
// Before stock deduction

// [NEW] Create production order if needed
let productionOrder = null;
if (status === 'final') {
  try {
    productionOrder = await createProductionOrderFromSale(
      transaction,
      createdLines,
      businessId,
      userId
    );
  } catch (productionError) {
    // Log error but don't fail sale
    console.error('Failed to create production order:', productionError);
    // Optionally: Rollback sale if production order is critical
    // await supabase.from('transactions').delete().eq('id', transaction.id);
    // await supabase.from('transaction_sell_lines').delete().eq('transaction_id', transaction.id);
    // throw new Error(`Sale created but production order failed: ${productionError.message}`);
  }
}

// Continue with stock deduction (existing code)
```

---

## Risks to Avoid

### 1. **Double Creation Risk**

**Risk**: Production order created multiple times for same sale

**Mitigation**:
- Check for existing order with `transaction_id` before creating
- Use unique constraint on `transaction_id` (if one order per sale)
- Idempotent function design

### 2. **Transaction Rollback Risk**

**Risk**: Sale succeeds but production order fails, leaving inconsistent state

**Mitigation**:
- **Option A**: Don't rollback sale (production order is secondary)
- **Option B**: Rollback sale if production order is critical (configurable)
- **Option C**: Use database transaction (if supported)

**Recommended**: **Option A** - Log error, don't fail sale. Production order can be created manually if needed.

### 3. **Performance Risk**

**Risk**: Additional database operations slow down sale creation

**Mitigation**:
- Use indexes on `transaction_id` and `requires_production`
- Make production order creation async (fire and forget)
- Batch operations where possible

### 4. **Data Integrity Risk**

**Risk**: Production order created without proper business/location context

**Mitigation**:
- Always use `business_id` from sale transaction
- Always use `location_id` from sale transaction
- Validate foreign keys exist before insert

### 5. **Manual Creation Conflict**

**Risk**: Users try to create production orders manually, conflicting with auto-creation

**Mitigation**:
- Remove manual creation UI (as per requirement)
- Add CHECK constraint: `transaction_id IS NOT NULL` (if manual creation not allowed)
- Or: Allow manual creation but prevent duplicates

### 6. **Draft Sale Risk**

**Risk**: Production order created for draft sales that may be cancelled

**Mitigation**:
- Only create production order when `status === 'final'`
- If draft is finalized later, create production order in `completeSale()` function

---

## Rollback Strategy

### If Production Order Creation Fails

**Decision**: Should sale be rolled back?

**Option 1**: **Don't Rollback** (Recommended)
- Sale is primary transaction
- Production order is secondary
- Can be created manually if needed
- Log error for monitoring

**Option 2**: **Rollback Sale**
- If production order is critical
- Use database transaction
- More complex error handling

**Implementation**:
```javascript
try {
  productionOrder = await createProductionOrderFromSale(...);
} catch (error) {
  // Option 1: Log and continue
  console.error('Production order creation failed:', error);
  // Sale continues
  
  // Option 2: Rollback sale
  // await rollbackSale(transaction.id);
  // throw error;
}
```

---

## Testing Strategy

### Test Cases

1. **Sale with production product**:
   - Create sale with product where `requires_production = true`
   - Verify production order created
   - Verify production steps created
   - Verify materials linked

2. **Sale without production product**:
   - Create sale with product where `requires_production = false`
   - Verify no production order created

3. **Draft sale**:
   - Create draft sale with production product
   - Verify no production order created
   - Finalize draft sale
   - Verify production order created

4. **Duplicate prevention**:
   - Create sale twice (idempotency)
   - Verify only one production order created

5. **Failure handling**:
   - Simulate production order creation failure
   - Verify sale still succeeds
   - Verify error logged

---

## Migration Plan

### Phase 1: Database Changes
1. Add `transaction_id` column to `production_orders`
2. Add `location_id` column to `production_orders`
3. Add `requires_production` flag to `products`
4. Add indexes and constraints

### Phase 2: Backend Integration
1. Create `createProductionOrderFromSale()` function
2. Integrate into `createSale()` function
3. Add error handling and logging

### Phase 3: Testing
1. Test with production products
2. Test with non-production products
3. Test failure scenarios
4. Test performance

### Phase 4: Deployment
1. Deploy database changes
2. Deploy backend changes
3. Monitor for errors
4. Verify production orders created correctly

---

## Configuration Options

### Business Settings

Allow businesses to configure:
- Default production steps
- Whether to create materials from sale items
- Whether to rollback sale on production order failure

**Table**: `system_settings`
```sql
INSERT INTO system_settings (business_id, key, value, type)
VALUES 
  (1, 'default_production_steps', '["Dyeing", "Stitching", "Handwork"]', 'json'),
  (1, 'create_materials_from_sale', 'true', 'boolean'),
  (1, 'rollback_sale_on_production_failure', 'false', 'boolean');
```

---

## Summary

### Minimal DB Changes Required

1. ✅ `production_orders.transaction_id` (nullable, foreign key)
2. ✅ `production_orders.location_id` (nullable, foreign key)
3. ✅ `products.requires_production` (boolean, default false)

### Integration Point

- **File**: `backend/src/services/salesService.js`
- **Function**: `createSale()`
- **Location**: After transaction creation, before stock deduction

### Safety Measures

- ✅ Idempotent creation (check for existing)
- ✅ Graceful failure (don't break sale)
- ✅ Business context preserved
- ✅ Backward compatible (nullable columns)
- ✅ Indexed for performance

---

**Last Updated**: January 8, 2026  
**Status**: ✅ Design Complete - Ready for Implementation
