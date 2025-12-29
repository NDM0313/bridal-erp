# WhatsApp Automation & Notifications Guide

## 📋 Overview

The WhatsApp automation system enables:
- Automatic invoice sending after sales
- Low stock alerts
- Sale and purchase confirmations
- Two-way communication via commands (STOCK, INVOICE)

## 🔧 Setup

### 1. Database Setup

Run the SQL file to create addon tables:
```sql
-- Execute in Supabase SQL Editor
-- File: database/whatsapp_automation_tables.sql
```

This creates:
- `notification_templates` - Message templates
- `automation_rules` - Enable/disable rules
- `notifications` - Message queue
- `whatsapp_messages` - Incoming messages

### 2. Environment Variables

Add to `.env`:
```
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_API_URL=your-whatsapp-api-url
```

### 3. Configure Provider

Replace `DefaultWhatsAppProvider` in `whatsappService.js` with your actual provider:

```javascript
// Example: Twilio
import { TwilioWhatsAppProvider } from './providers/twilio.js';
whatsappService.setProvider(new TwilioWhatsAppProvider(config));

// Example: WhatsApp Cloud API
import { CloudAPIProvider } from './providers/cloud-api.js';
whatsappService.setProvider(new CloudAPIProvider(config));
```

## 📱 Notification Types

### 1. Invoice Notification
- **Trigger**: After final sale
- **Rule**: `invoice_on_sale`
- **Template**: `invoice`
- **Variables**: `{{invoice_no}}`, `{{total}}`, `{{customer_name}}`, `{{date}}`

### 2. Low Stock Alert
- **Trigger**: When stock ≤ alert_quantity
- **Rule**: `low_stock_alert`
- **Template**: `low_stock`
- **Variables**: `{{product_name}}`, `{{sku}}`, `{{stock_quantity}}`, `{{unit}}`, `{{location_name}}`

### 3. Sale Confirmation
- **Trigger**: After final sale
- **Rule**: `sale_confirmation`
- **Template**: `sale_confirmation`
- **Variables**: `{{invoice_no}}`, `{{total}}`, `{{item_count}}`, `{{date}}`

### 4. Purchase Confirmation
- **Trigger**: After final purchase
- **Rule**: `purchase_confirmation`
- **Template**: `purchase_confirmation`
- **Variables**: `{{ref_no}}`, `{{total}}`, `{{item_count}}`, `{{date}}`

## 🤖 Commands

### STOCK Command
**Usage**: `STOCK <sku>`

**Example**:
```
User: STOCK PROD-001
Bot: 📦 Product Name (SKU: PROD-001)
     Stock Levels:
     Default (PROD-001-DEF):
       • Main Store: 120 pieces
       • Warehouse: 50 pieces
```

### INVOICE Command
**Usage**: `INVOICE <invoice_no>`

**Example**:
```
User: INVOICE INV-202512-0001
Bot: 🧾 Invoice: INV-202512-0001
     Date: Dec 25, 2025
     Customer: John Doe
     Location: Main Store
     Type: retail
     
     Items:
     • Product Name (Default)
       2 Box × $100.00 = $200.00
     
     Total: $200.00
```

### HELP Command
**Usage**: `HELP`

Shows available commands.

## 🔄 Automation Flow

### Sale Flow
1. Sale completed (status = 'final')
2. `triggerSaleNotifications()` called
3. Checks if `sale_confirmation` rule enabled
4. Gets customer WhatsApp number from contact
5. Processes template with variables
6. Queues notification
7. Notification processor sends via WhatsApp

### Low Stock Flow
1. Cron job runs (e.g., every hour)
2. `checkLowStockAlerts()` called
3. Finds products with stock ≤ alert_quantity
4. Checks if `low_stock_alert` rule enabled
5. Gets business WhatsApp number from automation_rules
6. Processes template with variables
7. Queues notification
8. Notification processor sends via WhatsApp

## 📝 Template Examples

### Default Invoice Template
```
Invoice {{invoice_no}} for {{total}} has been generated.
View details: {{invoice_link}}
```

### Custom Invoice Template
```
🧾 *Invoice {{invoice_no}}*

Date: {{date}}
Customer: {{customer_name}}
Total: {{total}}

Thank you for your purchase!
```

### Low Stock Template
```
⚠️ Low Stock Alert: {{product_name}} ({{sku}}) has only {{stock_quantity}} {{unit}} remaining at {{location_name}}.
```

## 🔌 Webhook Setup

### Incoming Messages

**Endpoint**: `POST /api/v1/whatsapp/webhook`

**Request Body**:
```json
{
  "phoneNumber": "+1234567890",
  "messageText": "STOCK PROD-001",
  "metadata": {
    "provider": "twilio",
    "messageId": "msg_123"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook received"
}
```

### Configure Provider Webhook

Point your WhatsApp provider's webhook URL to:
```
https://your-backend.com/api/v1/whatsapp/webhook
```

## ⚙️ Configuration

### Enable/Disable Rules

```sql
-- Enable invoice notifications
UPDATE automation_rules
SET is_enabled = true
WHERE business_id = 1 AND rule_type = 'invoice_on_sale';

-- Disable low stock alerts
UPDATE automation_rules
SET is_enabled = false
WHERE business_id = 1 AND rule_type = 'low_stock_alert';
```

### Set Business WhatsApp Number

```sql
-- Set default WhatsApp number for business
UPDATE automation_rules
SET whatsapp_number = '+1234567890'
WHERE business_id = 1;
```

### Create Custom Template

```sql
INSERT INTO notification_templates (
  business_id,
  notification_type,
  template_name,
  template_content,
  is_active
) VALUES (
  1,
  'invoice',
  'Custom Invoice',
  '🧾 Invoice {{invoice_no}}\nTotal: {{total}}\nThank you!',
  true
);
```

## 🔄 Queue Processing

### Manual Processing

```bash
POST /api/v1/whatsapp/process-queue
{
  "limit": 10
}
```

### Automated Processing (Cron)

```javascript
// Using node-cron
import cron from 'node-cron';
import { processNotificationQueue } from './jobs/notificationProcessor.js';

// Process every minute
cron.schedule('* * * * *', async () => {
  await processNotificationQueue(10);
});

// Check low stock every hour
cron.schedule('0 * * * *', async () => {
  await checkLowStockAlerts();
});
```

## 📊 Monitoring

### Check Notification Status

```bash
GET /api/v1/whatsapp/notifications?status=pending
```

### View Failed Notifications

```bash
GET /api/v1/whatsapp/notifications?status=failed
```

## 🔒 Security

- Webhook signature verification (implement in provider)
- RLS policies on all tables
- Business isolation via `business_id`
- Rate limiting on webhook endpoint

## 🚀 Next Steps

1. **Implement Provider**: Replace default provider with actual WhatsApp API
2. **Phone Mapping**: Create table to map phone numbers to businesses
3. **Enhanced Commands**: Add more commands (ORDERS, STATUS, etc.)
4. **Rich Media**: Support images, PDFs for invoices
5. **Two-Way Chat**: Enhanced conversation handling

---

**Ready to automate!** 🚀

