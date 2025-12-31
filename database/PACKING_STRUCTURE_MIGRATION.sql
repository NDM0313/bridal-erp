-- ============================================
-- PACKING STRUCTURE MIGRATION
-- Supports flexible Box, PC (Pieces), and Meters tracking
-- ============================================
-- 
-- This migration adds tables to track packing details for sale items
-- Structure: Box -> Pieces -> Meters (all flexible, not fixed)
-- 
-- USAGE: Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SALE_ITEM_PACKING TABLE
-- Stores packing data for each sale item
-- ============================================
CREATE TABLE IF NOT EXISTS sale_item_packing (
    id SERIAL PRIMARY KEY,
    transaction_sell_line_id INTEGER NOT NULL,
    entry_mode VARCHAR(20) NOT NULL DEFAULT 'detailed', -- 'detailed' or 'quick'
    
    -- Quick Entry Mode (when entry_mode = 'quick')
    quick_boxes INTEGER DEFAULT 0,
    quick_pieces INTEGER DEFAULT 0,
    quick_meters NUMERIC(22, 4) DEFAULT 0,
    
    -- Calculated Totals (for both modes)
    total_boxes INTEGER NOT NULL DEFAULT 0,
    total_pieces INTEGER NOT NULL DEFAULT 0,
    total_meters NUMERIC(22, 4) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_packing_sell_line FOREIGN KEY (transaction_sell_line_id) 
        REFERENCES transaction_sell_lines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packing_sell_line ON sale_item_packing(transaction_sell_line_id);

-- ============================================
-- 2. PACKING_BOXES TABLE
-- Stores individual boxes (for detailed entry mode)
-- ============================================
CREATE TABLE IF NOT EXISTS packing_boxes (
    id SERIAL PRIMARY KEY,
    packing_id INTEGER NOT NULL,
    box_number INTEGER NOT NULL, -- Box sequence number (1, 2, 3...)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_box_packing FOREIGN KEY (packing_id) 
        REFERENCES sale_item_packing(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_box_packing ON packing_boxes(packing_id);

-- ============================================
-- 3. PACKING_PIECES TABLE
-- Stores individual pieces within boxes or as loose pieces
-- ============================================
CREATE TABLE IF NOT EXISTS packing_pieces (
    id SERIAL PRIMARY KEY,
    box_id INTEGER NULL, -- NULL for loose pieces, set for box pieces
    packing_id INTEGER NOT NULL, -- Always set for reference
    piece_number INTEGER NOT NULL, -- Piece sequence number
    meters NUMERIC(22, 4) NOT NULL DEFAULT 0,
    is_loose BOOLEAN NOT NULL DEFAULT false, -- true if not in a box
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_piece_box FOREIGN KEY (box_id) 
        REFERENCES packing_boxes(id) ON DELETE CASCADE,
    CONSTRAINT fk_piece_packing FOREIGN KEY (packing_id) 
        REFERENCES sale_item_packing(id) ON DELETE CASCADE,
    
    -- Ensure piece is either in a box or loose, not both
    CONSTRAINT chk_piece_type CHECK (
        (box_id IS NULL AND is_loose = true) OR 
        (box_id IS NOT NULL AND is_loose = false)
    )
);

CREATE INDEX IF NOT EXISTS idx_piece_box ON packing_pieces(box_id);
CREATE INDEX IF NOT EXISTS idx_piece_packing ON packing_pieces(packing_id);
CREATE INDEX IF NOT EXISTS idx_piece_loose ON packing_pieces(is_loose) WHERE is_loose = true;

-- ============================================
-- 4. TRIGGER: Update totals when packing data changes
-- ============================================
CREATE OR REPLACE FUNCTION update_packing_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_packing_id INTEGER;
    v_total_boxes INTEGER;
    v_total_pieces INTEGER;
    v_total_meters NUMERIC(22, 4);
BEGIN
    -- Get packing_id from the trigger context
    IF TG_TABLE_NAME = 'packing_boxes' THEN
        v_packing_id := NEW.packing_id;
    ELSIF TG_TABLE_NAME = 'packing_pieces' THEN
        v_packing_id := NEW.packing_id;
    ELSIF TG_TABLE_NAME = 'sale_item_packing' THEN
        v_packing_id := NEW.id;
    END IF;

    -- Calculate totals
    SELECT 
        COUNT(DISTINCT pb.id),
        COUNT(pp.id),
        COALESCE(SUM(pp.meters), 0)
    INTO v_total_boxes, v_total_pieces, v_total_meters
    FROM sale_item_packing sp
    LEFT JOIN packing_boxes pb ON pb.packing_id = sp.id
    LEFT JOIN packing_pieces pp ON pp.packing_id = sp.id
    WHERE sp.id = v_packing_id;

    -- Update packing record
    UPDATE sale_item_packing
    SET 
        total_boxes = v_total_boxes,
        total_pieces = v_total_pieces,
        total_meters = v_total_meters,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_packing_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_packing_totals_boxes ON packing_boxes;
CREATE TRIGGER trigger_update_packing_totals_boxes
    AFTER INSERT OR UPDATE OR DELETE ON packing_boxes
    FOR EACH ROW EXECUTE FUNCTION update_packing_totals();

DROP TRIGGER IF EXISTS trigger_update_packing_totals_pieces ON packing_pieces;
CREATE TRIGGER trigger_update_packing_totals_pieces
    AFTER INSERT OR UPDATE OR DELETE ON packing_pieces
    FOR EACH ROW EXECUTE FUNCTION update_packing_totals();

-- ============================================
-- 5. HELPER FUNCTION: Get packing summary
-- ============================================
CREATE OR REPLACE FUNCTION get_packing_summary(p_sell_line_id INTEGER)
RETURNS TABLE (
    total_boxes INTEGER,
    total_pieces INTEGER,
    total_meters NUMERIC(22, 4),
    entry_mode VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.total_boxes,
        sp.total_pieces,
        sp.total_meters,
        sp.entry_mode
    FROM sale_item_packing sp
    WHERE sp.transaction_sell_line_id = p_sell_line_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check if tables were created
SELECT 
    'sale_item_packing' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'sale_item_packing'
UNION ALL
SELECT 
    'packing_boxes' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'packing_boxes'
UNION ALL
SELECT 
    'packing_pieces' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'packing_pieces';

-- ============================================
-- NOTES:
-- ============================================
-- 1. Box structure is flexible: 1 box can have 10 PC, 15 PC, or any number
-- 2. Meters are also flexible per piece
-- 3. Supports two entry modes:
--    - Detailed: Box-by-box, piece-by-piece entry
--    - Quick: Enter total boxes, pieces, and meters directly
-- 4. Stock maintenance can use this data to track:
--    - Box-level inventory
--    - Piece-level inventory  
--    - Meter-level inventory (for fabric/meter-based products)
-- ============================================

