-- ============================================
-- PURCHASE_LINES TABLE
-- Line items for purchase transactions
-- Similar structure to transaction_sell_lines
-- ============================================
-- 
-- NOTE: This table should be added to the database schema.
-- It follows the same pattern as transaction_sell_lines but for purchases.
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    -- QUANTITY & UNIT (CRITICAL FOR BOX/PIECES):
    quantity NUMERIC(22, 4) NOT NULL,  -- Quantity purchased (can be in Box or Pieces)
    unit_id INTEGER NOT NULL,  -- Unit used for purchase (Box or Pieces) - CRITICAL for stock conversion
    -- PRICING:
    purchase_price NUMERIC(22, 4) NOT NULL,  -- Purchase price per unit
    purchase_price_inc_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,  -- Price including tax
    line_discount_type VARCHAR(20) NULL CHECK (line_discount_type IN ('fixed', 'percentage')),
    line_discount_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    -- TOTALS:
    item_tax NUMERIC(22, 4) NOT NULL DEFAULT 0,
    tax_id INTEGER NULL,  -- References tax_rates if exists
    line_total NUMERIC(22, 4) NOT NULL,  -- Total for this line (quantity * purchase_price - discount + tax)
    -- ADDITIONAL:
    purchase_line_note TEXT NULL,
    -- METADATA:
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_pl_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_variation FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_pl_quantity CHECK (quantity > 0),
    CONSTRAINT chk_pl_purchase_price CHECK (purchase_price >= 0),
    CONSTRAINT chk_pl_line_total CHECK (line_total >= 0)
);

CREATE INDEX idx_pl_transaction_id ON purchase_lines(transaction_id);
CREATE INDEX idx_pl_product_id ON purchase_lines(product_id);
CREATE INDEX idx_pl_variation_id ON purchase_lines(variation_id);
CREATE INDEX idx_pl_unit_id ON purchase_lines(unit_id);

COMMENT ON TABLE purchase_lines IS 'Purchase line items. quantity and unit_id are CRITICAL for stock calculations.';
COMMENT ON COLUMN purchase_lines.quantity IS 'Quantity purchased. Can be in Box or Pieces (as specified by unit_id).';
COMMENT ON COLUMN purchase_lines.unit_id IS 'CRITICAL: Unit used for purchase (Box or Pieces). Must convert to Pieces before updating stock. Use base_unit_multiplier for conversion.';
COMMENT ON COLUMN purchase_lines.purchase_price IS 'Purchase price per unit from supplier.';

-- STOCK UPDATE RULES FOR PURCHASES (ENFORCED IN APPLICATION LOGIC):
-- When a purchase is finalized (status = 'final'):
-- 1. For each purchase_lines row:
--    a. Get unit from unit_id
--    b. If unit.base_unit_id IS NOT NULL (it's a Box), convert to Pieces:
--       qty_in_pieces = quantity * unit.base_unit_multiplier
--    c. If unit.base_unit_id IS NULL (it's Pieces), use quantity as-is
--    d. Update variation_location_details:
--       qty_available += qty_in_pieces
-- Example: Purchasing 5 Boxes (1 Box = 12 Pieces):
--   qty_in_pieces = 5 * 12 = 60 Pieces
--   qty_available += 60

-- Enable RLS
ALTER TABLE purchase_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_lines
CREATE POLICY "users_view_purchase_lines"
ON purchase_lines
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = purchase_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_insert_purchase_lines"
ON purchase_lines
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = purchase_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_update_purchase_lines"
ON purchase_lines
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = purchase_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

CREATE POLICY "users_delete_purchase_lines"
ON purchase_lines
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM transactions
        WHERE transactions.id = purchase_lines.transaction_id
        AND transactions.business_id = get_user_business_id()
    )
);

