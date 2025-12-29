# Database Schema Quick Reference

## 📊 Tables Overview

| Table | Purpose | Key Feature |
|-------|---------|-------------|
| `businesses` | Multi-tenancy root | Each business is a separate tenant |
| `business_locations` | Physical locations | Stock tracked per location |
| `contacts` | Customers & Suppliers | `customer_type` determines pricing |
| `units` | Unit of measurement | Box/Pieces conversion via `base_unit_multiplier` |
| `products` | Product master data | `unit_id` = base unit (Pieces) |
| `variations` | Product variations | Contains `retail_price` and `wholesale_price` |
| `variation_location_details` | **STOCK TABLE** | `qty_available` ALWAYS in Pieces |
| `transactions` | Sales/Purchase transactions | `customer_type` determines price |
| `transaction_sell_lines` | Sale line items | `unit_id` for Box/Pieces conversion |

---

## ⚠️ CRITICAL RULES

### 1. Stock Storage
- **Rule**: `qty_available` is **ALWAYS** in **BASE UNIT (Pieces)**
- **Never** store stock in Box or any other unit

### 2. Unit Conversion
- **Formula**: `qty_in_pieces = qty_in_boxes * base_unit_multiplier`
- **Example**: 1 Box = 12 Pieces, selling 2 Boxes = 24 Pieces deducted

### 3. Pricing
- **Retail**: `contact.customer_type = 'retail'` → Use `variations.retail_price`
- **Wholesale**: `contact.customer_type = 'wholesale'` → Use `variations.wholesale_price`

### 4. Stock Updates
- Only `status = 'final'` transactions affect stock
- Sales decrease stock, purchases increase stock

---

## 🔑 Key Columns

### Units Table
- `base_unit_id`: References base unit (NULL for Pieces)
- `base_unit_multiplier`: Conversion factor (e.g., 12 for Box → Pieces)

### Variations Table
- `retail_price`: Price for retail customers
- `wholesale_price`: Price for wholesale customers

### Variation Location Details (Stock)
- `qty_available`: **ALWAYS in Pieces** (base unit)

### Transaction Sell Lines
- `quantity`: Quantity sold (can be Box or Pieces)
- `unit_id`: Unit used (for conversion to Pieces)

---

## 📝 Example Data

### Units
```sql
-- Base unit
INSERT INTO units (id, actual_name, short_name, base_unit_id, base_unit_multiplier)
VALUES (1, 'Pieces', 'Pcs', NULL, NULL);

-- Sub-unit (Box)
INSERT INTO units (id, actual_name, short_name, base_unit_id, base_unit_multiplier)
VALUES (2, 'Box', 'Box', 1, 12);  -- 1 Box = 12 Pieces
```

### Stock Update Example
```sql
-- Selling 2 Boxes (1 Box = 12 Pieces)
-- Step 1: Get unit multiplier
SELECT base_unit_multiplier FROM units WHERE id = 2;  -- Returns 12

-- Step 2: Convert to Pieces
-- qty_in_pieces = 2 * 12 = 24

-- Step 3: Update stock
UPDATE variation_location_details
SET qty_available = qty_available - 24
WHERE variation_id = 10 AND location_id = 1;
```

---

## 🔗 Key Relationships

```
businesses → business_locations (1:many)
businesses → products (1:many)
products → variations (1:many)
variations → variation_location_details (1:many per location)
transactions → transaction_sell_lines (1:many)
transaction_sell_lines → variations (many:1)
transaction_sell_lines → units (many:1)
```

---

## 📁 Files

- `FINAL_SCHEMA.sql` - Complete SQL schema
- `SCHEMA_DOCUMENTATION.md` - Detailed documentation
- `QUICK_REFERENCE.md` - This file

---

**Ready for Step 2: API Implementation**

