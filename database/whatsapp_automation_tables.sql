-- ============================================
-- WHATSAPP AUTOMATION & NOTIFICATIONS TABLES
-- Addon tables for WhatsApp integration
-- ============================================
-- 
-- NOTE: These are ADDON tables only.
-- Do NOT modify existing core tables.
-- ============================================

-- 1. NOTIFICATION_TEMPLATES TABLE
-- Purpose: Store message templates for different notification types
-- Why: Allows businesses to customize message content
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL,  -- 'invoice', 'low_stock', 'sale_confirmation', 'purchase_confirmation'
    template_name VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL,  -- Message template with placeholders like {{invoice_no}}, {{total}}, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_nt_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_nt_type CHECK (notification_type IN ('invoice', 'low_stock', 'sale_confirmation', 'purchase_confirmation')),
    UNIQUE (business_id, notification_type, template_name)
);

CREATE INDEX idx_nt_business_id ON notification_templates(business_id);
CREATE INDEX idx_nt_type ON notification_templates(notification_type);
CREATE INDEX idx_nt_active ON notification_templates(is_active);

COMMENT ON TABLE notification_templates IS 'Message templates for WhatsApp notifications. Supports placeholders like {{variable_name}}.';
COMMENT ON COLUMN notification_templates.template_content IS 'Template with placeholders. Example: "Invoice {{invoice_no}} for {{total}} has been generated."';

-- 2. AUTOMATION_RULES TABLE
-- Purpose: Configurable automation rules per business
-- Why: Allows businesses to enable/disable specific notification types
CREATE TABLE IF NOT EXISTS automation_rules (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    rule_type VARCHAR(50) NOT NULL,  -- 'invoice_on_sale', 'low_stock_alert', 'sale_confirmation', 'purchase_confirmation'
    is_enabled BOOLEAN DEFAULT true,
    conditions JSONB NULL,  -- Additional conditions (e.g., minimum_amount, specific_locations)
    whatsapp_number VARCHAR(20) NULL,  -- Default WhatsApp number for this business
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_ar_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_ar_type CHECK (rule_type IN ('invoice_on_sale', 'low_stock_alert', 'sale_confirmation', 'purchase_confirmation')),
    UNIQUE (business_id, rule_type)
);

CREATE INDEX idx_ar_business_id ON automation_rules(business_id);
CREATE INDEX idx_ar_type ON automation_rules(rule_type);
CREATE INDEX idx_ar_enabled ON automation_rules(is_enabled);

COMMENT ON TABLE automation_rules IS 'Automation rules to enable/disable notification types per business.';
COMMENT ON COLUMN automation_rules.conditions IS 'JSON conditions. Example: {"min_amount": 1000, "locations": [1, 2]}.';

-- 3. NOTIFICATIONS TABLE (Queue)
-- Purpose: Queue for outgoing WhatsApp messages
-- Why: Async processing, retry logic, status tracking
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,  -- WhatsApp phone number (with country code)
    message_content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed', 'delivered'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT NULL,
    metadata JSONB NULL,  -- Additional data (invoice_id, transaction_id, etc.)
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_n_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    -- VALIDATION:
    CONSTRAINT chk_n_type CHECK (notification_type IN ('invoice', 'low_stock', 'sale_confirmation', 'purchase_confirmation', 'command_response')),
    CONSTRAINT chk_n_status CHECK (status IN ('pending', 'sent', 'failed', 'delivered'))
);

CREATE INDEX idx_n_business_id ON notifications(business_id);
CREATE INDEX idx_n_status ON notifications(status);
CREATE INDEX idx_n_recipient ON notifications(recipient_phone);
CREATE INDEX idx_n_created_at ON notifications(created_at);
CREATE INDEX idx_n_pending ON notifications(status, created_at) WHERE status = 'pending';

COMMENT ON TABLE notifications IS 'Queue for outgoing WhatsApp messages. Processed asynchronously.';
COMMENT ON COLUMN notifications.metadata IS 'JSON metadata. Example: {"invoice_id": 123, "transaction_id": 456}.';

-- 4. WHATSAPP_MESSAGES TABLE (Incoming)
-- Purpose: Store incoming WhatsApp messages for command processing
-- Why: Track command history, enable two-way communication
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NULL,  -- Can be null if business not identified
    phone_number VARCHAR(20) NOT NULL,  -- Sender's WhatsApp number
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',  -- 'text', 'command', 'media'
    command_type VARCHAR(50) NULL,  -- 'STOCK', 'INVOICE', etc.
    command_params TEXT NULL,  -- Parameters for command (e.g., SKU, invoice_no)
    processed BOOLEAN DEFAULT false,
    response_sent BOOLEAN DEFAULT false,
    response_notification_id INTEGER NULL,  -- References notifications.id
    metadata JSONB NULL,  -- Provider-specific metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- FOREIGN KEYS:
    CONSTRAINT fk_wm_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
    CONSTRAINT fk_wm_response FOREIGN KEY (response_notification_id) REFERENCES notifications(id) ON DELETE SET NULL
);

CREATE INDEX idx_wm_business_id ON whatsapp_messages(business_id);
CREATE INDEX idx_wm_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_wm_processed ON whatsapp_messages(processed);
CREATE INDEX idx_wm_created_at ON whatsapp_messages(created_at);

COMMENT ON TABLE whatsapp_messages IS 'Incoming WhatsApp messages for command processing.';
COMMENT ON COLUMN whatsapp_messages.command_type IS 'Extracted command type (STOCK, INVOICE, etc.).';

-- Enable RLS on all tables
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates
CREATE POLICY "users_view_templates" ON notification_templates
FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "users_manage_templates" ON notification_templates
FOR ALL USING (business_id = get_user_business_id());

-- RLS Policies for automation_rules
CREATE POLICY "users_view_rules" ON automation_rules
FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "users_manage_rules" ON automation_rules
FOR ALL USING (business_id = get_user_business_id());

-- RLS Policies for notifications
CREATE POLICY "users_view_notifications" ON notifications
FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "users_insert_notifications" ON notifications
FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "users_update_notifications" ON notifications
FOR UPDATE USING (business_id = get_user_business_id());

-- RLS Policies for whatsapp_messages
CREATE POLICY "users_view_messages" ON whatsapp_messages
FOR SELECT USING (business_id = get_user_business_id() OR business_id IS NULL);

CREATE POLICY "users_insert_messages" ON whatsapp_messages
FOR INSERT WITH CHECK (business_id = get_user_business_id() OR business_id IS NULL);

CREATE POLICY "users_update_messages" ON whatsapp_messages
FOR UPDATE USING (business_id = get_user_business_id() OR business_id IS NULL);

