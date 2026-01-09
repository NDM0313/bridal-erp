# Complete Technical Documentation
## ERP + POS System

**Version**: 2.0  
**Last Updated**: January 8, 2026  
**Status**: Active Development (Production-Ready Core)  
**Stack**: Next.js 16.1.1 (App Router) + React + TypeScript + Supabase + Express.js

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Current Architecture](#2-current-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Modules Breakdown](#4-modules-breakdown)
5. [Data Flow](#5-data-flow)
6. [Mobile App Readiness](#6-mobile-app-readiness)
7. [Scalability & Future Phases](#7-scalability--future-phases)
8. [Technical Risks & Notes](#8-technical-risks--notes)

---

## 1. System Overview

### What the System Does

This is a production-level, multi-branch ERP and POS system designed for textile/fashion retail businesses operating multiple outlets. The system handles:

- **Point of Sale (POS)**: Fast billing, payment processing, receipt generation
- **Sales Management**: Direct sales, sales orders, returns, multi-location support
- **Purchase Management**: Purchase orders, receipts, supplier management
- **Inventory Management**: Branch-specific stock tracking, transfers, adjustments
- **Financial Accounting**: Ledgers, profit/loss, expense tracking, account management
- **Custom Studio/Production**: Bespoke order workflow from fabric sale to delivery
- **Rental Management**: Dress/jewelry rentals, bookings, returns, late fees
- **Reporting**: Sales, inventory, financial reports with branch filtering

### Business Domains Covered

#### 1. Sales Domain
- POS billing with product search, variations, packing details
- Customer management (retail/wholesale)
- Salesman assignment and commission tracking
- Payment tracking (paid, partial, pending)
- Invoice generation
- Sales returns

#### 2. Accounting Domain
- Financial accounts (bank, cash, wallet, credit card, loan)
- Account transactions (debit/credit entries)
- Fund transfers between accounts
- Expense tracking with categories
- Ledger reports
- Profit & loss statements (planned)

#### 3. Studio/Production Domain
- Custom order creation (bridal wear, made-to-order)
- Production workflow: Cutting → Dyeing → Stitching → Handwork → Ready
- Vendor management (dyers, tailors, embroiderers)
- Measurement recording (JSONB format)
- Production step tracking with costs
- Material consumption tracking
- Deadline management

#### 4. Job/Workflow Domain
- Production order status transitions
- Vendor assignment per step
- Step-level cost tracking
- Material usage per order
- Quality check workflow
- Delivery/dispatch tracking

---

## 2. Current Architecture

### Backend Structure

#### Framework & Layers

**Primary Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth (JWT-based)
- **Storage**: Supabase Storage (file uploads)
- **Real-time**: Supabase Realtime (not currently used)

**Secondary Backend**: Express.js (Node.js)
- **Location**: `backend/` directory
- **Purpose**: RESTful API for complex business logic
- **Port**: 3001 (default)
- **Authentication**: JWT verification via Supabase Auth

**Architecture Pattern**: Hybrid (Supabase + Express)
- Simple CRUD operations: Direct Supabase client calls from frontend
- Complex operations: Express.js API endpoints
- Authentication: Supabase Auth (single source of truth)

#### Backend Layers

```
┌─────────────────────────────────────┐
│   Frontend (Next.js)                │
│   - Direct Supabase calls           │
│   - Express API calls                │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────┐
│  Supabase   │  │  Express.js     │
│  - Auth     │  │  - Routes       │
│  - Database │  │  - Services     │
│  - Storage  │  │  - Middleware   │
└─────────────┘  └─────────────────┘
       │                │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │  PostgreSQL   │
       │  (Supabase)   │
       └───────────────┘
```

#### Express.js Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client (service role)
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── requestContext.js    # Business context attachment
│   │   ├── errorHandler.js      # Error handling
│   │   ├── auditLogger.js       # Audit logging
│   │   ├── featureGuard.js      # Feature flag checks
│   │   └── subscriptionGuard.js # Subscription checks
│   ├── routes/
│   │   ├── products.js          # Product CRUD
│   │   ├── sales.js              # Sales operations
│   │   ├── purchases.js          # Purchase operations
│   │   ├── production.js         # Production orders
│   │   ├── rentals.js            # Rental bookings
│   │   ├── accounting.js         # Financial accounts
│   │   ├── adjustments.js        # Stock adjustments
│   │   ├── transfers.js          # Stock transfers
│   │   ├── reports.js            # Reporting endpoints
│   │   ├── whatsapp.js           # WhatsApp automation
│   │   └── automation.js         # Automation rules
│   ├── services/
│   │   ├── productService.js     # Product business logic
│   │   ├── saleService.js        # Sale business logic
│   │   ├── purchaseService.js   # Purchase business logic
│   │   ├── productionService.js  # Production order logic
│   │   ├── rentalService.js     # Rental booking logic
│   │   ├── accountingService.js # Financial account logic
│   │   └── stockService.js      # Stock movement logic
│   └── server.js                 # Express app setup
└── database/
    └── user_profiles_setup.sql   # User profiles schema
```

### Database Design Overview

#### Core Tables

**Multi-Tenancy**:
- `businesses`: Business entities
- `business_locations`: Branches/locations per business
- `user_profiles`: User-business mapping with roles

**Products & Inventory**:
- `products`: Product master data
- `product_variations`: Product variations (size, color)
- `variations`: Variation details with pricing
- `variation_location_details`: Branch-specific stock
- `units`: Measurement units (base + secondary)
- `categories`, `brands`: Product classification

**Sales & Transactions**:
- `transactions`: Main transaction table (sell/purchase)
- `transaction_sell_lines`: Sale line items
- `transaction_purchase_lines`: Purchase line items
- `contacts`: Customers and suppliers

**Production**:
- `production_orders`: Custom order master
- `production_steps`: Production workflow steps
- `production_materials`: Material consumption

**Rentals**:
- `rental_bookings`: Rental bookings with date ranges
- `rental_booking_conflicts`: View for conflict detection

**Accounting**:
- `financial_accounts`: Bank, cash, wallet accounts
- `account_transactions`: Debit/credit entries
- `fund_transfers`: Inter-account transfers
- `expense_categories`: Expense classification

**System**:
- `system_settings`: Feature flags and business settings
- `audit_logs`: Audit trail
- `notifications`: Notification queue
- `automation_rules`: Automation configuration

#### Key Relationships

```
businesses (1) ──< (N) business_locations
businesses (1) ──< (N) user_profiles
businesses (1) ──< (N) products
businesses (1) ──< (N) transactions
businesses (1) ──< (N) production_orders
businesses (1) ──< (N) rental_bookings

products (1) ──< (N) variations
products (1) ──< (N) production_materials
variations (1) ──< (N) variation_location_details

transactions (1) ──< (N) transaction_sell_lines
transactions (1) ──< (N) transaction_purchase_lines

production_orders (1) ──< (N) production_steps
production_orders (1) ──< (N) production_materials

contacts (1) ──< (N) transactions (customer_id)
contacts (1) ──< (N) production_orders (customer_id)
contacts (1) ──< (N) production_steps (vendor_id)

financial_accounts (1) ──< (N) account_transactions
```

### API Structure

#### Supabase Client (Direct Calls)

**Location**: Frontend components use `@/utils/supabase/client`

**Usage Pattern**:
```typescript
import { supabase } from '@/utils/supabase/client';

// Query
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('business_id', businessId)
  .eq('location_id', locationId);

// Insert
const { data, error } = await supabase
  .from('transactions')
  .insert({ ... })
  .select()
  .single();
```

**RLS Enforcement**: All queries automatically filtered by `business_id` via RLS policies

#### Express.js API Endpoints

**Base URL**: `http://localhost:3001/api/v1` (development)

**Authentication**: Bearer token in `Authorization` header
```
Authorization: Bearer <supabase-jwt-token>
```

**Available Routes**:

**Products**:
- `GET /api/v1/products` - List products (pagination)
- `GET /api/v1/products/search?q=term` - Search products
- `GET /api/v1/products/:id` - Get product by ID
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product (soft)

**Sales**:
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales` - List sales (filters: branch, date range)
- `GET /api/v1/sales/:id` - Get sale details
- `PATCH /api/v1/sales/:id` - Update sale
- `DELETE /api/v1/sales/:id` - Delete sale

**Purchases**:
- `POST /api/v1/purchases` - Create purchase
- `GET /api/v1/purchases` - List purchases
- `GET /api/v1/purchases/:id` - Get purchase details

**Production**:
- `POST /api/v1/production` - Create production order
- `GET /api/v1/production` - List production orders
- `GET /api/v1/production/:id` - Get order details
- `PATCH /api/v1/production/:id/status` - Update order status
- `PATCH /api/v1/production/:id` - Update order

**Rentals**:
- `POST /api/v1/rentals` - Create rental booking
- `GET /api/v1/rentals` - List bookings
- `GET /api/v1/rentals/:id` - Get booking details
- `PATCH /api/v1/rentals/:id/return` - Mark as returned

**Accounting**:
- `GET /api/v1/accounting/accounts` - List financial accounts
- `POST /api/v1/accounting/accounts` - Create account
- `GET /api/v1/accounting/accounts/:id/ledger` - Account ledger
- `POST /api/v1/accounting/transfers` - Fund transfer

**Stock**:
- `POST /api/v1/adjustments` - Stock adjustment
- `POST /api/v1/transfers` - Stock transfer

**Reports**:
- `GET /api/v1/reports/sales` - Sales report
- `GET /api/v1/reports/inventory` - Inventory report

**WhatsApp**:
- `POST /api/v1/whatsapp/send` - Send WhatsApp message
- `GET /api/v1/whatsapp/templates` - List templates

### Authentication & Authorization Approach

#### Authentication

**Provider**: Supabase Auth
- **Method**: Email/password
- **Token**: JWT (stored in browser)
- **Session**: Managed by Supabase client
- **Refresh**: Automatic token refresh

**Flow**:
1. User logs in via `supabase.auth.signInWithPassword()`
2. Supabase returns JWT token
3. Token stored in browser (Supabase client handles)
4. Token sent in `Authorization` header for API calls
5. Express middleware verifies token with Supabase

#### Authorization

**Role-Based Access Control (RBAC)**:

**Roles Defined**:
- `admin`: Full system access
- `manager`: Branch-level management, reporting
- `cashier`: POS operations only
- `auditor`: Read-only access
- `salesman`: Sales entry, customer management (with commission tracking)

**Permission Storage**:
- Roles stored in `user_profiles.role` column
- Permissions defined in `lib/types/roles.ts`
- Frontend: `RoleGuard` component for UI protection
- Backend: Middleware checks role before allowing operations

**RLS Policies**:
- Database-level enforcement via PostgreSQL RLS
- All tables filtered by `business_id`
- Users can only access their business data
- Admin policies allow full access within business

**Implementation**:
```typescript
// Frontend
<RoleGuard permission="canCreateProducts">
  <Button>New Product</Button>
</RoleGuard>

// Backend (Express)
router.post('/products',
  authenticateUser,
  requirePermission('canCreateProducts'),
  createProduct
);
```

---

## 3. User Roles & Permissions

### Accounting User

**Role**: `auditor` (read-only) or `manager` (with write access)

**Permissions**:
- View financial accounts
- View account transactions
- View ledger reports
- Create/update accounts (manager only)
- Create fund transfers (manager only)
- View expense reports

**Access Points**:
- `/dashboard/finance` - Finance dashboard
- `/dashboard/finance/accounts` - Account management
- `/dashboard/finance/accounts/:id/ledger` - Account ledger
- `/dashboard/finance/reports` - Financial reports

### Sales User

**Role**: `salesman` or `cashier`

**Permissions**:
- Create sales (POS)
- View sales history
- Manage customers
- View products (read-only)
- View basic reports
- Commission tracking (salesman only)

**Access Points**:
- `/pos` - Point of Sale interface
- `/dashboard/sales` - Sales list
- `/dashboard/contacts` - Customer management

**Salesman-Specific**:
- Commission percentage tracked in `user_profiles.commission_percentage`
- Commission ledger in `/users/ledger/:id`
- Base salary in `user_profiles.base_salary`

### Studio / Production User

**Role**: `manager` or `admin`

**Permissions**:
- Create production orders
- Update order status
- Assign vendors
- View production pipeline
- Manage vendors
- View measurements

**Access Points**:
- `/dashboard/studio` - Production pipeline (Kanban board)
- `/dashboard/vendors` - Vendor management

**Workflow Access**:
- Create custom order
- Move orders between stages (Cutting → Dyeing → Stitching → Ready)
- Assign vendors to production steps
- Record measurements

### Job / Worker User

**Role**: Not explicitly defined (currently uses `manager` or vendor assignment)

**Future Enhancement**:
- Dedicated worker role for production steps
- Mobile app access for status updates
- Step-level permissions (can only update assigned steps)

**Current Implementation**:
- Vendors assigned to production steps
- Vendor contact info stored in `contacts` table
- Vendor role extracted from `contacts.address_line_1` (temporary)

### Admin

**Role**: `admin`

**Permissions**:
- Full system access
- User management
- Business settings
- Branch management
- All reports (including advanced)
- Audit logs
- Feature flag management

**Access Points**:
- All routes accessible
- `/settings` - System settings
- `/settings/branches` - Branch management
- `/users` - User management

### How Role-Based Access is Implemented

#### Frontend

**Component**: `components/auth/RoleGuard.tsx`

```typescript
<RoleGuard permission="canCreateProducts">
  <Button>New Product</Button>
</RoleGuard>

<AdminOnly>
  <Button>Delete Product</Button>
</AdminOnly>
```

**Hook**: `lib/hooks/useRole.ts`
```typescript
const { hasPermission, isAdmin } = useRole();
if (hasPermission('canCreateProducts')) { ... }
```

#### Backend

**Middleware**: `backend/src/middleware/auth.js`
```javascript
// Verifies JWT token
// Extracts user_id and business_id
// Attaches to request context
```

**Permission Check**: `backend/src/middleware/featureGuard.js`
```javascript
// Checks user role
// Validates permission
// Blocks unauthorized access
```

#### Database

**RLS Policies**: All tables have RLS enabled
```sql
CREATE POLICY "Users can only see their business data"
ON products
FOR SELECT
USING (business_id = get_user_business_id());
```

---

## 4. Modules Breakdown

### Sales Module

**Status**: Production-ready

**Components**:
- `components/sales/AddSaleModal.tsx` - Sale entry form
- `components/dashboard/ModernPOS.tsx` - POS interface
- `app/dashboard/sales/page.tsx` - Sales list

**Features**:
- Product search with auto-complete
- Variation support (size, color)
- Packing details (boxes, pieces, meters)
- Customer selection (existing or quick-add)
- Salesman assignment
- Payment tracking (paid, partial, pending)
- Invoice generation
- Branch auto-attachment (from context)

**Data Flow**:
1. User selects branch (global header)
2. Opens POS or Add Sale modal
3. Searches/selects products
4. Enters quantities, prices, discounts
5. Selects customer and payment method
6. Saves sale → Creates `transaction` record
7. Creates `transaction_sell_lines` for each item
8. Updates stock in `variation_location_details`
9. Creates `account_transactions` for payment

**Database Tables**:
- `transactions` (type: 'sell')
- `transaction_sell_lines`
- `variation_location_details` (stock update)
- `account_transactions` (payment entry)

### Accounting Module

**Status**: 70% complete

**Components**:
- `components/finance/AccountModal.tsx` - Account creation
- `components/finance/TransactionModal.tsx` - Transaction entry
- `app/dashboard/finance/page.tsx` - Finance dashboard
- `app/dashboard/finance/accounts/:id/ledger/page.tsx` - Account ledger

**Features**:
- Financial account management (bank, cash, wallet, etc.)
- Account transactions (debit/credit)
- Fund transfers between accounts
- Account ledger view
- Expense tracking with categories

**Planned**:
- Journal entries
- Profit & loss statement
- Balance sheet
- Advanced financial reports

**Database Tables**:
- `financial_accounts`
- `account_transactions`
- `fund_transfers`
- `expense_categories`

### Studio / Production Module

**Status**: Production-ready

**Components**:
- `components/studio/CreateOrderModal.tsx` - Order creation
- `components/studio/ProductionOrderCard.tsx` - Order card
- `components/studio/ProductionOrderDetailsModal.tsx` - Order details
- `app/dashboard/studio/page.tsx` - Kanban board

**Features**:
- Custom order creation
- Kanban board (Cutting → Dyeing → Stitching → Ready)
- Status transitions
- Vendor assignment
- Measurement recording (JSONB)
- Production step tracking
- Material consumption tracking
- Deadline management

**Workflow**:
1. Create production order (with customer, measurements)
2. Add production steps (Dyeing, Stitching, Handwork, etc.)
3. Assign vendors to steps
4. Move order through stages
5. Track material consumption
6. Mark as completed/dispatched

**Database Tables**:
- `production_orders`
- `production_steps`
- `production_materials`

### Job / Workflow Handling

**Status**: Production-ready

**Implementation**:
- Production steps tracked in `production_steps` table
- Each step has: name, vendor, cost, status, timestamps
- Status transitions: `pending` → `in_progress` → `completed`
- Vendor assignment per step
- Step-level cost tracking

**API Endpoints**:
- `POST /api/v1/production` - Create order with steps
- `PATCH /api/v1/production/:id/status` - Update order status
- `PATCH /api/v1/production/:id` - Update order (including steps)

**Future Enhancement**:
- Worker mobile app for step updates
- Real-time status notifications
- Step-level permissions

### How Modules Interact

#### Sales → Production Flow

1. **Sale Created**: Customer purchases fabric/material
2. **Production Order Created**: If custom order, create `production_order`
3. **Material Consumption**: `production_materials` linked to `products`
4. **Stock Update**: Material consumption reduces stock
5. **Completion**: Production order marked as `completed`
6. **Delivery**: Order dispatched, customer notified

#### Sales → Accounting Flow

1. **Sale Created**: `transaction` record created
2. **Payment Received**: `account_transactions` created (credit to cash/bank)
3. **Customer Balance**: Updated in `contacts.balance`
4. **Ledger Entry**: Account ledger updated

#### Production → Accounting Flow

1. **Vendor Payment**: Production step completed
2. **Vendor Ledger**: Updated in `contacts.balance` (payable)
3. **Account Transaction**: Debit from cash/bank account
4. **Cost Tracking**: `production_steps.cost` recorded

#### Rental → Accounting Flow

1. **Booking Created**: `rental_bookings` record
2. **Security Deposit**: `account_transactions` (credit to cash)
3. **Rental Fee**: Charged on pickup
4. **Late Fee**: Calculated on overdue return
5. **Refund**: Security deposit refunded on return

---

## 5. Data Flow

### From Sale → Studio → Dyer → Hand Work → Stitching → Completion

#### Complete Workflow

```
┌─────────────┐
│   Sale      │ Customer purchases fabric/material
│  (POS)      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Production  │ Create production_order
│   Order     │ - customer_id from sale
│  Created    │ - measurements recorded
│             │ - deadline_date set
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Cutting   │ status = 'new'
│   (Fabric)  │ - Material allocated
│             │ - production_materials created
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Dyeing    │ status = 'dyeing'
│             │ - production_step created (step_name: 'Dyeing')
│             │ - vendor_id assigned (dyer)
│             │ - cost recorded
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Hand Work  │ status = 'handwork' (optional)
│             │ - production_step created (step_name: 'Handwork')
│             │ - vendor_id assigned (embroiderer)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Stitching  │ status = 'stitching'
│             │ - production_step created (step_name: 'Stitching')
│             │ - vendor_id assigned (tailor)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Completed  │ status = 'completed'
│   (QC)      │ - All steps marked as 'completed'
│             │ - final_price calculated
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Dispatched  │ status = 'dispatched'
│  (Delivery) │ - actual_return_date set
│             │ - Customer notified
└─────────────┘
```

#### Quantity Tracking Approach

**Stock Levels**:
- Stock tracked in `variation_location_details` (branch-specific)
- Base unit used for inventory (e.g., "Pieces")
- Secondary unit for display (e.g., "Box" = 12 Pieces)

**Material Consumption**:
- `production_materials` table tracks material used per order
- `quantity_used` in base unit
- Stock automatically reduced when material consumed

**Sale Quantity**:
- Sale quantity in `transaction_sell_lines.quantity`
- Packing details in `packing_data` JSONB field
- Format: `{boxes: 2, pieces: 15, meters: 450}`

#### Status Transitions

**Production Order Status**:
```typescript
'new' → 'dyeing' → 'stitching' → 'handwork' → 'completed' → 'dispatched'
```

**Production Step Status**:
```typescript
'pending' → 'in_progress' → 'completed'
```

**Status Update API**:
```typescript
PATCH /api/v1/production/:id/status
Body: { status: 'next_status' }
```

**Validation**:
- Only valid transitions allowed
- Cannot skip stages
- Cannot go backwards (except admin override)

---

## 6. Mobile App Readiness

### Which Parts are Already API-Ready

#### Fully API-Ready

**Products**:
- `GET /api/v1/products` - List products
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product

**Sales**:
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales` - List sales (with filters)
- `GET /api/v1/sales/:id` - Get sale details

**Production**:
- `POST /api/v1/production` - Create production order
- `GET /api/v1/production` - List orders
- `PATCH /api/v1/production/:id/status` - Update status

**Rentals**:
- `POST /api/v1/rentals` - Create booking
- `GET /api/v1/rentals` - List bookings
- `PATCH /api/v1/rentals/:id/return` - Mark returned

**Accounting**:
- `GET /api/v1/accounting/accounts` - List accounts
- `POST /api/v1/accounting/accounts` - Create account
- `GET /api/v1/accounting/accounts/:id/ledger` - Account ledger

#### Partially API-Ready

**Stock Operations**:
- `POST /api/v1/adjustments` - Stock adjustment (exists)
- `POST /api/v1/transfers` - Stock transfer (exists)
- Missing: Real-time stock queries optimized for mobile

**Reports**:
- `GET /api/v1/reports/sales` - Sales report (exists)
- Missing: Mobile-optimized report formats (JSON instead of HTML)

### What Changes are Needed for Mobile Apps

#### Authentication

**Current**: Supabase Auth (JWT)
**Mobile Ready**: Yes, Supabase has React Native SDK

**Required Changes**:
- Use `@supabase/supabase-js` in React Native
- Store JWT in secure storage (not localStorage)
- Handle token refresh in background

#### API Response Format

**Current**: Some endpoints return HTML/rendered views
**Required**: All endpoints must return JSON

**Changes Needed**:
- Ensure all Express routes return JSON
- Add pagination to all list endpoints
- Add filtering/sorting parameters
- Standardize error response format

#### Real-Time Updates

**Current**: Polling-based (React Query refetch)
**Mobile Enhancement**: WebSocket/SSE for real-time updates

**Implementation**:
- Use Supabase Realtime subscriptions
- Or implement WebSocket server
- Or use Server-Sent Events (SSE)

#### Offline Support

**Current**: No offline support
**Mobile Requirement**: Offline-first architecture

**Implementation**:
- Use SQLite for local storage (React Native)
- Sync queue for offline operations
- Conflict resolution strategy
- Background sync when online

#### File Uploads

**Current**: Supabase Storage (web-optimized)
**Mobile Ready**: Yes, but needs mobile-specific handling

**Changes Needed**:
- Image compression before upload
- Progress tracking for large files
- Retry logic for failed uploads

### Recommended API Practices

#### 1. Consistent Response Format

```typescript
// Success Response
{
  success: true,
  data: { ... },
  meta?: { pagination, filters }
}

// Error Response
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable message',
    details?: { ... }
  }
}
```

#### 2. Pagination

All list endpoints should support:
```
GET /api/v1/products?page=1&per_page=20&sort=name&order=asc
```

Response:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### 3. Filtering

Standard filter parameters:
```
GET /api/v1/sales?branch_id=1&start_date=2026-01-01&end_date=2026-01-31&status=paid
```

#### 4. Versioning

Current: `/api/v1/...`
Future: `/api/v2/...` (when breaking changes)

#### 5. Rate Limiting

Implement rate limiting for mobile apps:
- Per-user limits
- Per-endpoint limits
- Throttling for high-frequency endpoints

---

## 7. Scalability & Future Phases

### How the Current System Supports Multiple Mobile Apps Per Role

#### Architecture Support

**Multi-App Ready**:
- Single backend API serves all apps
- Authentication via Supabase (shared across apps)
- Business isolation via RLS (data automatically filtered)
- Role-based permissions (same roles work across apps)

**Current Limitations**:
- No app-specific API keys
- No app-specific rate limiting
- No app-specific feature flags

**Recommended Enhancements**:
- Add `app_id` to API requests (identify which app)
- App-specific rate limits
- App-specific feature flags
- Analytics per app

#### Role-Specific Apps

**Salesman App**:
- Endpoints: `/api/v1/sales`, `/api/v1/products`, `/api/v1/contacts`
- Permissions: `canCreateSales`, `canViewProducts`, `canViewCustomers`
- Features: POS, customer search, product search

**Production Worker App**:
- Endpoints: `/api/v1/production`, `/api/v1/production/:id/status`
- Permissions: Step-level permissions (future)
- Features: View assigned steps, update step status

**Accounting App**:
- Endpoints: `/api/v1/accounting/*`
- Permissions: `canViewAccounts`, `canCreateTransactions`
- Features: Account ledger, fund transfers, reports

### Social Media Integration (WhatsApp, Facebook, Instagram)

#### Current Implementation

**WhatsApp Integration**:
- Endpoint: `POST /api/v1/whatsapp/send`
- Service: `backend/src/services/whatsappService.js`
- Features: Send messages, templates, notifications

**Database Tables**:
- `notification_templates`: Message templates
- `notifications`: Notification queue
- `automation_rules`: Automation configuration

**Current Capabilities**:
- Send WhatsApp messages (via API)
- Template-based messages
- Invoice sending
- Stock alerts
- Order notifications

#### Future Enhancements

**WhatsApp**:
- Two-way messaging (receive messages)
- Order placement via WhatsApp
- Payment reminders
- Delivery updates

**Facebook/Instagram**:
- Product catalog sync
- Order placement from social media
- Customer data sync
- Marketing automation

**Implementation Strategy**:
- Use webhook endpoints for incoming messages
- Queue system for outgoing messages
- Rate limiting per platform
- Retry logic for failed sends

### What Conventions Should be Followed to Avoid Future Refactoring

#### 1. API Design

**DO**:
- Use RESTful conventions
- Consistent naming (camelCase in JSON, snake_case in DB)
- Version all APIs (`/api/v1/...`)
- Document all endpoints
- Use standard HTTP status codes

**DON'T**:
- Mix REST and GraphQL
- Change API contracts without versioning
- Use inconsistent response formats
- Skip authentication on any endpoint

#### 2. Database Design

**DO**:
- Always include `business_id` in multi-tenant tables
- Use soft deletes (`deleted_at` timestamp)
- Add indexes on foreign keys
- Use JSONB for flexible schema (measurements, packing_data)
- Add `created_by` and `updated_by` for audit

**DON'T**:
- Hard delete records
- Skip RLS policies
- Use NULL for business_id
- Create tables without proper indexes

#### 3. Frontend Architecture

**DO**:
- Use React Query for server state
- Use Context for global UI state only
- Keep components under 500 lines
- Extract reusable logic to hooks
- Use TypeScript strictly

**DON'T**:
- Mix V1 and V2 patterns (complete migration)
- Use localStorage for sensitive data
- Skip error handling
- Create deeply nested components

#### 4. State Management

**DO**:
- Use React Query for server state
- Use Context for UI state (branch, modals)
- Use local state for form data
- Invalidate queries on mutations

**DON'T**:
- Store server data in Context
- Duplicate server state in local state
- Skip cache invalidation
- Use Redux for simple state

#### 5. Branch Management

**DO**:
- Always use `activeBranch` from context
- Validate branch before write operations
- Block "All Locations" for data entry
- Auto-attach branch to transactions

**DON'T**:
- Hardcode branch IDs
- Allow null branch in write operations
- Use default branch fallback
- Skip branch validation

---

## 8. Technical Risks & Notes

### Tight Coupling

#### 1. Frontend-Backend Coupling

**Risk**: Frontend directly calls Supabase (bypasses Express API)

**Impact**: 
- Business logic duplicated between frontend and backend
- Hard to enforce consistent validation
- Mobile apps need to duplicate logic

**Mitigation**:
- Gradually move complex operations to Express API
- Keep simple CRUD as direct Supabase calls
- Document which operations use which approach

#### 2. Branch Context Dependency

**Risk**: Many components depend on `BranchContextV2`

**Impact**:
- Changing branch system requires updating many files
- Hard to test components in isolation

**Mitigation**:
- Abstract branch logic into hooks
- Use dependency injection for testing
- Document branch dependency clearly

#### 3. Database Schema Coupling

**Risk**: Frontend components assume specific table structure

**Impact**:
- Schema changes break frontend
- Hard to evolve database

**Mitigation**:
- Use TypeScript types for database schema
- Version API responses
- Use database views for abstraction

### Missing Abstractions

#### 1. API Client Abstraction

**Current**: Direct Supabase calls and fetch() calls mixed

**Missing**: Unified API client

**Recommendation**:
```typescript
// lib/api/client.ts
export const api = {
  products: {
    list: (filters) => { ... },
    get: (id) => { ... },
    create: (data) => { ... }
  },
  sales: { ... },
  // ...
};
```

#### 2. Error Handling Abstraction

**Current**: Error handling inconsistent across components

**Missing**: Centralized error handling

**Recommendation**:
- Global error boundary (exists: `ErrorBoundary.tsx`)
- Standardized error format
- Error logging service
- User-friendly error messages

#### 3. Validation Abstraction

**Current**: Validation logic scattered

**Missing**: Centralized validation

**Recommendation**:
- Use Zod schemas for validation
- Share schemas between frontend and backend
- Validate at API boundary

#### 4. Business Logic Abstraction

**Current**: Business logic in components and services mixed

**Missing**: Clear separation

**Recommendation**:
- Move all business logic to services
- Components only handle UI
- Services handle data transformation

### Suggestions WITHOUT Rewriting the System

#### 1. Gradual API Migration

**Action**: Move complex operations to Express API one by one

**Priority**: High
**Effort**: Medium
**Impact**: Better mobile support, consistent validation

#### 2. Add API Client Abstraction

**Action**: Create unified API client wrapper

**Priority**: Medium
**Effort**: Low
**Impact**: Easier to maintain, consistent error handling

#### 3. Complete Branch Migration

**Action**: Remove V1 branch system, keep only V2

**Priority**: High
**Effort**: Low
**Impact**: Cleaner codebase, less confusion

#### 4. Add Comprehensive Type Definitions

**Action**: Ensure all database tables have TypeScript types

**Priority**: Medium
**Effort**: Medium
**Impact**: Better type safety, fewer bugs

#### 5. Implement Offline Support Strategy

**Action**: Plan offline-first architecture for mobile

**Priority**: Low (future)
**Effort**: High
**Impact**: Better mobile experience

#### 6. Add API Documentation

**Action**: Document all API endpoints (OpenAPI/Swagger)

**Priority**: Medium
**Effort**: Medium
**Impact**: Easier integration, better developer experience

#### 7. Standardize Error Responses

**Action**: Ensure all APIs return consistent error format

**Priority**: High
**Effort**: Low
**Impact**: Better error handling, easier debugging

#### 8. Add Request/Response Logging

**Action**: Log all API requests/responses (development only)

**Priority**: Low
**Effort**: Low
**Impact**: Easier debugging

---

## Appendix

### Key Files Reference

**Frontend**:
- `app/layout.tsx` - Root layout with providers
- `lib/context/BranchContextV2.tsx` - Branch state management
- `components/sales/AddSaleModal.tsx` - Sale entry
- `components/studio/ProductionOrderDetailsModal.tsx` - Production order details
- `lib/types/modern-erp.ts` - Type definitions

**Backend**:
- `backend/src/server.js` - Express app setup
- `backend/src/routes/production.js` - Production API routes
- `backend/src/services/productionService.js` - Production business logic
- `backend/src/middleware/auth.js` - Authentication middleware

**Database**:
- `database/MODERN_ERP_EXTENSION.sql` - Extended schema
- `database/RBAC_SETUP.sql` - Role-based access setup

### Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**Backend** (`.env`):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

**Document Version**: 2.0  
**Last Updated**: January 8, 2026  
**Maintained By**: Development Team  
**Review Frequency**: Monthly or after major changes
