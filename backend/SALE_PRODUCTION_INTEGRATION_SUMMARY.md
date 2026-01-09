# Sale to Production Integration - Quick Summary

## Integration Flow

```
Sale Created (status = 'final')
    ↓
Check: product.requires_production = true?
    ↓ YES
Create production_order
    ├─ Link: transaction_id = sale.id
    ├─ Link: location_id = sale.location_id
    ├─ Link: customer_id = sale.contact_id
    └─ Order No: PO-{invoice_no}
    ↓
Create production_steps (default: Dyeing, Stitching, Handwork)
    ↓
Create production_materials (from sale items)
    ↓
Continue with stock deduction (existing flow)
```

---

## Step-by-Step Backend Logic

### 1. Insertion Point

**File**: `backend/src/services/salesService.js`  
**Function**: `createSale()`  
**Location**: After line 208 (after transaction and sell lines created, before stock deduction)

### 2. Logic Flow

```javascript
// After transaction and sell lines created
// Before stock deduction (around line 208)

// [NEW] Check if production order needed
if (status === 'final') {
  try {
    // Check if any products require production
    const productIds = createdLines.map(line => line.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, requires_production')
      .in('id', productIds)
      .eq('business_id', businessId);
    
    const needsProduction = products.some(p => p.requires_production === true);
    
    if (needsProduction) {
      // Create production order
      const productionOrder = await createProductionOrderFromSale(
        transaction,
        createdLines,
        businessId,
        locationId,
        userId
      );
      
      // Log success (optional)
      console.log('Production order created:', productionOrder.id);
    }
  } catch (productionError) {
    // Log error but don't fail sale
    console.error('Failed to create production order:', productionError);
    // Sale continues successfully
  }
}

// Continue with existing stock deduction logic...
```

### 3. Function: `createProductionOrderFromSale()`

**Location**: `backend/src/services/productionService.js`

**Steps**:
1. Check if order already exists (idempotency)
2. Generate order number: `PO-{invoice_no}`
3. Create production_order with:
   - `business_id` from sale
   - `location_id` from sale
   - `customer_id` from sale
   - `transaction_id` = sale.id
   - `order_no` = `PO-{invoice_no}`
   - `status` = 'new'
   - `final_price` = sale.final_total
4. Create default production_steps (Dyeing, Stitching, Handwork)
5. Create production_materials from sale items
6. Return production order

---

## Required DB Changes

### 1. `production_orders.transaction_id`
- Type: INTEGER, nullable
- Foreign key to `transactions(id)`
- Purpose: Link production order to sale

### 2. `production_orders.location_id`
- Type: INTEGER, nullable
- Foreign key to `business_locations(id)`
- Purpose: Track branch/location

### 3. `products.requires_production`
- Type: BOOLEAN, default false
- Purpose: Flag products that need production orders

**SQL Script**: `database/ADD_SALE_PRODUCTION_LINK.sql`

---

## Risks to Avoid

### 1. Double Creation
- **Risk**: Production order created twice for same sale
- **Mitigation**: Check for existing order with `transaction_id` before creating

### 2. Sale Rollback
- **Risk**: Production order fails, should sale be rolled back?
- **Mitigation**: Don't rollback sale (production order is secondary). Log error.

### 3. Performance Impact
- **Risk**: Additional DB operations slow down sale
- **Mitigation**: Use indexes, make async if needed

### 4. Data Integrity
- **Risk**: Missing business/location context
- **Mitigation**: Always use `business_id` and `location_id` from sale

### 5. Draft Sales
- **Risk**: Production order created for draft sales
- **Mitigation**: Only create when `status === 'final'`

---

## Implementation Checklist

- [ ] Run `ADD_SALE_PRODUCTION_LINK.sql` migration
- [ ] Add `createProductionOrderFromSale()` to `productionService.js`
- [ ] Integrate into `createSale()` function
- [ ] Add error handling and logging
- [ ] Test with production products
- [ ] Test with non-production products
- [ ] Test failure scenarios
- [ ] Verify idempotency

---

**Status**: ✅ Design Complete - Ready for Implementation
