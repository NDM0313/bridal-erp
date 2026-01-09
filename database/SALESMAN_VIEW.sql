-- ============================================
-- ACTIVE SALESMEN VIEW
-- Simplified view for dropdown filtering
-- ============================================

CREATE OR REPLACE VIEW v_active_salesmen AS
SELECT 
  up.id,
  up.user_id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS name,
  u.email,
  up.base_salary,
  up.commission_percentage,
  up.created_at,
  up.updated_at
FROM user_profiles up
JOIN auth.users u ON up.user_id = u.id::text
WHERE up.role = 'salesman' 
  AND (up.status IS NULL OR up.status = 'active');

COMMENT ON VIEW v_active_salesmen IS 'Active salesmen for dropdown filtering in sales/purchase forms';

-- Grant access
GRANT SELECT ON v_active_salesmen TO authenticated;

