# Test: Automatic Production Order Creation from Sale

## Status: Ready for Testing

**Date**: January 8, 2026  
**Test Type**: Integration Test  
**Requires**: Backend API running

---

## Test Overview

This test verifies that when a sale is created with `status = 'final'` and contains products with `requires_production = true`, a production order is automatically created.

---

## Prerequisites

1. ✅ Backend server running
2. ✅ Database migration applied (`ADD_SALE_PRODUCTION_LINK.sql`)
3. ✅ Test products configured (`requires_production = true`)
   - Product ID 169: T-Shirt Cotton Premium
   - Product ID 170: Jeans Denim Blue

---

## Test Data

- **Business ID**: 1 (Studio Rently POS)
- **Location ID**: 9 (test)
- **User ID**: `10cb8bd6-887c-4fb4-9eeb-6a8f829fce26`
- **Variation ID**: 138 (T-Shirt Cotton Premium, product_id: 169)
- **Unit ID**: 24 (Piece)
- **Quantity**: 2

---

## Test Steps

### Option 1: Run Test Script (Recommended)

```bash
cd backend
node test-production-order-creation.js
```

**Expected Output**:
```
🧪 Testing Automatic Production Order Creation from Sale

Test Configuration:
  Business ID: 1
  Location ID: 9
  Variation ID: 138 (T-Shirt Cotton Premium)
  Quantity: 2

📝 Step 1: Creating test sale...
✅ Sale created successfully!
   Sale ID: [ID]
   Invoice No: [INVOICE_NO]

⏳ Waiting for production order creation...

🔍 Step 2: Verifying production order creation...
✅ Production order created successfully!
   Production Order ID: [ID]
   Order No: PO-[INVOICE_NO]
   Transaction ID: [SALE_ID]
   Business ID: 1
   Location ID: 9
   Status: new

🔍 Step 3: Verifying production order fields...
   ✅ transaction_id: [SALE_ID] (expected: [SALE_ID])
   ✅ order_no: PO-[INVOICE_NO] (expected: PO-[INVOICE_NO])
   ✅ business_id: 1 (expected: 1)
   ✅ location_id: 9 (expected: 9)

✅ All field verifications passed!

🔍 Step 4: Verifying production steps...
✅ Production steps created: 3
   1. Dyeing (Status: pending)
   2. Handwork (Status: pending)
   3. Stitching (Status: pending)

🔍 Step 5: Verifying production materials...
✅ Production materials created: 1
   1. Product ID: 169, Quantity: 2

============================================================
📊 TEST SUMMARY
============================================================
✅ Sale ID: [SALE_ID]
✅ Invoice No: [INVOICE_NO]
✅ Production Order ID: [PO_ID]
✅ Order No: PO-[INVOICE_NO]
✅ Production Steps: 3
✅ Production Materials: 1
============================================================

✅ TEST PASSED: Automatic production order creation is working!
```

### Option 2: Manual Test via API

**Endpoint**: `POST /api/sales` (or your sales creation endpoint)

**Request Body**:
```json
{
  "locationId": 9,
  "customerType": "retail",
  "items": [
    {
      "variationId": 138,
      "unitId": 24,
      "quantity": 2
    }
  ],
  "paymentMethod": "cash",
  "status": "final"
}
```

**Expected Response**:
- Sale created successfully
- Production order automatically created

---

## SQL Verification Queries

After running the test, use these queries to verify:

### 1. Verify Sale Created

```sql
SELECT 
    t.id as sale_id,
    t.invoice_no,
    t.status,
    t.business_id,
    t.location_id,
    t.final_total,
    t.transaction_date
FROM transactions t
WHERE t.type = 'sell'
  AND t.status = 'final'
  AND t.business_id = 1
ORDER BY t.created_at DESC
LIMIT 1;
```

### 2. Verify Production Order Created

