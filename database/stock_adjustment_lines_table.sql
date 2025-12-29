-- ============================================
-- STOCK_ADJUSTMENT_LINES TABLE
-- Line items for stock adjustment transactions
-- ============================================
-- 
-- NOTE: This table should be added to the database schema.
-- Used for manual stock adjustments (increase or decrease).
-- ============================================

CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    -- QUANTITY & UNIT (CRITICAL FOR BOX/PIECES):
    quantity NUMERIC(22, 4) NOT NULL,  -- Adjustment quantity (can be in Box or Pieces)
    unit_id INTEGER NOT NULL,  -- Unit used for adjustment (Box or Pieces) - CRITICAL for stock conversion
    -- ADJUSTMENT TYPE:
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),  -- Increase or decrease stock
    -- REASON:
    reason TEXT NULL,  -- Reason for adjustment (e.g., "Found extra stock", "Damaged items")
    -- METADATA:
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_sal_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sal_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_sal_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_sal_transaction_id ON stock_adjustment_lines(transaction_id);
CREATE INDEX idx_sal_product_id ON stock_adjustment_lines(product_id);
CREATE INDEX idx_sal_variation_id ON stock_adjustment_lines(variation_id);
CREATE INDEX idx_sal_unit_id ON stock_adjustment_lines(unit_id);

COMMENT ON TABLE stock_adjustment_lines IS 'Stock adjustment line items. quantity and unit_id are CRITICAL for stock calculations.';
COMMENT ON COLUMN stock_adjustment_lines.quantity IS 'Adjustment quantity. Can be in Box or Pieces (as specified by unit_id).';
COMMENT ON COLUMN stock_adjustment_lines.unit_id IS 'CRITICAL: Unit used for adjustment (Box or Pieces). Must convert to Pieces before updating stock.';
COMMENT ON COLUMN stock_adjustment_lines.adjustment_type IS 'Type of adjustment: increase (add to stock) or decrease (remove from stock).';

-- STOCK UPDATE RULES FOR ADJUSTMENTS (ENFORCED IN APPLICATION LOGIC):
-- When an adjustment is finalized (status = 'final'):
-- 1. For each stock_adjustment_lines row:
--    a. Get unit from unit_id
--    b. Convert to Pieces: qty_in_pieces = quantity * unit.base_unit_multiplier (if Box)
--    c. If adjustment_type = 'increase': qty_available += qty_in_pieces
--    d. If adjustment_type = 'decrease': qty_available -= qty_in_pieces (with validation)
-- Example: Adjusting 2 Boxes (1 Box = 12 Pieces) as increase:
--   qty_in_pieces = 2 * 12 = 24 Pieces
--   qty_available += 24

-- Enable RLS
ALTER TABLE stock_adjustment_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_adjustment_lines
CREATE POLICY "users_view_adjustment_lines"
ON stock_adjustment_lines
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_adjustment_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_insert_adjustment_lines"
ON stock_adjustment_lines
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_adjustment_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_update_adjustment_lines"
ON stock_adjustment_lines
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_adjustment_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_delete_adjustment_lines"
ON stock_adjustment_lines
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_adjustment_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

