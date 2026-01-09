-- ============================================
-- SALESMAN LEDGER SYSTEM
-- Automated tracking of salesman commissions, salary, and advances
-- ============================================
-- 
-- This migration creates tables and triggers for salesman financial management
-- 
-- USAGE: Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD SALESMAN FIELDS TO USER_PROFILES
-- ============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS base_salary NUMERIC(22, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 0;

COMMENT ON COLUMN user_profiles.base_salary IS 'Fixed monthly salary for salesmen';
COMMENT ON COLUMN user_profiles.commission_percentage IS 'Sales commission percentage (0-100)';

-- ============================================
-- 2. SALESMAN_LEDGER TABLE
-- Tracks all financial transactions for salesmen
-- ============================================
CREATE TABLE IF NOT EXISTS salesman_ledger (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Transaction Type
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    -- 'credit' = Commission earnings
    -- 'debit' = Salary payment, Cash advance
    
    -- Transaction Details
    amount NUMERIC(22, 2) NOT NULL DEFAULT 0,
    description TEXT,
    
    -- Reference (optional)
    reference_type VARCHAR(50), -- 'sale', 'salary', 'advance'
    reference_id INTEGER, -- ID of the related transaction
    
    -- Metadata
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_salesman_user FOREIGN KEY (user_id) 
        REFERENCES user_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_salesman_business FOREIGN KEY (business_id) 
        REFERENCES business(id) ON DELETE CASCADE,
    CONSTRAINT fk_salesman_creator FOREIGN KEY (created_by) 
        REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_salesman_ledger_user ON salesman_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_salesman_ledger_business ON salesman_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_salesman_ledger_date ON salesman_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_salesman_ledger_reference ON salesman_ledger(reference_type, reference_id);

COMMENT ON TABLE salesman_ledger IS 'Financial ledger for salesman commissions, salary, and advances';

-- ============================================
-- 3. FUNCTION: Calculate Salesman Commission
-- ============================================
CREATE OR REPLACE FUNCTION calculate_salesman_commission(
    p_user_id INTEGER,
    p_sale_id INTEGER,
    p_sale_total NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_commission_percentage NUMERIC;
    v_commission_amount NUMERIC;
BEGIN
    -- Get salesman's commission percentage
    SELECT commission_percentage INTO v_commission_percentage
    FROM user_profiles
    WHERE id = p_user_id AND role = 'salesman';
    
    IF v_commission_percentage IS NULL OR v_commission_percentage = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculate commission
    v_commission_amount := (p_sale_total * v_commission_percentage) / 100;
    
    RETURN ROUND(v_commission_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. FUNCTION: Auto-Post Commission on Sale
-- ============================================
CREATE OR REPLACE FUNCTION auto_post_salesman_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission NUMERIC;
    v_salesman_id INTEGER;
    v_business_id INTEGER;
BEGIN
    -- Only process completed sales
    IF NEW.status != 'final' THEN
        RETURN NEW;
    END IF;
    
    -- Get salesman from sale (assuming created_by is the salesman)
    SELECT created_by, business_id INTO v_salesman_id, v_business_id
    FROM transactions
    WHERE id = NEW.id;
    
    -- Check if user is a salesman
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = v_salesman_id AND role = 'salesman'
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Calculate commission
    v_commission := calculate_salesman_commission(
        v_salesman_id,
        NEW.id,
        NEW.final_total
    );
    
    -- Post commission to ledger (if > 0)
    IF v_commission > 0 THEN
        INSERT INTO salesman_ledger (
            user_id,
            business_id,
            transaction_date,
            type,
            amount,
            description,
            reference_type,
            reference_id,
            created_by
        ) VALUES (
            v_salesman_id,
            v_business_id,
            NEW.transaction_date,
            'credit',
            v_commission,
            'Commission from Sale #' || NEW.invoice_no,
            'sale',
            NEW.id,
            v_salesman_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic commission posting
DROP TRIGGER IF EXISTS trigger_auto_post_commission ON transactions;
CREATE TRIGGER trigger_auto_post_commission
    AFTER INSERT OR UPDATE OF status, final_total ON transactions
    FOR EACH ROW 
    WHEN (NEW.type = 'sell')
    EXECUTE FUNCTION auto_post_salesman_commission();

-- ============================================
-- 5. FUNCTION: Get Salesman Balance
-- ============================================
CREATE OR REPLACE FUNCTION get_salesman_balance(p_user_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
    INTO v_balance
    FROM salesman_ledger
    WHERE user_id = p_user_id;
    
    RETURN ROUND(v_balance, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FUNCTION: Get Salesman Summary
-- Returns total earnings, payments, and balance
-- ============================================
CREATE OR REPLACE FUNCTION get_salesman_summary(
    p_user_id INTEGER,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
    total_credits NUMERIC,
    total_debits NUMERIC,
    net_balance NUMERIC,
    commission_count INTEGER,
    salary_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS total_debits,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS net_balance,
        COUNT(CASE WHEN type = 'credit' AND reference_type = 'sale' THEN 1 END)::INTEGER AS commission_count,
        COUNT(CASE WHEN type = 'debit' AND reference_type = 'salary' THEN 1 END)::INTEGER AS salary_count
    FROM salesman_ledger
    WHERE user_id = p_user_id
        AND (p_start_date IS NULL OR transaction_date >= p_start_date)
        AND (p_end_date IS NULL OR transaction_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEW: Salesman Ledger with User Details
-- ============================================
CREATE OR REPLACE VIEW v_salesman_ledger AS
SELECT 
    sl.*,
    up.role,
    up.base_salary,
    up.commission_percentage,
    COALESCE(u.email, '') AS salesman_email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS salesman_name
FROM salesman_ledger sl
JOIN user_profiles up ON sl.user_id = up.id
LEFT JOIN auth.users u ON up.user_id = u.id::text;

-- ============================================
-- 8. SAMPLE QUERIES
-- ============================================

-- Get salesman balance
-- SELECT get_salesman_balance(1);

-- Get salesman summary for current month
-- SELECT * FROM get_salesman_summary(
--     1, 
--     DATE_TRUNC('month', CURRENT_DATE), 
--     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
-- );

-- Get all ledger entries for a salesman
-- SELECT * FROM v_salesman_ledger WHERE user_id = 1 ORDER BY transaction_date DESC;

-- Post salary payment
-- INSERT INTO salesman_ledger (user_id, business_id, type, amount, description, reference_type)
-- VALUES (1, 1, 'debit', 5000.00, 'Monthly Salary - January 2026', 'salary');

-- Post cash advance
-- INSERT INTO salesman_ledger (user_id, business_id, type, amount, description, reference_type)
-- VALUES (1, 1, 'debit', 1000.00, 'Cash Advance', 'advance');

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