```sql
SELECT 
    po.id as production_order_id,
    po.order_no,
    po.transaction_id as sale_id,
    po.business_id,
    po.location_id,
    po.status,
    po.final_price,
    t.invoice_no as sale_invoice_no
FROM production_orders po
INNER JOIN transactions t ON po.transaction_id = t.id
WHERE po.transaction_id = :sale_id  -- Replace with actual sale_id
  AND po.business_id = 1;
```

### 3. Verify Production Order Fields

```sql
-- Check all fields match expectations
SELECT 
    po.id,
    po.order_no,
    po.transaction_id,
    po.business_id,
    po.location_id,
    po.status,
    po.final_price,
    po.description,
    t.invoice_no,
    CASE 
        WHEN po.transaction_id = t.id THEN '✅'
        ELSE '❌'
    END as transaction_id_match,
    CASE 
        WHEN po.order_no = 'PO-' || t.invoice_no THEN '✅'
        ELSE '❌'
    END as order_no_match,
    CASE 
        WHEN po.business_id = t.business_id THEN '✅'
        ELSE '❌'
    END as business_id_match,
    CASE 
        WHEN po.location_id = t.location_id THEN '✅'
        ELSE '❌'
    END as location_id_match
FROM production_orders po
INNER JOIN transactions t ON po.transaction_id = t.id
WHERE po.transaction_id = :sale_id;  -- Replace with actual sale_id
```

### 4. Verify Production Steps Created

```sql
SELECT 
    ps.id,
    ps.production_order_id,
    ps.step_name,
    ps.status,
    ps.step_qty,
    ps.completed_qty,
    ps.cost
FROM production_steps ps
WHERE ps.production_order_id = :production_order_id  -- Replace with actual PO ID
ORDER BY ps.id;
```

**Expected**: 3 steps (Dyeing, Handwork, Stitching) with `status = 'pending'`

### 5. Verify Production Materials Created

```sql
SELECT 
    pm.id,
    pm.production_order_id,
    pm.product_id,
    pm.variation_id,
    pm.quantity_used,
    pm.unit_id,
    pm.unit_cost,
    pm.total_cost,
    p.name as product_name
FROM production_materials pm
INNER JOIN products p ON pm.product_id = p.id
WHERE pm.production_order_id = :production_order_id;  -- Replace with actual PO ID
```

**Expected**: Materials linked to sale items

---

## Expected Results

### ✅ Sale Creation
- Sale transaction created with `status = 'final'`
- Transaction sell lines created
- Invoice number generated

### ✅ Production Order Creation
- Production order automatically created
- `transaction_id` = Sale ID
- `order_no` = `PO-{invoice_no}`
- `business_id` = Sale business_id
- `location_id` = Sale location_id
- `status` = `'new'`

### ✅ Production Steps
- 3 default steps created:
  - Dyeing (status: pending)
  - Handwork (status: pending)
  - Stitching (status: pending)

### ✅ Production Materials
- Materials linked to sale items
- Product IDs match
- Quantities match

---

## Troubleshooting

### Production Order Not Created

**Possible Causes**:
1. Product doesn't have `requires_production = true`
   - **Fix**: Check product flag: `SELECT id, name, requires_production FROM products WHERE id = 169;`
2. Sale status is not `'final'`
   - **Fix**: Ensure `status = 'final'` in sale creation
3. Backend integration not working
   - **Fix**: Check backend logs for errors
4. Database migration not applied
   - **Fix**: Run `ADD_SALE_PRODUCTION_LINK.sql` migration

### Production Order Fields Don't Match

**Check**:
- `transaction_id` should equal sale ID
- `order_no` should be `PO-{invoice_no}`
- `business_id` and `location_id` should match sale

### Production Steps Not Created

**Check**:
- Production order was created successfully
- Check backend logs for step creation errors
- Verify `production_steps` table structure

---

## Test Output Format

After successful test, output should include:

```
Sale ID: [ID]
Production Order ID: [ID]
Order No: PO-[INVOICE_NO]
```

---

## Files

- **Test Script**: `backend/test-production-order-creation.js`
- **Documentation**: `backend/TEST_PRODUCTION_ORDER_CREATION.md`

---

**Last Updated**: January 8, 2026  
**Status**: Ready for Testing
