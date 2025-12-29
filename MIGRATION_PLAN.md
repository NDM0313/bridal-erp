# 🏗️ COMPREHENSIVE MIGRATION PLAN
## Laravel POS System → Modern Node.js Architecture

**System:** Business Management System (Inventory, Sales, Purchase, Accounting)  
**Target:** Node.js + Supabase + Next.js + React Native  
**Date:** December 2025

---

## 📋 TABLE OF CONTENTS

1. [System Analysis](#1-system-analysis)
2. [Migration Strategy](#2-migration-strategy)
3. [Database Schema Design](#3-database-schema-design)
4. [API Architecture](#4-api-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Unit Conversion Logic](#6-unit-conversion-logic-boxpieces)
7. [Automation-Ready Design](#7-automation-ready-design)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. SYSTEM ANALYSIS

### 1.1 Current System Architecture

**Technology Stack:**
- **Backend:** Laravel (PHP) with MySQL
- **Frontend:** Blade Templates + jQuery
- **Modules:** 20+ modules (Essentials, Accounting, Manufacturing, CRM, etc.)
- **API:** RESTful API via Connector module

**Core Business Modules:**
1. **Products Management**
   - Single & Variable products
   - Variations with SKU
   - Unit management (Base units + Sub-units)
   - Pricing (Retail/Wholesale)
   - Stock management per location

2. **Sales Management**
   - POS (Point of Sale)
   - Direct Sales
   - Sales Orders
   - Sales Returns
   - Multi-location support

3. **Purchase Management**
   - Purchase Orders
   - Purchase Receipts
   - Purchase Returns
   - Supplier management

4. **Inventory Management**
   - Stock adjustments
   - Stock transfers
   - Opening stock
   - Location-based inventory

5. **Accounting**
   - Accounts management
   - Transactions
   - Reports

### 1.2 Critical Business Logic

**Unit Conversion System:**
- Products have a **base unit** (e.g., "Pieces")
- Products can have **sub-units** (e.g., "Box") with multiplier
- Example: 1 Box = 12 Pieces
- Inventory auto-calculates when selling in Box or Pieces
- Conversion handled via `base_unit_id` and `base_unit_multiplier` in `units` table

**Pricing System:**
- Every product variation has:
  - `retail_price` (for walk-in customers)
  - `wholesale_price` (for dealers)
- Customer type determines which price to use

**Multi-tenancy:**
- All tables have `business_id` for data isolation
- Each business can have multiple locations

---

## 2. MIGRATION STRATEGY

### 2.1 Phased Approach

**Phase 1: Foundation (Weeks 1-2)**
- Database schema migration to Supabase
- Authentication setup
- Core API structure
- Basic product CRUD

**Phase 2: Product Module (Weeks 3-4)**
- Complete product management
- Unit conversion logic
- Pricing (retail/wholesale)
- Stock management

**Phase 3: Sales Module (Weeks 5-6)**
- POS functionality
- Sales transactions
- Customer management
- Invoice generation

**Phase 4: Purchase & Inventory (Weeks 7-8)**
- Purchase management
- Stock adjustments
- Multi-location support

**Phase 5: Frontend Web (Weeks 9-10)**
- Next.js dashboard
- Product screens
- Sales interface
- Reports

**Phase 6: Mobile App (Weeks 11-12)**
- React Native POS
- Offline support
- Sync mechanism

**Phase 7: Automation (Weeks 13-14)**
- WhatsApp integration
- Notification system
- Invoice automation

### 2.2 Migration Principles

1. **Preserve Business Logic:** All calculations and workflows must remain identical
2. **Data Integrity:** Zero data loss during migration
3. **Backward Compatibility:** API should support legacy clients during transition
4. **Performance:** Improve response times by 50%+
5. **Scalability:** Design for 10x growth

---

## 3. DATABASE SCHEMA DESIGN

### 3.1 Core Tables

#### **units**
```sql
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    actual_name VARCHAR(255) NOT NULL,  -- "Pieces", "Box"
    short_name VARCHAR(255) NOT NULL,    -- "Pcs", "Box"
    allow_decimal BOOLEAN DEFAULT false,
    base_unit_id INTEGER NULL,           -- Self-reference for sub-units
    base_unit_multiplier NUMERIC(20, 4) NULL,  -- e.g., 12 (1 Box = 12 Pcs)
    created_by INTEGER NOT NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (base_unit_id) REFERENCES units(id) ON DELETE SET NULL
);
```

#### **products**
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'single' CHECK (type IN ('single', 'variable')),
    unit_id INTEGER NOT NULL,  -- Base unit (e.g., Pieces)
    secondary_unit_id INTEGER NULL,  -- Optional secondary unit (e.g., Box)
    brand_id INTEGER NULL,
    category_id INTEGER NULL,
    sub_category_id INTEGER NULL,
    sku VARCHAR(255) NOT NULL,
    enable_stock BOOLEAN DEFAULT false,
    alert_quantity NUMERIC(22, 4) DEFAULT 0,
    is_inactive BOOLEAN DEFAULT false,
    image VARCHAR(255) NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (secondary_unit_id) REFERENCES units(id) ON DELETE SET NULL
);
```

#### **variations**
```sql
CREATE TABLE variations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    product_variation_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    sub_sku VARCHAR(255) NULL,
    -- Pricing (CRITICAL for retail/wholesale)
    retail_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(22, 4) NOT NULL DEFAULT 0,
    default_purchase_price NUMERIC(22, 4) NULL,
    -- Stock tracking
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variation_id) REFERENCES product_variations(id) ON DELETE CASCADE
);
```

#### **variation_location_details** (Stock per location)
```sql
CREATE TABLE variation_location_details (
    id SERIAL PRIMARY KEY,
    variation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    qty_available NUMERIC(22, 4) DEFAULT 0,  -- Always in base unit (Pieces)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    UNIQUE(variation_id, location_id)
);
```

#### **transactions** (Sales/Purchase)
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'sell', 'purchase', 'stock_adjustment', etc.
    status VARCHAR(20) NOT NULL,  -- 'draft', 'final', 'pending'
    contact_id INTEGER NULL,  -- Customer/Supplier
    customer_type VARCHAR(20) NULL,  -- 'retail' or 'wholesale' (CRITICAL for pricing)
    invoice_no VARCHAR(255) NULL,
    transaction_date TIMESTAMP NOT NULL,
    final_total NUMERIC(22, 4) NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE
);
```

#### **transaction_sell_lines** (Sales line items)
```sql
CREATE TABLE transaction_sell_lines (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NOT NULL,
    quantity NUMERIC(22, 4) NOT NULL,  -- Quantity sold
    unit_id INTEGER NOT NULL,  -- Unit used for sale (Box or Pieces)
    unit_price NUMERIC(22, 4) NOT NULL,  -- Price per unit (retail or wholesale)
    line_total NUMERIC(22, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);
```

### 3.2 Indexes for Performance

```sql
-- Units
CREATE INDEX idx_units_business_id ON units(business_id);
CREATE INDEX idx_units_base_unit_id ON units(base_unit_id);

-- Products
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_unit_id ON products(unit_id);

-- Variations
CREATE INDEX idx_variations_product_id ON variations(product_id);
CREATE INDEX idx_variations_sub_sku ON variations(sub_sku);

-- Stock
CREATE INDEX idx_vld_variation_location ON variation_location_details(variation_id, location_id);

-- Transactions
CREATE INDEX idx_transactions_business_location ON transactions(business_id, location_id);
CREATE INDEX idx_transactions_type_status ON transactions(type, status);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
```

---

## 4. API ARCHITECTURE

### 4.1 Technology Stack

- **Framework:** Express.js (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (JWT)
- **Storage:** Supabase Storage (for product images)
- **API Style:** RESTful + GraphQL (optional for complex queries)

### 4.2 API Structure

```
/api/v1/
├── auth/
│   ├── POST /login
│   ├── POST /register
│   ├── POST /refresh
│   └── POST /logout
├── products/
│   ├── GET /                    # List products
│   ├── GET /:id                  # Get product details
│   ├── POST /                   # Create product
│   ├── PUT /:id                 # Update product
│   ├── DELETE /:id              # Delete product
│   ├── GET /:id/stock            # Get stock by location
│   └── GET /search               # Search products
├── variations/
│   ├── GET /:id                 # Get variation details
│   ├── PUT /:id/pricing         # Update retail/wholesale prices
│   └── GET /:id/stock            # Get stock for variation
├── units/
│   ├── GET /                    # List units
│   ├── POST /                   # Create unit
│   └── GET /:id/conversions     # Get unit conversion chain
├── sales/
│   ├── POST /                   # Create sale
│   ├── GET /                    # List sales
│   ├── GET /:id                 # Get sale details
│   ├── POST /:id/complete       # Complete sale
│   └── POST /:id/return         # Return sale
├── purchases/
│   ├── POST /                   # Create purchase
│   ├── GET /                    # List purchases
│   └── GET /:id                 # Get purchase details
├── inventory/
│   ├── GET /stock/:variation_id # Get stock by variation
│   ├── POST /adjust             # Stock adjustment
│   └── POST /transfer           # Stock transfer
└── reports/
    ├── GET /sales                # Sales report
    ├── GET /inventory            # Inventory report
    └── GET /dashboard            # Dashboard summary
```

### 4.3 API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with ID 123 not found",
    "details": { ... }
  }
}
```

### 4.4 Key API Endpoints

#### **POST /api/v1/sales**
Create a new sale transaction.

**Request:**
```json
{
  "location_id": 1,
  "contact_id": 5,
  "customer_type": "retail",  // or "wholesale"
  "items": [
    {
      "variation_id": 10,
      "quantity": 2,
      "unit_id": 3,  // Box (will auto-convert to pieces)
      "unit_price": 500.00
    }
  ],
  "payment_method": "cash",
  "discount": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "invoice_no": "INV-2025-001",
    "total": 1000.00,
    "stock_updated": true
  }
}
```

#### **GET /api/v1/products/:id/stock**
Get stock for a product across all locations.

**Response:**
```json
{
  "success": true,
  "data": {
    "product_id": 5,
    "base_unit": { "id": 1, "name": "Pieces", "short_name": "Pcs" },
    "secondary_unit": { "id": 3, "name": "Box", "short_name": "Box", "multiplier": 12 },
    "stock_by_location": [
      {
        "location_id": 1,
        "location_name": "Main Store",
        "qty_in_pieces": 120,
        "qty_in_boxes": 10,
        "qty_available": 120
      }
    ]
  }
}
```

---

## 5. FRONTEND ARCHITECTURE

### 5.1 Web Application (Next.js)

**Technology Stack:**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand or React Query
- **Forms:** React Hook Form
- **UI Components:** shadcn/ui or Headless UI

**Project Structure:**
```
my-pos-system/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Dashboard
│   │   ├── products/
│   │   │   ├── page.tsx      # Product list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx  # Product details
│   │   │   └── new/
│   │   │       └── page.tsx  # Create product
│   │   ├── sales/
│   │   │   ├── page.tsx      # Sales list
│   │   │   ├── pos/
│   │   │   │   └── page.tsx  # POS interface
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Sale details
│   │   ├── purchases/
│   │   ├── inventory/
│   │   └── reports/
│   └── api/                  # API routes (if needed)
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── products/
│   ├── sales/
│   └── common/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── api/
│   │   └── client.ts          # API client
│   └── utils/
│       └── unit-converter.ts # Unit conversion logic
├── hooks/
│   ├── use-products.ts
│   ├── use-sales.ts
│   └── use-stock.ts
└── types/
    ├── product.ts
    ├── transaction.ts
    └── unit.ts
