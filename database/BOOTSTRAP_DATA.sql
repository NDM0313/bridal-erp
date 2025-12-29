-- ============================================
-- BOOTSTRAP DATA FOR NEW SCHEMA
-- Insert minimum required records
-- ============================================
-- 
-- IMPORTANT:
-- - Replace 'YOUR_USER_UUID' with actual UUID from auth.users
-- - Get UUID from Supabase Dashboard → Authentication → Users
-- ============================================

-- ============================================
-- STEP 1: GET YOUR USER UUID
-- ============================================
-- Run this first to get your user UUID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- ============================================
-- STEP 2: INSERT BUSINESS
-- ============================================
-- Replace 'YOUR_USER_UUID' with actual UUID

INSERT INTO businesses (
    name,
    owner_id,
    time_zone,
    accounting_method,
    created_at,
    updated_at
) VALUES (
    'My Business',
    'YOUR_USER_UUID'::UUID,  -- REPLACE THIS
    'UTC',
    'fifo',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING
RETURNING id, name;

-- ============================================
-- STEP 3: INSERT BUSINESS LOCATION
-- ============================================
-- Replace 1 with actual business_id from step 2

INSERT INTO business_locations (
    business_id,
    name,
    city,
    country,
    created_at,
    updated_at
) VALUES (
    1,  -- REPLACE with actual business_id
    'Main Store',
    'Your City',
    'Your Country',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING
RETURNING id, name, business_id;

-- ============================================
-- STEP 4: INSERT BASE UNIT (PIECES)
-- ============================================
-- Replace 'YOUR_USER_UUID' and business_id

INSERT INTO units (
    business_id,
    actual_name,
    short_name,
    allow_decimal,
    base_unit_id,
    base_unit_multiplier,
    created_by,
    created_at,
    updated_at
) VALUES (
    1,  -- REPLACE with actual business_id
    'Pieces',
    'Pcs',
    false,
    NULL,  -- Base unit has no base_unit_id
    NULL,  -- Base unit has no multiplier
    'YOUR_USER_UUID'::UUID,  -- REPLACE THIS
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING
RETURNING id, actual_name, business_id;

-- ============================================
-- STEP 5: INSERT SECONDARY UNIT (BOX)
-- ============================================
-- Replace 'YOUR_USER_UUID', business_id, and base_unit_id (from step 4)

INSERT INTO units (
    business_id,
    actual_name,
    short_name,
    allow_decimal,
    base_unit_id,
    base_unit_multiplier,
    created_by,
    created_at,
    updated_at
) VALUES (
    1,  -- REPLACE with actual business_id
    'Box',
    'Box',
    false,
    1,  -- REPLACE with base_unit_id (Pieces) from step 4
    12,  -- 1 Box = 12 Pieces
    'YOUR_USER_UUID'::UUID,  -- REPLACE THIS
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING
RETURNING id, actual_name, base_unit_id, base_unit_multiplier;

-- ============================================
-- STEP 6: INSERT USER_PROFILES ROW
-- ============================================
-- Replace 'YOUR_USER_UUID' and business_id

INSERT INTO user_profiles (
    user_id,
    business_id,
    role,
    created_at,
    updated_at
) VALUES (
    'YOUR_USER_UUID'::UUID,  -- REPLACE THIS
    1,  -- REPLACE with actual business_id
    'owner',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (user_id) DO UPDATE SET
    business_id = EXCLUDED.business_id,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP
RETURNING id, user_id, business_id, role;

-- ============================================
-- STEP 7: VERIFY BOOTSTRAP DATA
-- ============================================

-- Check business
SELECT id, name, owner_id FROM businesses;

-- Check location
SELECT id, name, business_id FROM business_locations;

-- Check units
SELECT id, actual_name, short_name, base_unit_id, base_unit_multiplier 
FROM units 
ORDER BY id;

-- Check user profile
SELECT id, user_id, business_id, role FROM user_profiles;

-- Test get_user_business_id() function
-- (This will only work if you're authenticated)
SELECT get_user_business_id() as business_id_result;

-- ============================================
-- COMPLETE BOOTSTRAP CHECKLIST
-- ============================================
-- 
-- ✅ Business created
-- ✅ Business location created
-- ✅ Base unit (Pieces) created
-- ✅ Secondary unit (Box) created
-- ✅ User profile linked to business
-- ✅ get_user_business_id() function works
-- 
-- ============================================

