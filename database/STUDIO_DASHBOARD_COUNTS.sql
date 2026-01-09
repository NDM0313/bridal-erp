-- ============================================
-- STUDIO DASHBOARD REAL-TIME COUNTS
-- Optimized SQL queries for production step counts
-- ============================================
--
-- These queries are designed for real-time dashboard display.
-- They use existing indexes for optimal performance.
--
-- Indexes Used:
-- - idx_production_steps_step_name (on step_name)
-- - idx_production_steps_status (on status)
-- - idx_production_steps_step_name_status (composite: step_name, status)
-- ============================================

-- ============================================
-- QUERY 1: Dyer Count
-- Count: step_name = 'Dyeing' AND status != 'completed'
-- ============================================
SELECT 
    COUNT(*) as dyer_count
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
WHERE ps.step_name = 'Dyeing'
    AND ps.status != 'completed'
    AND po.business_id = $1;  -- Replace $1 with actual business_id

-- Alternative (if business_id is passed as parameter):
-- WHERE ps.step_name = 'Dyeing'
--     AND ps.status != 'completed'
--     AND po.business_id = :business_id;

-- Performance: Uses idx_production_steps_step_name_status (composite index)
-- Expected: Fast (< 10ms for typical datasets)


-- ============================================
-- QUERY 2: Handwork Count
-- Count: step_name = 'Handwork' AND status != 'completed'
-- ============================================
SELECT 
    COUNT(*) as handwork_count
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
WHERE ps.step_name = 'Handwork'
    AND ps.status != 'completed'
    AND po.business_id = $1;  -- Replace $1 with actual business_id

-- Performance: Uses idx_production_steps_step_name_status (composite index)
-- Expected: Fast (< 10ms for typical datasets)


-- ============================================
-- QUERY 3: Stitching Count
-- Count: step_name = 'Stitching' AND status != 'completed'
-- ============================================
SELECT 
    COUNT(*) as stitching_count
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
WHERE ps.step_name = 'Stitching'
    AND ps.status != 'completed'
    AND po.business_id = $1;  -- Replace $1 with actual business_id

-- Performance: Uses idx_production_steps_step_name_status (composite index)
-- Expected: Fast (< 10ms for typical datasets)


-- ============================================
-- QUERY 4: Completed Count
-- Count: status = 'completed'
-- ============================================
SELECT 
    COUNT(*) as completed_count
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
WHERE ps.status = 'completed'
    AND po.business_id = $1;  -- Replace $1 with actual business_id

-- Performance: Uses idx_production_steps_status
-- Expected: Fast (< 10ms for typical datasets)


-- ============================================
-- OPTIMIZED: Single Query for All Counts
-- Returns all 4 counts in one query (recommended)
-- ============================================
SELECT 
    COUNT(*) FILTER (WHERE ps.step_name = 'Dyeing' AND ps.status != 'completed') as dyer_count,
    COUNT(*) FILTER (WHERE ps.step_name = 'Handwork' AND ps.status != 'completed') as handwork_count,
    COUNT(*) FILTER (WHERE ps.step_name = 'Stitching' AND ps.status != 'completed') as stitching_count,
    COUNT(*) FILTER (WHERE ps.status = 'completed') as completed_count
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
WHERE po.business_id = $1;  -- Replace $1 with actual business_id

-- Performance: Single table scan, uses composite indexes
-- Expected: Fast (< 15ms for typical datasets)
-- Recommended: Use this query for dashboard (single round-trip)


-- ============================================
-- ALTERNATIVE: Without Business Filter
-- Use if business_id filtering is done at application level
-- ============================================
SELECT 
    COUNT(*) FILTER (WHERE ps.step_name = 'Dyeing' AND ps.status != 'completed') as dyer_count,
    COUNT(*) FILTER (WHERE ps.step_name = 'Handwork' AND ps.status != 'completed') as handwork_count,
    COUNT(*) FILTER (WHERE ps.step_name = 'Stitching' AND ps.status != 'completed') as stitching_count,
    COUNT(*) FILTER (WHERE ps.status = 'completed') as completed_count
FROM production_steps ps;

-- Performance: Fastest (no join), but requires RLS or application-level filtering
-- Expected: Very Fast (< 5ms for typical datasets)


-- ============================================
-- WITH DETAILS: Include order information
-- Returns counts with additional context (optional)
-- ============================================
SELECT 
    COUNT(*) FILTER (WHERE ps.step_name = 'Dyeing' AND ps.status != 'completed') as dyer_count,
    COUNT(*) FILTER (WHERE ps.step_name = 'Handwork' AND ps.status != 'completed') as handwork_count,
    COUNT(*) FILTER (WHERE ps.step_name = 'Stitching' AND ps.status != 'completed') as stitching_count,
    COUNT(*) FILTER (WHERE ps.status = 'completed') as completed_count,
    -- Additional metrics
    COUNT(*) FILTER (WHERE ps.status = 'in_progress') as in_progress_total,
    COUNT(*) FILTER (WHERE ps.status = 'pending') as pending_total
FROM production_steps ps
INNER JOIN production_orders po ON ps.production_order_id = po.id
WHERE po.business_id = $1;