```

### 5.2 Mobile Application (React Native)

**Technology Stack:**
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **State Management:** Zustand
- **Offline Storage:** AsyncStorage + SQLite (via expo-sqlite)
- **Sync:** Custom sync service
- **UI:** React Native Paper or NativeBase

**Project Structure:**
```
pos-mobile/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── POS/
│   │   │   ├── POSScreen.tsx
│   │   │   ├── ProductSelector.tsx
│   │   │   └── CartScreen.tsx
│   │   ├── Products/
│   │   │   ├── ProductListScreen.tsx
│   │   │   └── ProductDetailScreen.tsx
│   │   ├── Sales/
│   │   │   └── SalesListScreen.tsx
│   │   └── Inventory/
│   │       └── StockScreen.tsx
│   ├── components/
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   └── UnitSelector.tsx
│   ├── services/
│   │   ├── api.ts             # API client
│   │   ├── sync.ts            # Sync service
│   │   └── offline.ts          # Offline storage
│   ├── hooks/
│   │   ├── useProducts.ts
│   │   ├── useCart.ts
│   │   └── useSync.ts
│   └── utils/
│       ├── unit-converter.ts
│       └── currency.ts
├── App.tsx
└── package.json
```

### 5.3 Shared Code

Create a shared package for business logic:
```
shared-pos/
├── src/
│   ├── unit-converter.ts      # Unit conversion logic
│   ├── pricing.ts             # Pricing calculations
│   ├── stock-calculator.ts    # Stock calculations
│   └── types/
│       ├── product.ts
│       └── transaction.ts
```

---

## 6. UNIT CONVERSION LOGIC (BOX/PIECES)

### 6.1 Core Algorithm

```typescript
// lib/utils/unit-converter.ts

