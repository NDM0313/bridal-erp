-- Check Production Data for Debugging
-- Run these queries in Supabase SQL Editor to diagnose why studio sales aren't showing

-- 1. Check if any products have requires_production flag
SELECT 
  id,
  name,
  sku,
  requires_production
FROM products
WHERE requires_production = true
LIMIT 10;

-- Expected: Should return at least 1 product
-- If empty: No products marked for production!

---

-- 2. Check recent sales (transactions)
SELECT 
  id,
  invoice_no,
  transaction_date,
  status,
  type,
  contact_id
FROM transactions
WHERE type = 'sell'
  AND status = 'final'
  AND deleted_at IS NULL
ORDER BY transaction_date DESC
LIMIT 10;

-- Expected: Should show recent sales
-- If empty: No sales exist!

---

-- 3. Check which sales have production products
SELECT 
  t.id as transaction_id,
  t.invoice_no,
  t.transaction_date,
  tsl.product_id,
  p.name as product_name,
  p.requires_production
FROM transactions t
JOIN transaction_sell_lines tsl ON t.id = tsl.transaction_id
JOIN products p ON tsl.product_id = p.id
WHERE t.type = 'sell'
  AND t.status = 'final'
  AND t.deleted_at IS NULL
  AND p.requires_production = true
ORDER BY t.transaction_date DESC
LIMIT 10;

-- Expected: Should show sales with production products
-- If empty: No sales contain production products!

---

-- 4. Check existing production orders
SELECT 
  id,
  order_no,
  transaction_id,
  status,
  created_at
FROM production_orders
ORDER BY created_at DESC
LIMIT 10;

-- Expected: May be empty if no production orders created yet
-- Shows which sales already have production orders

---

-- 5. Find sales that SHOULD appear in "Setup Required"
-- (Sales with production products but no production order yet)
SELECT 
  t.id as transaction_id,
  t.invoice_no,
  t.transaction_date,
  COUNT(DISTINCT tsl.product_id) as product_count,
  COUNT(DISTINCT CASE WHEN p.requires_production = true THEN tsl.product_id END) as production_products,
  po.id as existing_production_order
FROM transactions t
JOIN transaction_sell_lines tsl ON t.id = tsl.transaction_id
JOIN products p ON tsl.product_id = p.id
LEFT JOIN production_orders po ON t.id = po.transaction_id
WHERE t.type = 'sell'
  AND t.status = 'final'
  AND t.deleted_at IS NULL
GROUP BY t.id, t.invoice_no, t.transaction_date, po.id
HAVING COUNT(DISTINCT CASE WHEN p.requires_production = true THEN tsl.product_id END) > 0
  AND po.id IS NULL
ORDER BY t.transaction_date DESC
LIMIT 10;

-- Expected: Sales that should show in "Setup Required" column
-- If empty: Either all sales have production orders, or no production products in any sale

---

-- 6. Quick fix: Mark some products for production testing
-- UNCOMMENT AND RUN ONLY IF YOU WANT TO TEST
/*
UPDATE products
SET requires_production = true
WHERE id IN (
  SELECT id FROM products 
  WHERE business_id = YOUR_BUSINESS_ID_HERE
  LIMIT 3
);
*/

-- Replace YOUR_BUSINESS_ID_HERE with your actual business_id
-- This will mark 3 products as requiring production
