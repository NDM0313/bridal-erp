-- Business Settings Table
-- Stores application-level settings for each business
-- Uses JSONB for flexible settings storage

CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_business_settings_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);

-- RLS Policies
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access settings for their own business
CREATE POLICY "Users can view their business settings"
    ON business_settings FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update settings for their own business
CREATE POLICY "Users can update their business settings"
    ON business_settings FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert settings for their own business
CREATE POLICY "Users can insert their business settings"
    ON business_settings FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

COMMENT ON TABLE business_settings IS 'Stores application-level settings (UI preferences, feature toggles, etc.) for each business';
COMMENT ON COLUMN business_settings.settings IS 'JSONB object containing all application settings';