interface Unit {
  id: number;
  actual_name: string;
  short_name: string;
  base_unit_id: number | null;
  base_unit_multiplier: number | null;
}

/**
 * Get multiplier to convert from unit1 to unit2
 * @param unit1 Source unit
 * @param unit2 Target unit
 * @returns Multiplier (e.g., 12 means 1 unit1 = 12 unit2)
 */
export function getUnitMultiplier(
  unit1: Unit,
  unit2: Unit
): number {
  // Same unit
  if (unit1.id === unit2.id) {
    return 1;
  }

  // If unit1 is a sub-unit of unit2
  if (unit1.base_unit_id === unit2.id) {
    return unit1.base_unit_multiplier || 1;
  }

  // If unit2 is a sub-unit of unit1
  if (unit2.base_unit_id === unit1.id) {
    return 1 / (unit2.base_unit_multiplier || 1);
  }

  // Both are sub-units, find common base
  const baseUnit1 = findBaseUnit(unit1);
  const baseUnit2 = findBaseUnit(unit2);

  if (baseUnit1.id === baseUnit2.id) {
    const toBase1 = convertToBase(unit1);
    const toBase2 = convertToBase(unit2);
    return toBase1 / toBase2;
  }

  throw new Error('Units are not compatible');
}

/**
 * Convert quantity from one unit to another
 */
