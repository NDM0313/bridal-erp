# Database Schema Documentation
## Final PostgreSQL Schema for Supabase POS System

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Core Business Tables](#core-business-tables)
3. [Product & Inventory Tables](#product--inventory-tables)
4. [Transaction Tables](#transaction-tables)
5. [Critical Business Rules](#critical-business-rules)
6. [Table Relationships](#table-relationships)
7. [Indexes & Performance](#indexes--performance)

---

## OVERVIEW

This schema supports a multi-tenant POS/Business Management System with the following key features:

- **Multi-tenancy**: All tables include `business_id` for data isolation
- **Multi-location**: Stock tracked per location via `variation_location_details`
- **Unit Conversion**: Box/Pieces conversion via `base_unit_id` and `base_unit_multiplier`
- **Dual Pricing**: Retail and Wholesale pricing in `variations` table
- **Stock Management**: All stock stored in base unit (Pieces)

---

## CORE BUSINESS TABLES

### 1. `businesses`
**Purpose**: Root table for multi-tenancy. Each business is a separate tenant.

**Why it exists**: Enables SaaS model where multiple businesses use the same database.

**Key Columns**:
- `id`: Primary key
- `name`: Business name
- `owner_id`: References Supabase Auth `users.id`
- `currency_id`: Business currency
- `accounting_method`: FIFO, LIFO, or AVCO

**Relationships**:
- One business has many: `business_locations`, `contacts`, `products`, `transactions`

---

### 2. `business_locations`
**Purpose**: Physical locations (stores, warehouses) for each business.

**Why it exists**: Businesses operate from multiple locations. Stock must be tracked per location.

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `name`: Location name (e.g., "Main Store", "Warehouse")
- `landmark`, `city`, `state`, `country`: Address fields

**Relationships**:
- Many locations belong to one business
- One location has many stock records (`variation_location_details`)
- One location has many transactions

**Stock Tracking**: Each location has separate stock quantities in `variation_location_details`.

---

### 3. `contacts`
**Purpose**: Unified table for customers and suppliers.

**Why it exists**: Single table simplifies queries. A contact can be both customer and supplier.

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `type`: 'customer', 'supplier', 'both', or 'lead'
- **`customer_type`**: **CRITICAL** - 'retail' or 'wholesale' (determines pricing)
- `name`, `mobile`, `email`: Contact information
- `credit_limit`: Credit limit for customers

**Relationships**:
- Many contacts belong to one business
- One contact has many transactions (as customer or supplier)

**Pricing Logic**: 
- If `customer_type = 'retail'` → Use `variations.retail_price`
- If `customer_type = 'wholesale'` → Use `variations.wholesale_price`

---

## PRODUCT & INVENTORY TABLES

### 4. `units`
**Purpose**: Unit of measurement with base unit conversion logic.

**Why it exists**: Products need to be sold in different units (Pieces, Box). Box is always a sub-unit of Pieces.

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `actual_name`: Full name ("Pieces", "Box", "Kilogram")
- `short_name`: Abbreviation ("Pcs", "Box", "Kg")
- **`base_unit_id`**: **CRITICAL** - If this is a sub-unit, references the base unit (e.g., Box → Pieces)
- **`base_unit_multiplier`**: **CRITICAL** - Conversion factor (e.g., 1 Box = 12 Pieces means multiplier = 12)
- `allow_decimal`: Whether quantity can have decimals

**Example Data**:
```
id=1: actual_name='Pieces', short_name='Pcs', base_unit_id=NULL, base_unit_multiplier=NULL (BASE UNIT)
id=2: actual_name='Box', short_name='Box', base_unit_id=1, base_unit_multiplier=12 (1 Box = 12 Pieces)
```

**Conversion Logic**:
- If `base_unit_id IS NULL` → This is a base unit (Pieces)
- If `base_unit_id IS NOT NULL` → This is a sub-unit (Box)
- To convert Box to Pieces: `qty_in_pieces = qty_in_boxes * base_unit_multiplier`

**Relationships**:
- Self-referencing: `base_unit_id` → `units.id`
- Many units belong to one business

---

### 5. `brands`
**Purpose**: Product brand management.

**Why it exists**: Products are organized by brand for better categorization.

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `name`: Brand name
- `description`: Brand description

**Relationships**:
- Many brands belong to one business
- One brand has many products

---

### 6. `categories`
**Purpose**: Product categorization with hierarchical support.

**Why it exists**: Products need to be organized into categories and sub-categories.

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `name`: Category name
- `parent_id`: Self-reference for hierarchical categories (sub-categories)
- `category_type`: 'product', 'expense', etc.

**Relationships**:
- Self-referencing: `parent_id` → `categories.id` (for sub-categories)
- Many categories belong to one business
- One category has many products

---

### 7. `products`
**Purpose**: Product master data. Products can be 'single' or 'variable'.

**Why it exists**: Core product information. Variations handle different SKUs and pricing.

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `name`: Product name
- `type`: 'single' or 'variable'
- **`unit_id`**: **CRITICAL** - Base unit (ALWAYS Pieces for stock calculations)
- **`secondary_unit_id`**: Optional secondary unit (e.g., Box) for display/sales
- `brand_id`, `category_id`, `sub_category_id`: Relationships
- `sku`: Stock Keeping Unit (unique per business)
- `enable_stock`: Whether to track stock for this product
- `alert_quantity`: Low stock alert threshold (in base unit)

**Relationships**:
- Many products belong to one business
- One product has one base unit (`unit_id`)
- One product can have one secondary unit (`secondary_unit_id`)
- One product has many variations
- One product has many stock records (per location)

**Stock Unit Logic**:
- `unit_id` is ALWAYS the base unit (Pieces)
- `secondary_unit_id` is optional (e.g., Box) - used for display only
- Stock is NEVER stored in secondary unit

---

### 8. `product_variations`
**Purpose**: Variation templates for variable products (e.g., Size, Color).

**Why it exists**: Products can have multiple variations (Size: S/M/L, Color: Red/Blue).

**Key Columns**:
- `id`: Primary key
- `product_id`: Foreign key to `products`
- `name`: Variation name ("Size", "Color", etc.)
- `is_dummy`: true for single products, false for actual variations

**Relationships**:
- Many product_variations belong to one product
- One product_variation has many variations

**Example**:
- Product: "T-Shirt"
- Product Variation: "Size" (is_dummy=false)
- Variations: "Small", "Medium", "Large"

---

### 9. `variations`
**Purpose**: Actual product variations with SKU and pricing (retail/wholesale).

**Why it exists**: Each variation has its own SKU, stock, and pricing. This is where retail_price and wholesale_price are stored.

**Key Columns**:
- `id`: Primary key
- `product_id`: Foreign key to `products`
- `product_variation_id`: Foreign key to `product_variations`
- `name`: Variation value ("Small", "Red", etc.)
- `sub_sku`: SKU for this specific variation
- **`retail_price`**: **CRITICAL** - Price for retail customers (walk-in)
- **`wholesale_price`**: **CRITICAL** - Price for wholesale customers (dealers)
- `default_purchase_price`: Purchase price
- `dpp_inc_tax`: Default purchase price including tax

**Relationships**:
- Many variations belong to one product
- One variation has many stock records (per location in `variation_location_details`)
- One variation has many sale line items (`transaction_sell_lines`)

**Pricing Logic**:
- If `contact.customer_type = 'retail'` → Use `retail_price`
- If `contact.customer_type = 'wholesale'` → Use `wholesale_price`
- Price is denormalized to `transaction.customer_type` for performance

---

### 10. `variation_location_details` ⚠️ **CRITICAL STOCK TABLE**
**Purpose**: Stock quantity per variation per location.

**Why it exists**: Stock must be tracked per location. Each location has separate stock quantities.

**Key Columns**:
- `id`: Primary key
- `variation_id`: Foreign key to `variations`
- `product_id`: Denormalized for performance
- `location_id`: Foreign key to `business_locations`
- **`qty_available`**: **CRITICAL** - Stock quantity **ALWAYS in BASE UNIT (Pieces)**, NEVER in Box

**Relationships**:
- Many stock records belong to one variation (one per location)
- Many stock records belong to one location (one per variation)
- Unique constraint: One stock record per variation per location

**CRITICAL RULE**: 
- `qty_available` is **ALWAYS** stored in **BASE UNIT (Pieces)**
- Never store stock in Box or any other unit
- When selling/purchasing in Box, convert to Pieces before updating

**Stock Update Rules** (Enforced in Application Logic):

1. **Purchasing in Box**:
   ```
   qty_in_pieces = qty_in_boxes * base_unit_multiplier
   qty_available += qty_in_pieces
   ```
   Example: Purchasing 5 Boxes (1 Box = 12 Pieces)
   - `qty_in_pieces = 5 * 12 = 60 Pieces`
   - `qty_available += 60`

2. **Selling in Box**:
   ```
   qty_in_pieces = qty_in_boxes * base_unit_multiplier
   qty_available -= qty_in_pieces
   ```
   Example: Selling 2 Boxes (1 Box = 12 Pieces)
   - `qty_in_pieces = 2 * 12 = 24 Pieces`
   - `qty_available -= 24`

3. **Purchasing in Pieces**:
   ```
   qty_available += qty_in_pieces
   ```

4. **Selling in Pieces**:
   ```
   qty_available -= qty_in_pieces
   ```

---

## TRANSACTION TABLES

### 11. `transactions`
**Purpose**: Sales and purchase transactions (invoices, receipts).

**Why it exists**: Central table for all financial transactions. Links to contacts (customers/suppliers).

**Key Columns**:
- `id`: Primary key
- `business_id`: Foreign key to `businesses`
- `location_id`: Foreign key to `business_locations`
- `type`: 'sell', 'purchase', 'sell_return', 'purchase_return', 'stock_adjustment', etc.
- `status`: 'draft', 'final', 'pending', etc. (Only 'final' transactions affect stock)
- `contact_id`: Foreign key to `contacts` (customer or supplier)
- **`customer_type`**: **CRITICAL** - 'retail' or 'wholesale' (denormalized from contacts for performance)
- `invoice_no`: Auto-generated invoice number
- `transaction_date`: Date of transaction
- `final_total`: Total amount

**Relationships**:
- Many transactions belong to one business
- Many transactions belong to one location
- One transaction has one contact (customer or supplier)
- One transaction has many line items (`transaction_sell_lines`)

**Pricing Logic**:
- `customer_type` is denormalized from `contacts.customer_type` for performance
- Used to determine which price to use: `retail_price` or `wholesale_price`

**Stock Impact**:
- Only transactions with `status = 'final'` affect stock
- Sales decrease stock, purchases increase stock
- Returns reverse the stock change

---

### 12. `transaction_sell_lines`
**Purpose**: Line items for sales transactions. Contains quantity sold and unit used.

**Why it exists**: Each sale can have multiple products. Quantity and unit are stored here.

**Key Columns**:
- `id`: Primary key
- `transaction_id`: Foreign key to `transactions`
- `product_id`: Foreign key to `products`
- `variation_id`: Foreign key to `variations`
- **`quantity`**: **CRITICAL** - Quantity sold (can be in Box or Pieces)
- **`unit_id`**: **CRITICAL** - Unit used for sale (Box or Pieces) - Used for stock conversion
- `unit_price`: Price per unit (retail_price or wholesale_price based on customer_type)
- `line_total`: Total for this line

**Relationships**:
- Many line items belong to one transaction
- One line item has one variation
- One line item has one unit (for conversion)

**Stock Conversion Logic**:
When a sale is finalized (`status = 'final'`):

1. For each `transaction_sell_lines` row:
   - Get unit from `unit_id`
   - If `unit.base_unit_id IS NOT NULL` (it's a Box):
     - Convert to Pieces: `qty_in_pieces = quantity * unit.base_unit_multiplier`
   - If `unit.base_unit_id IS NULL` (it's Pieces):
     - Use quantity as-is: `qty_in_pieces = quantity`
   - Update `variation_location_details`:
     - `qty_available -= qty_in_pieces`

**Example**:
- Selling 2 Boxes (1 Box = 12 Pieces)
- `qty_in_pieces = 2 * 12 = 24 Pieces`
- `qty_available -= 24`

---

## CRITICAL BUSINESS RULES

### 1. Stock Storage Rule ⚠️
**Rule**: `qty_available` in `variation_location_details` is **ALWAYS** in **BASE UNIT (Pieces)**.

**Enforcement**: Application logic must convert all quantities to Pieces before updating stock.

**Why**: Consistency. All stock calculations use the same unit, preventing errors.

---

### 2. Unit Conversion Rule ⚠️
**Rule**: When selling/purchasing in Box, convert to Pieces using `base_unit_multiplier`.

**Formula**: 
```
qty_in_pieces = qty_in_boxes * base_unit_multiplier
```

**Example**: 
- 1 Box = 12 Pieces (`base_unit_multiplier = 12`)
- Selling 2 Boxes = 24 Pieces deducted from stock

**Enforcement**: Application logic must perform conversion before stock update.

---

### 3. Pricing Rule ⚠️
**Rule**: Use `retail_price` or `wholesale_price` based on `contact.customer_type`.

- If `customer_type = 'retail'` → Use `variations.retail_price`
- If `customer_type = 'wholesale'` → Use `variations.wholesale_price`

**Enforcement**: Application logic selects correct price based on customer type.

---

### 4. Stock Update Rule ⚠️
**Rule**: Only transactions with `status = 'final'` affect stock.

**Enforcement**: Application logic checks transaction status before updating stock.

**Stock Changes**:
- Sales (`type = 'sell'`) → Decrease stock
- Purchases (`type = 'purchase'`) → Increase stock
- Returns → Reverse the stock change

---

### 5. Multi-Location Rule
**Rule**: Each location has separate stock quantities.

**Enforcement**: Stock is tracked per location in `variation_location_details`.

**Stock Transfers**: Move stock between locations via `type = 'sell_transfer'` or `type = 'purchase_transfer'`.

---

## TABLE RELATIONSHIPS

### Business Hierarchy
```
businesses (1) ──< (many) business_locations
businesses (1) ──< (many) contacts
businesses (1) ──< (many) products
businesses (1) ──< (many) units
businesses (1) ──< (many) brands
businesses (1) ──< (many) categories
businesses (1) ──< (many) transactions
```

### Product Hierarchy
```
products (1) ──< (many) product_variations
product_variations (1) ──< (many) variations
variations (1) ──< (many) variation_location_details (stock per location)
```

### Unit Conversion
```
units (1) ──< (many) units (via base_unit_id) - Self-referencing for Box/Pieces
```

### Transaction Flow
```
transactions (1) ──< (many) transaction_sell_lines
transaction_sell_lines (many) ──> (1) variations
transaction_sell_lines (many) ──> (1) units (for conversion)
```

### Stock Tracking
```
variation_location_details links:
  - variations (many) ──> (1) variation
  - business_locations (many) ──> (1) location
```

---

## INDEXES & PERFORMANCE

### Primary Indexes
- All tables have `id` as PRIMARY KEY
- All foreign keys are indexed

### Composite Indexes
- `idx_products_business_type`: For filtering products by business and type
- `idx_vld_variation_location`: For fast stock lookups
- `idx_transactions_business_location_type`: For common transaction queries

### Query Optimization
- Denormalized `product_id` and `product_variation_id` in `variation_location_details` to avoid JOINs
- Denormalized `customer_type` in `transactions` for faster price selection

---

## SUMMARY

This schema supports:
- ✅ Multi-tenancy (business_id in all tables)
- ✅ Multi-location stock tracking
- ✅ Box/Pieces conversion (base_unit_id + base_unit_multiplier)
- ✅ Dual pricing (retail_price + wholesale_price)
- ✅ Stock always in base unit (Pieces)
- ✅ Efficient queries (proper indexes)

**Next Steps**: Implement application logic to enforce stock conversion rules and pricing logic.

---

**STEP 1 DATABASE DESIGN COMPLETE**

