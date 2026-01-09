-- ============================================
-- VERIFY DEFAULT PRODUCTION STEPS
-- For Production Orders Created from Sales
-- ============================================

-- Query 1: Fetch production steps for a production order
-- Replace :production_order_id with actual production order ID
SELECT 
    ps.id,
    ps.production_order_id,
    ps.step_name,
    ps.status,
    ps.step_qty,
    ps.completed_qty,
    ps.cost,
    ps.started_at,
    ps.completed_at,
    po.order_no,
    po.transaction_id,
    t.invoice_no as sale_invoice_no
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
LEFT JOIN transactions t ON po.transaction_id = t.id
WHERE ps.production_order_id = :production_order_id  -- Replace with actual ID
ORDER BY ps.id;

-- ============================================
-- Query 2: Verify step count (should be exactly 3)
-- ============================================
SELECT 
    po.id as production_order_id,
    po.order_no,
    COUNT(ps.id) as step_count,
    CASE 
        WHEN COUNT(ps.id) = 3 THEN '✅ PASS'
        ELSE '❌ FAIL - Expected 3 steps'
    END as verification
FROM production_orders po
LEFT JOIN production_steps ps ON po.id = ps.production_order_id
WHERE po.id = :production_order_id  -- Replace with actual ID
GROUP BY po.id, po.order_no;

-- ============================================
-- Query 3: Verify step names (should be: Dyeing, Handwork, Stitching)
-- ============================================
SELECT 
    ps.step_name,
    COUNT(*) as count,
    CASE 
        WHEN ps.step_name IN ('Dyeing', 'Handwork', 'Stitching') THEN '✅'
        ELSE '❌'
    END as verification
FROM production_steps ps
WHERE ps.production_order_id = :production_order_id  -- Replace with actual ID
GROUP BY ps.step_name
ORDER BY 
    CASE ps.step_name
        WHEN 'Dyeing' THEN 1
        WHEN 'Handwork' THEN 2
        WHEN 'Stitching' THEN 3
        ELSE 4
    END;

-- ============================================
-- Query 4: Complete verification with field checks
-- ============================================
SELECT 
    ps.id,
    ps.step_name,
    ps.status,
    ps.step_qty,
    ps.completed_qty,
    CASE 
        WHEN ps.status = 'pending' THEN '✅'
        ELSE '❌ Expected: pending'
    END as status_check,
    CASE 
        WHEN ps.step_qty IS NULL THEN '✅'
        ELSE '❌ Expected: NULL'
    END as step_qty_check,
    CASE 
        WHEN ps.completed_qty = 0 THEN '✅'
        ELSE '❌ Expected: 0'
    END as completed_qty_check,
    CASE 
        WHEN ps.status = 'pending' 
         AND ps.step_qty IS NULL 
         AND ps.completed_qty = 0 
        THEN '✅ ALL PASS'
        ELSE '❌ SOME FAIL'
    END as overall_check
FROM production_steps ps
WHERE ps.production_order_id = :production_order_id  -- Replace with actual ID
ORDER BY 
    CASE ps.step_name
        WHEN 'Dyeing' THEN 1
        WHEN 'Handwork' THEN 2
        WHEN 'Stitching' THEN 3
        ELSE 4
    END;

-- ============================================
-- Query 5: Find most recent production order from sale and verify steps
-- ============================================
WITH latest_po AS (
    SELECT 
        po.id,
        po.order_no,
        po.transaction_id,
        t.invoice_no
    FROM production_orders po
    INNER JOIN transactions t ON po.transaction_id = t.id
    WHERE po.transaction_id IS NOT NULL
    ORDER BY po.created_at DESC
    LIMIT 1
)
SELECT 
    ps.id,
    ps.step_name,
    ps.status,
    ps.step_qty,
    ps.completed_qty,
    lp.order_no,
    lp.invoice_no as sale_invoice_no,
    CASE 
        WHEN ps.status = 'pending' THEN '✅'
        ELSE '❌'
    END as status_check,
    CASE 
        WHEN ps.step_qty IS NULL THEN '✅'
        ELSE '❌'
    END as step_qty_check,
    CASE 
        WHEN ps.completed_qty = 0 THEN '✅'
        ELSE '❌'
    END as completed_qty_check
FROM latest_po lp
INNER JOIN production_steps ps ON lp.id = ps.production_order_id
ORDER BY 
    CASE ps.step_name
        WHEN 'Dyeing' THEN 1
        WHEN 'Handwork' THEN 2
        WHEN 'Stitching' THEN 3
        ELSE 4
    END;

-- ============================================
-- EXPECTED OUTPUT FORMAT
-- ============================================
-- 
-- Step List:
-- 
-- ID | Step Name | Status   | step_qty | completed_qty
-- ---|-----------|----------|----------|---------------
-- 1  | Dyeing    | pending  | NULL     | 0
-- 2  | Handwork  | pending  | NULL     | 0
-- 3  | Stitching | pending  | NULL     | 0
-- 
-- Verification:
-- ✅ Step count: 3
-- ✅ Step names: Dyeing, Handwork, Stitching
-- ✅ All status = 'pending'
-- ✅ All step_qty IS NULL
-- ✅ All completed_qty = 0
-- 
-- ============================================
