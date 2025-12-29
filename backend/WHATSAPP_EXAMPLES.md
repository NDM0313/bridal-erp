# WhatsApp Automation Examples

## 📱 Message Flow Examples

### 1. Invoice Notification Flow

**Trigger**: Sale completed (status = 'final')

**Flow**:
1. Customer completes purchase
2. System checks `invoice_on_sale` rule (enabled)
3. Gets customer WhatsApp number from contact
4. Processes invoice template
5. Queues notification
6. Notification processor sends via WhatsApp

**Example Message**:
```
🧾 Invoice INV-202512-0001

Date: Dec 25, 2025
Customer: John Doe
Total: $240.00

Thank you for your purchase!
```

---

### 2. Low Stock Alert Flow

**Trigger**: Cron job runs (every hour)

**Flow**:
1. System checks all products
2. Finds products with stock ≤ alert_quantity
3. Checks `low_stock_alert` rule (enabled)
4. Gets business WhatsApp number from automation_rules
5. Processes low stock template
6. Queues notification
7. Notification processor sends via WhatsApp

**Example Message**:
```
⚠️ Low Stock Alert: Product Name (PROD-001) has only 5 Pieces remaining at Main Store.
```

---

### 3. STOCK Command Flow

**User Message**: `STOCK PROD-001`

**Flow**:
1. Webhook receives message
2. Message stored in `whatsapp_messages`
3. Command parsed: `STOCK` with param `PROD-001`
4. System queries product by SKU
5. Gets stock levels from all locations
6. Formats response
7. Queues response notification
8. Response sent via WhatsApp

**Example Response**:
```
📦 Product Name (SKU: PROD-001)

Stock Levels:

Default (PROD-001-DEF):
  • Main Store: 120 pieces
  • Warehouse: 50 pieces
```

---

### 4. INVOICE Command Flow

**User Message**: `INVOICE INV-202512-0001`

**Flow**:
1. Webhook receives message
2. Message stored in `whatsapp_messages`
3. Command parsed: `INVOICE` with param `INV-202512-0001`
4. System queries transaction by invoice_no
5. Gets transaction details with items
6. Formats invoice response
7. Queues response notification
8. Response sent via WhatsApp

**Example Response**:
```
🧾 Invoice: INV-202512-0001

Date: Dec 25, 2025
Customer: John Doe
Location: Main Store
Type: retail

Items:
• Product Name (Default)
  2 Box × $100.00 = $200.00
• Another Product
  10 Pieces × $4.00 = $40.00

Total: $240.00
```

---

## 🔧 API Usage Examples

### Create Notification Template

```bash
POST /api/v1/automation/templates
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "notification_type": "invoice",
  "template_name": "Custom Invoice",
  "template_content": "🧾 Invoice {{invoice_no}}\nTotal: {{total}}\nDate: {{date}}\nThank you!",
  "is_active": true
}
```

### Enable Automation Rule

```bash
POST /api/v1/automation/rules
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "rule_type": "invoice_on_sale",
  "is_enabled": true,
  "whatsapp_number": "+1234567890"
}
```

### Send Manual Message

```bash
POST /api/v1/whatsapp/send
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "message": "Hello! This is a test message."
}
```

### Check Notification Queue

```bash
GET /api/v1/whatsapp/notifications?status=pending
Authorization: Bearer YOUR_JWT_TOKEN
```

### Process Queue Manually

```bash
POST /api/v1/whatsapp/process-queue
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "limit": 10
}
```

---

## 📝 Template Variables

### Invoice Template Variables
- `{{invoice_no}}` - Invoice number
- `{{total}}` - Total amount (formatted currency)
- `{{customer_name}}` - Customer name
- `{{date}}` - Transaction date
- `{{invoice_link}}` - Link to invoice (if available)

### Low Stock Template Variables
- `{{product_name}}` - Product name
- `{{sku}}` - Product SKU
- `{{stock_quantity}}` - Current stock quantity
- `{{unit}}` - Unit name (Pieces)
- `{{location_name}}` - Location name
- `{{alert_quantity}}` - Alert threshold

### Sale Confirmation Variables
- `{{invoice_no}}` - Invoice number
- `{{total}}` - Total amount
- `{{item_count}}` - Number of items
- `{{date}}` - Transaction date

### Purchase Confirmation Variables
- `{{ref_no}}` - Purchase reference number
- `{{total}}` - Total amount
- `{{item_count}}` - Number of items
- `{{date}}` - Transaction date

---

## 🔄 Integration Examples

### After Sale Completion

```javascript
// In salesService.js (already integrated)
if (status === 'final') {
  import('./automationService.js').then(({ triggerSaleNotifications }) => {
    triggerSaleNotifications(businessId, transaction).catch((err) => {
      console.error('Error triggering sale notifications:', err);
    });
  });
}
```

### Low Stock Check (Cron Job)

```javascript
// In notificationProcessor.js
import cron from 'node-cron';
import { checkLowStockAlerts } from './jobs/notificationProcessor.js';

// Run every hour
cron.schedule('0 * * * *', async () => {
  await checkLowStockAlerts(); // Checks all businesses
});
```

### Process Queue (Cron Job)

```javascript
// Process queue every minute
cron.schedule('* * * * *', async () => {
  await processNotificationQueue(10);
});
```

---

## 🎯 Best Practices

1. **Template Design**: Keep messages concise and clear
2. **Error Handling**: Always handle notification errors gracefully
3. **Rate Limiting**: Implement rate limiting for webhook endpoint
4. **Queue Processing**: Process queue frequently (every minute)
5. **Monitoring**: Monitor failed notifications and retry logic
6. **Testing**: Test templates with sample data before going live

---

**Ready to automate!** 🚀

