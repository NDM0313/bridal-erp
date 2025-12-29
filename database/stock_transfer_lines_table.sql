-- ============================================
-- STOCK_TRANSFER_LINES TABLE
-- Line items for stock transfer transactions
-- ============================================
-- 
-- NOTE: This table should be added to the database schema.
-- Used for transferring stock between locations.
-- ============================================

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    -- QUANTITY & UNIT (CRITICAL FOR BOX/PIECES):
    quantity NUMERIC(22, 4) NOT NULL,  -- Transfer quantity (can be in Box or Pieces)
    unit_id INTEGER NOT NULL,  -- Unit used for transfer (Box or Pieces) - CRITICAL for stock conversion
    -- METADATA:
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_stl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_stl_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_stl_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_stl_transaction_id ON stock_transfer_lines(transaction_id);
CREATE INDEX idx_stl_product_id ON stock_transfer_lines(product_id);
CREATE INDEX idx_stl_variation_id ON stock_transfer_lines(variation_id);
CREATE INDEX idx_stl_unit_id ON stock_transfer_lines(unit_id);

COMMENT ON TABLE stock_transfer_lines IS 'Stock transfer line items. Transfers stock from source location to destination location.';
COMMENT ON COLUMN stock_transfer_lines.quantity IS 'Transfer quantity. Can be in Box or Pieces (as specified by unit_id).';
COMMENT ON COLUMN stock_transfer_lines.unit_id IS 'CRITICAL: Unit used for transfer (Box or Pieces). Must convert to Pieces before updating stock.';

-- STOCK UPDATE RULES FOR TRANSFERS (ENFORCED IN APPLICATION LOGIC):
-- When a transfer is finalized (status = 'final'):
-- 1. For each stock_transfer_lines row:
--    a. Get unit from unit_id
--    b. Convert to Pieces: qty_in_pieces = quantity * unit.base_unit_multiplier (if Box)
--    c. Deduct from source location: source_location.qty_available -= qty_in_pieces
--    d. Add to destination location: dest_location.qty_available += qty_in_pieces
-- Example: Transferring 2 Boxes (1 Box = 12 Pieces):
--   qty_in_pieces = 2 * 12 = 24 Pieces
--   source_location.qty_available -= 24
--   dest_location.qty_available += 24

-- Enable RLS
ALTER TABLE stock_transfer_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_transfer_lines
CREATE POLICY "users_view_transfer_lines"
ON stock_transfer_lines
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_transfer_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_insert_transfer_lines"
ON stock_transfer_lines
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_transfer_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_update_transfer_lines"
ON stock_transfer_lines
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_transfer_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_delete_transfer_lines"
ON stock_transfer_lines
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = stock_transfer_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

