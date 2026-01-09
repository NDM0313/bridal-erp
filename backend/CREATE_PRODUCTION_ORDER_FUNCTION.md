# `createProductionOrderFromSale()` Function Implementation

## Status: ✅ ALREADY IMPLEMENTED

**File**: `backend/src/services/productionService.js`  
**Lines**: 410-539  
**Status**: Complete and Verified

---

## Function Code

```javascript
/**
 * Create production order from sale transaction
 * Auto-creates production order when sale contains products with requires_production = true
 * 
 * @param {object} transaction - Sale transaction
 * @param {array} saleItems - Transaction sell lines
 * @param {number} businessId - Business ID
 * @param {number} locationId - Location ID (branch)
 * @param {string} userId - User ID (created_by)
 * @returns {Promise<object|null>} Created production order or null if not needed
 */
export async function createProductionOrderFromSale(transaction, saleItems, businessId, locationId, userId) {
  // Step 1: Check if any products require production
  const productIds = saleItems.map(item => item.product_id);
  
  if (productIds.length === 0) {
    return null; // No products, no production order needed
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, requires_production')
    .in('id', productIds)
    .eq('business_id', businessId);
  
  if (productsError) {
    throw new Error(`Failed to check products: ${productsError.message}`);
  }
  
  const needsProduction = products && products.some(p => p.requires_production === true);
  
  if (!needsProduction) {
    return null; // No production order needed
  }
  
  // Step 2: Check if order already exists (idempotency)
  const { data: existing, error: existingError } = await supabase
    .from('production_orders')
    .select('id, order_no, status')
    .eq('business_id', businessId)
    .eq('transaction_id', transaction.id)
    .single();
  
  if (existingError && existingError.code !== 'PGRST116') {
    // PGRST116 = not found (expected), other errors are real issues
    throw new Error(`Failed to check existing order: ${existingError.message}`);
  }
  
  if (existing) {
    // Already created, return existing (idempotent)
    return existing;
  }
  
  // Step 3: Generate order number
  const orderNo = `PO-${transaction.invoice_no}`;
  
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
      location_id: locationId,
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
    { stepName: 'Handwork', cost: 0 },
    { stepName: 'Stitching', cost: 0 },
  ];
  
  const stepInserts = defaultSteps.map(step => ({
    production_order_id: productionOrder.id,
    step_name: step.stepName,
    cost: step.cost,
    status: 'pending',
    step_qty: null, // Will be set later
    completed_qty: 0,
  }));
  
  const { error: stepsError } = await supabase
    .from('production_steps')
    .insert(stepInserts);
  
  if (stepsError) {
    // Rollback production order if steps fail
    await supabase.from('production_orders').delete().eq('id', productionOrder.id);
    throw new Error(`Failed to create production steps: ${stepsError.message}`);
  }
  
  // Step 6: Create production materials (optional - link to sale items)
  const materialInserts = saleItems
    .filter(item => item.product_id) // Only items with product_id
    .map(item => ({
      production_order_id: productionOrder.id,
      product_id: item.product_id,
      variation_id: item.variation_id || null,
      quantity_used: item.quantity,
      unit_id: item.unit_id,
      unit_cost: item.unit_price || 0,
      total_cost: (item.quantity || 0) * (item.unit_price || 0),
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

---

## Implementation Details

### ✅ 1. Check `products.requires_production`
- **Lines**: 422-443
- Fetches all products from sale items
- Checks if any product has `requires_production = true`
- Returns `null` if no production needed

### ✅ 2. Generate `order_no = PO-{invoice_no}`
- **Line**: 464
- Format: `PO-{transaction.invoice_no}`
- Example: `PO-INV-202601-0001`

### ✅ 3. Create `production_order`
- **Lines**: 466-486
- Links to sale via `transaction_id`
- Preserves `business_id` and `location_id` context
- Sets `customer_id` from sale contact
- Sets `final_price` from sale total

### ✅ 4. Create Default Production Steps
- **Lines**: 488-512
- Creates 3 steps: **Dyeing**, **Handwork**, **Stitching**
- All steps start with `status = 'pending'`
- Sets `step_qty = null` and `completed_qty = 0`
- Rolls back production order if steps fail

### ✅ 5. Optional Production Materials
- **Lines**: 514-536
- Links materials to sale items
- Maps `product_id`, `variation_id`, `quantity`, `unit_id`
- Calculates `unit_cost` and `total_cost` from sale prices
- **Non-blocking**: Errors don't rollback order (materials are optional)

### ✅ 6. Idempotency
- **Lines**: 445-461
- Checks for existing production order by `transaction_id`
- Returns existing order if found (prevents duplicates)
- Safe to call multiple times

### ✅ 7. Business & Location Context
- **Lines**: 470, 478
- Always uses `business_id` from parameters
- Always uses `location_id` from parameters
- Ensures data isolation and branch tracking

### ✅ 8. No Manual Creation
- **Enforcement**: Function is only called from `salesService.js`
- No public API endpoint exposes this function
- Production orders can only be created via sales

---

## Function Flow

```
createProductionOrderFromSale()
    ↓