export function convertQuantity(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  const multiplier = getUnitMultiplier(fromUnit, toUnit);
  return quantity * multiplier;
}

/**
 * Find the base unit in a unit chain
 */
function findBaseUnit(unit: Unit): Unit {
  if (!unit.base_unit_id) {
    return unit;
  }
  // Recursively find base (would need unit lookup)
  return unit;
}

/**
 * Get quantity in base unit
 */
function convertToBase(unit: Unit): number {
  if (!unit.base_unit_id) {
    return 1;
  }
  return unit.base_unit_multiplier || 1;
}
```

### 6.2 Stock Calculation

```typescript
// lib/utils/stock-calculator.ts

interface StockInfo {
  qty_available: number;  // Always in base unit (Pieces)
  base_unit: Unit;
  secondary_unit?: Unit;
}

/**
 * Get stock display in both units
 */
export function getStockDisplay(stock: StockInfo) {
  const baseQty = stock.qty_available;
  const baseUnit = stock.base_unit;
  
  const result = {
    base: {
      quantity: baseQty,
      unit: baseUnit
    }
  };

  if (stock.secondary_unit) {
    const multiplier = getUnitMultiplier(stock.secondary_unit, baseUnit);
    result.secondary = {
      quantity: baseQty / multiplier,
      unit: stock.secondary_unit
    };
  }

  return result;
}

/**
 * Calculate stock after sale
 */
export function calculateStockAfterSale(
  currentStock: number,  // In base unit
  saleQuantity: number,  // In any unit
  saleUnit: Unit,
  baseUnit: Unit
): number {
  const saleQuantityInBase = convertQuantity(
    saleQuantity,
    saleUnit,
    baseUnit
  );
  
  return currentStock - saleQuantityInBase;
}
```

### 6.3 API Integration

```typescript
// hooks/use-stock.ts

