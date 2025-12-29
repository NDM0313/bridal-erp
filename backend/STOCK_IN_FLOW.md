# Stock IN Flow Documentation
## How Purchases Increase Stock

## 📊 Overview

When a purchase is finalized, stock is **INCREASED** in the `variation_location_details` table. All quantities are converted to **BASE UNIT (Pieces)** before updating stock.

---

## 🔄 Complete Flow

### Step 1: Create Purchase Transaction

**Request:**
```json
{
  "locationId": 1,
  "contactId": 10,
  "items": [
    {
      "variationId": 10,
      "quantity": 5,
      "unitId": 3,
      "purchasePrice": 720.00
    }
  ],
  "status": "final"
}
```

**What Happens:**
1. Transaction created with `type = 'purchase'`
2. Purchase lines created in `purchase_lines` table
3. If `status = 'final'`, proceed to stock increase

---

### Step 2: Unit Conversion

**For each purchase line item:**

```javascript
// Get unit information
const unit = {
  id: 3,
  actual_name: "Box",
  base_unit_id: 1,           // References Pieces
  base_unit_multiplier: 12   // 1 Box = 12 Pieces
};

// Get base unit
const baseUnit = {
  id: 1,
  actual_name: "Pieces"
};

// Convert to Pieces
const quantityInPieces = convertToBaseUnit(
  5,        // quantity in Box
  unit,     // Box unit
  baseUnit  // Pieces unit
);

// Result: 5 × 12 = 60 Pieces
```

---

### Step 3: Stock Increase

**Update variation_location_details:**

```sql
-- Current stock: 172 Pieces
-- Purchased: 60 Pieces (from 5 Boxes)
-- New stock: 172 + 60 = 232 Pieces

UPDATE variation_location_details
SET qty_available = qty_available + 60
WHERE variation_id = 10
  AND location_id = 1;
```

**If stock record doesn't exist:**
```sql
INSERT INTO variation_location_details (
  variation_id,
  product_id,
  product_variation_id,
  location_id,
  qty_available
) VALUES (10, 1, 1, 1, 60);
```

---

## 📝 Example Scenarios

### Scenario 1: Purchase in Pieces

**Input:**
- Quantity: 100
- Unit: Pieces (id: 1)
- Current Stock: 72 Pieces

**Process:**
1. No conversion needed (already in Pieces)
2. Stock increased: 72 + 100 = 172 Pieces

**Result:**
```json
{
  "quantityPurchased": 100,
  "unit": "Pieces",
  "quantityInPieces": 100,
  "newStock": 172
}
```

---

### Scenario 2: Purchase in Box

**Input:**
- Quantity: 5
- Unit: Box (id: 3, multiplier: 12)
- Current Stock: 172 Pieces

**Process:**
1. Convert: 5 × 12 = 60 Pieces
2. Stock increased: 172 + 60 = 232 Pieces

**Result:**
```json
{
  "quantityPurchased": 5,
  "unit": "Box",
  "quantityInPieces": 60,
  "newStock": 232
}
```

---

### Scenario 3: Mixed Units Purchase

**Input:**
- Item 1: 2 Boxes
- Item 2: 24 Pieces
- Current Stock: 232 Pieces

**Process:**
1. Item 1: 2 × 12 = 24 Pieces
2. Item 2: 24 Pieces
3. Total: 24 + 24 = 48 Pieces
4. Stock increased: 232 + 48 = 280 Pieces

**Result:**
```json
{
  "stockUpdates": [
    {
      "quantityPurchased": 2,
      "unit": "Box",
      "quantityInPieces": 24
    },
    {
      "quantityPurchased": 24,
      "unit": "Pieces",
      "quantityInPieces": 24
    }
  ],
  "totalAdded": 48,
  "newStock": 280
}
```

---

## 🔒 Business Rules

### Rule 1: Stock Always in Pieces
- ✅ All stock stored in `qty_available` (base unit)
- ✅ Never store stock in Box or other units
- ✅ Conversion happens before stock update

### Rule 2: Final Transactions Only
- ✅ Only `status = 'final'` purchases increase stock
- ✅ Draft purchases don't affect stock
- ✅ Can complete draft later

### Rule 3: No Validation
- ✅ Can purchase any quantity
- ✅ No stock availability check needed
- ✅ Stock can go to any positive value

### Rule 4: Unit Conversion
- ✅ Box quantities converted to Pieces
- ✅ Uses `base_unit_multiplier` from units table
- ✅ Conversion formula: `qty_in_pieces = qty_in_boxes × multiplier`

---

## 🔄 Comparison: Stock IN vs Stock OUT

| Aspect | Stock IN (Purchases) | Stock OUT (Sales) |
|--------|---------------------|-------------------|
| **Operation** | Increase (`+=`) | Decrease (`-=`) |
| **Validation** | None needed | Check availability |
| **Error** | None | Insufficient stock error |
| **Transaction Type** | `purchase` | `sell` |
| **Line Table** | `purchase_lines` | `transaction_sell_lines` |
| **Status Check** | `status = 'final'` | `status = 'final'` |

---

## 💻 Code Flow

```javascript
// 1. Create purchase
const purchase = await createPurchase(data, businessId, userId);

// 2. If status = 'final', increase stock
if (status === 'final') {
  // 3. For each item, convert to Pieces
  const quantityInPieces = convertToBaseUnit(
    item.quantity,
    item.unit,
    baseUnit
  );
  
  // 4. Increase stock
  await increaseStock(
    item.variationId,
    locationId,
    quantityInPieces
  );
}
```

---

## ✅ Verification

After a purchase, verify stock:

```sql
-- Check stock for variation
SELECT 
  vld.variation_id,
  vld.location_id,
  vld.qty_available,
  v.name as variation_name,
  l.name as location_name
FROM variation_location_details vld
JOIN variations v ON v.id = vld.variation_id
JOIN business_locations l ON l.id = vld.location_id
WHERE vld.variation_id = 10
  AND vld.location_id = 1;
```

---

## 🎯 Key Takeaways

1. **Stock INCREASES** with purchases (opposite of sales)
2. **Conversion is Automatic** - Box → Pieces before update
3. **No Validation** - Can purchase any quantity
4. **Final Only** - Draft purchases don't affect stock
5. **Always in Pieces** - Stock stored in base unit

---

**Stock IN flow is complete and working!** ✅