1. Extract product IDs from sale items
    ↓
2. Check products.requires_production = true?
    ↓ NO → return null
    ↓ YES
3. Check existing production_order by transaction_id?
    ↓ YES → return existing (idempotent)
    ↓ NO
4. Generate order_no = PO-{invoice_no}
    ↓
5. Create production_order
    ├─ business_id
    ├─ location_id
    ├─ transaction_id
    ├─ customer_id
    └─ order_no
    ↓
6. Create production_steps (Dyeing, Handwork, Stitching)
    ├─ status = 'pending'
    ├─ step_qty = null
    └─ completed_qty = 0
    ↓
7. Create production_materials (optional)
    ├─ product_id
    ├─ variation_id
    ├─ quantity_used
    └─ unit_cost
    ↓
8. Return production_order
```

---

## Error Handling

### Product Check Failure
- **Action**: Throws error
- **Impact**: Prevents production order creation

### Existing Order Check Failure
- **Action**: Throws error (if not PGRST116 = not found)
- **Impact**: Prevents duplicate creation

### Production Order Creation Failure
- **Action**: Throws error
- **Impact**: No order created

### Production Steps Creation Failure
- **Action**: Rolls back production order, throws error
- **Impact**: Ensures data consistency (no orphaned orders)

### Production Materials Creation Failure
- **Action**: Logs error, continues
- **Impact**: Non-blocking (materials are optional)

---

## Usage Example

```javascript
// Called from salesService.js
const productionOrder = await createProductionOrderFromSale(
  transaction,        // Sale transaction object
  createdLines,       // Transaction sell lines array
  businessId,         // Business ID
  locationId,         // Location ID (branch)
  userId              // User ID (created_by)
);

if (productionOrder) {
  console.log(`Production order created: ${productionOrder.order_no}`);
} else {
  console.log('No production order needed');
}
```

---

## Verification Checklist

- [x] ✅ Checks `products.requires_production`
- [x] ✅ Generates `order_no = PO-{invoice_no}`
- [x] ✅ Creates `production_order` with all required fields
- [x] ✅ Creates default production steps (Dyeing, Handwork, Stitching)
- [x] ✅ Creates optional production materials
- [x] ✅ Enforces idempotency (prevents duplicates)
- [x] ✅ Preserves business & location context
- [x] ✅ No manual creation allowed (only via sales)
- [x] ✅ Proper error handling
- [x] ✅ Rollback on critical failures

---

## Summary

**Status**: ✅ **FULLY IMPLEMENTED**

The function is complete and matches all requirements:
- ✅ Product filtering by `requires_production`
- ✅ Order number generation (`PO-{invoice_no}`)
- ✅ Production order creation with proper context
- ✅ Default production steps (Dyeing, Handwork, Stitching)
- ✅ Optional production materials linking
- ✅ Idempotent design (prevents duplicates)
- ✅ Business and location context preserved
- ✅ No manual creation (only via sales)

**Ready for**: Production Use

---

**Last Updated**: January 8, 2026  
**Status**: ✅ Complete