export function useStock(variationId: number, locationId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock', variationId, locationId],
    queryFn: async () => {
      const response = await api.get(
        `/variations/${variationId}/stock?location_id=${locationId}`
      );
      return response.data;
    }
  });

  const stockDisplay = useMemo(() => {
    if (!data) return null;
    return getStockDisplay(data);
  }, [data]);

  return { stock: data, stockDisplay, isLoading };
}
```

---

## 7. AUTOMATION-READY DESIGN

### 7.1 WhatsApp Integration Architecture

**Technology:**
- **WhatsApp Business API** (via Twilio, MessageBird, or official API)
- **Webhook System** for incoming messages
- **Template Messages** for notifications

**Integration Points:**

1. **Invoice Sending**
   - After sale completion, send invoice PDF via WhatsApp
   - Template: "Your invoice #INV-001 is ready. Total: $500"

2. **Stock Alerts**
   - When stock falls below alert_quantity
   - Template: "Alert: Product XYZ is low on stock (5 units remaining)"

3. **Order Notifications**
   - Notify customer when order is ready
   - Template: "Your order #ORD-001 is ready for pickup"

4. **Payment Reminders**
   - For outstanding invoices
   - Template: "Reminder: Invoice #INV-001 is due. Amount: $500"

### 7.2 Database Schema for Automation

```sql
-- Notification templates
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'invoice', 'stock_alert', 'order_ready'
    whatsapp_template_id VARCHAR(255) NULL,  -- WhatsApp template ID
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification queue
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Automation rules
CREATE TABLE automation_rules (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,  -- 'stock_low', 'sale_complete', 'payment_due'
    conditions JSONB NOT NULL,  -- Flexible conditions
    actions JSONB NOT NULL,  -- Actions to take
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.3 Automation Service

```typescript
// services/automation.ts

export class AutomationService {
  /**
   * Trigger automation after sale
   */
  async onSaleComplete(transactionId: number) {
    const transaction = await getTransaction(transactionId);
    const business = await getBusiness(transaction.business_id);
    
    // Check automation rules
    const rules = await getActiveRules(
      business.id,
      'sale_complete'
    );

    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions, transaction)) {
        await this.executeActions(rule.actions, transaction);
      }
    }
  }

  /**
   * Send invoice via WhatsApp
   */
  async sendInvoiceWhatsApp(transactionId: number) {
    const transaction = await getTransaction(transactionId);
    const contact = await getContact(transaction.contact_id);
    
    if (!contact.phone) return;

    const invoicePdf = await generateInvoicePdf(transaction);
    const template = await getNotificationTemplate(
      transaction.business_id,
      'invoice'
    );

    const message = this.renderTemplate(
      template.message_template,
      {
        invoice_no: transaction.invoice_no,
        total: transaction.final_total,
        date: transaction.transaction_date
      }
    );

    await whatsappService.sendMessage({
      to: contact.phone,
      message: message,
      attachment: invoicePdf
    });
  }

  /**
   * Check stock alerts
   */
  async checkStockAlerts(businessId: number) {
    const lowStockItems = await getLowStockItems(businessId);
    
    for (const item of lowStockItems) {
      await this.sendStockAlert(item);
    }
  }
}
```

### 7.4 Webhook Endpoints

```typescript
// app/api/webhooks/whatsapp/route.ts

export async function POST(request: Request) {
  const body = await request.json();
  
  // Verify webhook signature
  if (!verifyWhatsAppWebhook(body)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Handle incoming message
  if (body.type === 'message') {
    await handleIncomingMessage(body);
  }

  return new Response('OK', { status: 200 });
}

async function handleIncomingMessage(message: any) {
  // Process commands like "STOCK", "INVOICE #123", etc.
  const command = parseCommand(message.text);
  
  switch (command.type) {
    case 'STOCK':
      await sendStockInfo(message.from, command.productId);
      break;
    case 'INVOICE':
      await sendInvoice(message.from, command.invoiceNo);
      break;
  }
}
```

---

## 8. IMPLEMENTATION PHASES

### Phase 1: Foundation (Weeks 1-2)

**Goals:**
- Set up Supabase project
- Migrate core database schema
- Set up authentication
- Create basic API structure

**Tasks:**
1. ✅ Create Supabase project
2. ✅ Run database migrations
3. ✅ Set up Supabase Auth
4. ✅ Create Express.js API structure
5. ✅ Implement authentication middleware
6. ✅ Create API client library

**Deliverables:**
- Database schema in Supabase
- Working authentication API
- Basic API structure

### Phase 2: Product Module (Weeks 3-4)

**Goals:**
- Complete product CRUD operations
- Implement unit conversion logic
- Add retail/wholesale pricing
- Stock management per location

**Tasks:**
1. Product CRUD API endpoints
2. Unit conversion service
3. Variation management
4. Stock calculation logic
5. Product search and filtering

**Deliverables:**
- Complete product API
- Unit conversion working correctly
- Stock calculations accurate

### Phase 3: Sales Module (Weeks 5-6)

**Goals:**
- POS functionality
- Sales transactions
- Customer management
- Invoice generation

**Tasks:**
1. Sales transaction API
2. Customer type handling (retail/wholesale)
3. Price selection logic
4. Stock deduction on sale
5. Invoice generation

**Deliverables:**
- Working POS API
- Sales transactions complete
- Stock auto-updates on sale

### Phase 4: Purchase & Inventory (Weeks 7-8)

**Goals:**
- Purchase management
- Stock adjustments
- Multi-location support
- Stock transfers

**Tasks:**
1. Purchase API endpoints
2. Stock adjustment API
3. Stock transfer between locations
4. Opening stock management

**Deliverables:**
- Complete inventory management
- Multi-location support

### Phase 5: Frontend Web (Weeks 9-10)

**Goals:**
- Next.js dashboard
- Product management UI
- POS interface
- Reports

**Tasks:**
1. Set up Next.js project
2. Create dashboard layout
3. Product list and detail pages
4. POS interface
5. Sales list and detail pages
6. Basic reports

**Deliverables:**
- Working web application
- All core features accessible via UI

### Phase 6: Mobile App (Weeks 11-12)

**Goals:**
- React Native POS app
- Offline support
- Sync mechanism

**Tasks:**
1. Set up React Native project
2. Create POS screen
3. Offline storage setup
4. Sync service
5. Product selection UI
6. Cart and checkout

**Deliverables:**
- Working mobile POS app
- Offline functionality
- Sync working

### Phase 7: Automation (Weeks 13-14)

**Goals:**
- WhatsApp integration
- Notification system
- Invoice automation

**Tasks:**
1. WhatsApp API integration
2. Notification service
3. Template management
4. Automation rules engine
5. Webhook setup

**Deliverables:**
- WhatsApp notifications working
- Automation rules configurable
- Invoice sending automated

---

## 9. CRITICAL CONSIDERATIONS

### 9.1 Data Migration

**Strategy:**
1. Export data from Laravel system
2. Transform data to match new schema
3. Import into Supabase
4. Validate data integrity
5. Run parallel systems during transition

### 9.2 Performance Optimization

1. **Database:**
   - Proper indexing
   - Query optimization
   - Connection pooling

2. **API:**
   - Response caching
   - Pagination
   - Rate limiting

3. **Frontend:**
   - Code splitting
   - Image optimization
   - Lazy loading

### 9.3 Security

1. **Authentication:**
   - JWT tokens
   - Refresh tokens
   - Role-based access control

2. **Data:**
   - Row Level Security (RLS) in Supabase
   - Input validation
   - SQL injection prevention

3. **API:**
   - Rate limiting
   - CORS configuration
   - API key management

### 9.4 Testing Strategy

1. **Unit Tests:** Business logic functions
2. **Integration Tests:** API endpoints
3. **E2E Tests:** Critical user flows
4. **Performance Tests:** Load testing

---

## 10. SUCCESS METRICS

1. **Performance:**
   - API response time < 200ms (p95)
   - Page load time < 2s
   - Mobile app startup < 1s

2. **Reliability:**
   - 99.9% uptime
   - Zero data loss
   - Accurate stock calculations

3. **User Experience:**
   - POS transaction < 5 seconds
   - Offline mode fully functional
   - WhatsApp notifications < 30 seconds

---

## 11. RISK MITIGATION

1. **Data Loss:**
   - Regular backups
   - Migration validation scripts
   - Rollback plan

2. **Performance Issues:**
   - Load testing before launch
   - Monitoring and alerting
   - Auto-scaling setup

3. **Integration Failures:**
   - Fallback mechanisms
   - Error handling
   - Retry logic

---

## CONCLUSION

This migration plan provides a comprehensive roadmap for transitioning from Laravel to a modern Node.js architecture while preserving all business logic and improving performance. The phased approach ensures minimal disruption and allows for iterative improvements.

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Author:** System Architecture Team

