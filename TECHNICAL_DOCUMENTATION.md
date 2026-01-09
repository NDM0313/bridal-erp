# ERP + POS System - Technical Documentation

**Version**: 1.0  
**Last Updated**: January 8, 2026  
**Status**: Active Development (Core Architecture Stable)  
**Stack**: Next.js 16.1.1 (App Router) + React + TypeScript + Supabase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [Branch Management System](#branch-management-system)
6. [Global State Management](#global-state-management)
7. [POS Features](#pos-features)
8. [ERP Features](#erp-features)
9. [Security & Access Control](#security--access-control)
10. [UI/UX Standards](#uiux-standards)
11. [Current Status](#current-status)
12. [Known Technical Decisions](#known-technical-decisions)
13. [Next Steps](#next-steps)

---

## Project Overview

### Purpose
A production-level, multi-branch ERP and POS system designed for textile/fashion retail businesses operating multiple outlets.

### Core Business Requirements
- **Multi-Branch Operations**: Support for multiple physical locations under one business entity
- **Real-Time Inventory**: Branch-specific stock tracking with transfer capabilities
- **POS Integration**: Fast billing, payment processing, and receipt generation
- **Financial Accounting**: Ledgers, profit/loss, expense tracking
- **Role-Based Access**: Different permission levels for Admin, Manager, Sales Staff, Cashier
- **Reporting**: Sales, inventory, and financial reports with branch filtering

### Design Philosophy
- **Branch-First**: Every transaction, inventory item, and user is linked to a specific branch
- **Context-Driven**: Global state managed via React Context (no Redux complexity)
- **Modular Architecture**: Each ERP module (Sales, Inventory, Users) is independent
- **Production-Safe**: All critical operations logged, verified, and error-handled
- **Progressive Enhancement**: V1/V2 pattern for major refactors (no breaking changes)

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.1 | App Router, SSR, Client Components |
| **React** | 19.x | UI framework |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Styling system |
| **Shadcn/UI** | Latest | Component library (Radix UI primitives) |
| **Lucide React** | Latest | Icon system |
| **React Query** | Latest | Server state management |
| **Sonner** | Latest | Toast notifications |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service (PostgreSQL + Auth + Storage) |
| **PostgreSQL** | Primary database |
| **Row Level Security (RLS)** | Data isolation and security |
| **Supabase Auth** | User authentication (JWT-based) |
| **Supabase Storage** | File uploads (avatars, receipts, documents) |

### Developer Tools
- **Turbopack**: Next.js build tool (faster than Webpack)
- **ESLint**: Code linting
- **TypeScript**: Compile-time error checking
- **Git**: Version control

---

## System Architecture

### Application Structure

```
my-pos-system/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (providers wrapped here)
│   ├── dashboard/                # Main dashboard
│   ├── products/                 # Product management
│   ├── sales/                    # Sales module
│   ├── purchases/                # Purchase orders
│   ├── contacts/                 # Customers/Suppliers
│   ├── reports/                  # Reporting module
│   ├── settings/                 # System settings
│   │   └── branches/             # Branch management
│   ├── users/                    # User management
│   └── test-branch/              # Branch selection test page (V2)
│
├── components/                   # React components
│   ├── layout/                   # Layout components (Header, Sidebar)
│   ├── header/                   # Header-specific (BranchSelector, UniversalSearch)
│   ├── sales/                    # Sales module components
│   ├── purchases/                # Purchase module components
│   ├── inventory/                # Inventory components (ProductSearchPortal)
│   ├── users/                    # User management (UserFormModal)
│   ├── modals/                   # Global modal handler
│   ├── ui/                       # Reusable UI components (Button, Dialog, etc.)
│   └── auth/                     # Auth guards (RoleGuard)
│
├── lib/                          # Core logic
│   ├── context/                  # React Context providers
│   │   ├── BranchContext.tsx     # Branch state (V1 - legacy)
│   │   ├── BranchContextV2.tsx   # Branch state (V2 - production)
│   │   ├── ModalContext.tsx      # Modal state
│   │   └── SettingsContext.tsx   # Global settings
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts            # Authentication hook
│   │   └── useRole.ts            # Role-based access hook
│   ├── config/                   # Configuration
│   │   └── demoConfig.ts         # Demo mode settings
│   └── utils/                    # Utility functions
│       └── formatters.ts         # Number/currency formatting
│
├── utils/                        # Utilities
│   └── supabase/                 # Supabase clients
│       ├── client.ts             # Client-side Supabase (enhanced with retry logic)
│       └── server.ts             # Server-side Supabase
│
├── database/                     # SQL migration scripts
│   ├── ADD_SALESMAN_COLUMNS.sql
│   ├── USER_PROFILES_ENHANCEMENT.sql
│   └── SALESMAN_LEDGER_MIGRATION.sql
│
└── public/                       # Static assets
```

### Context Provider Hierarchy

**Root Layout** (`app/layout.tsx`):
```tsx
<html>
  <body>
    <ThemeProvider>           {/* Dark mode */}
      <QueryProvider>         {/* React Query */}
        <BranchProvider>      {/* V1 - legacy support */}
          <BranchProviderV2>  {/* V2 - production */}
            <SettingsProvider>
              {children}      {/* Page content */}
            </SettingsProvider>
          </BranchProviderV2>
        </BranchProvider>
      </QueryProvider>
    </ThemeProvider>
  </body>
</html>
```

**Design Decision**: Both V1 and V2 providers active during migration to ensure zero downtime.

---

## Database Design

### Core Schema (Conceptual)

#### 1. Business & Multi-Tenancy
```sql
-- businesses table
id                INTEGER PRIMARY KEY
name              VARCHAR
email             VARCHAR
phone             VARCHAR
created_at        TIMESTAMP

-- business_locations (branches)
id                INTEGER PRIMARY KEY
business_id       INTEGER REFERENCES businesses(id)
name              VARCHAR              -- "Main Branch", "Downtown Outlet"
custom_field1     VARCHAR              -- Branch code (e.g., "MB-01")
landmark          VARCHAR              -- Location description
mobile            VARCHAR              -- Branch phone
city, state       VARCHAR
is_active         BOOLEAN
deleted_at        TIMESTAMP            -- Soft delete
```

#### 2. Users & Authentication
```sql
-- auth.users (Supabase managed)
id                UUID PRIMARY KEY
email             VARCHAR
created_at        TIMESTAMP

-- user_profiles (custom)
id                INTEGER PRIMARY KEY
user_id           UUID REFERENCES auth.users(id)
business_id       INTEGER REFERENCES businesses(id)
full_name         VARCHAR
role              VARCHAR              -- 'admin', 'manager', 'salesman', 'cashier'
status            VARCHAR              -- 'active', 'inactive'
base_salary       DECIMAL(10,2)        -- For salesmen
commission_percentage DECIMAL(5,2)     -- For salesmen
permissions       JSONB                -- Role-based permissions
created_at        TIMESTAMP
```

#### 3. Products & Inventory
```sql
-- products
id                INTEGER PRIMARY KEY
business_id       INTEGER REFERENCES businesses(id)
name              VARCHAR
sku               VARCHAR UNIQUE
category_id       INTEGER
price             DECIMAL(10,2)
cost              DECIMAL(10,2)
stock             DECIMAL(10,2)        -- Branch-aggregated or branch-specific
has_variations    BOOLEAN
created_at        TIMESTAMP

-- product_variations
id                INTEGER PRIMARY KEY
product_id        INTEGER REFERENCES products(id)
variation_name    VARCHAR              -- "Sky Blue", "Large"
sku               VARCHAR UNIQUE
price             DECIMAL(10,2)
stock             DECIMAL(10,2)

-- branch_inventory (branch-specific stock)
id                INTEGER PRIMARY KEY
branch_id         INTEGER REFERENCES business_locations(id)
product_id        INTEGER REFERENCES products(id)
variation_id      INTEGER              -- NULL if no variation
quantity          DECIMAL(10,2)
updated_at        TIMESTAMP
```

#### 4. Sales & Transactions
```sql
-- sales
id                INTEGER PRIMARY KEY
business_id       INTEGER REFERENCES businesses(id)
branch_id         INTEGER REFERENCES business_locations(id)
customer_id       INTEGER REFERENCES contacts(id)
salesman_id       INTEGER REFERENCES user_profiles(id)
invoice_number    VARCHAR UNIQUE
sale_date         DATE
subtotal          DECIMAL(10,2)
discount          DECIMAL(10,2)
tax               DECIMAL(10,2)
total             DECIMAL(10,2)
payment_status    VARCHAR              -- 'paid', 'partial', 'pending'
created_at        TIMESTAMP

-- sale_items
id                INTEGER PRIMARY KEY
sale_id           INTEGER REFERENCES sales(id)
product_id        INTEGER REFERENCES products(id)
variation_id      INTEGER
quantity          DECIMAL(10,2)
unit_price        DECIMAL(10,2)
discount          DECIMAL(10,2)
total             DECIMAL(10,2)
packing_data      JSONB                -- {boxes, pieces, meters}
```

#### 5. Contacts (Customers & Suppliers)
```sql
-- contacts
id                INTEGER PRIMARY KEY
business_id       INTEGER REFERENCES businesses(id)
type              VARCHAR              -- 'customer', 'supplier'
name              VARCHAR
phone             VARCHAR
email             VARCHAR
address           TEXT
balance           DECIMAL(10,2)        -- Running balance (receivable/payable)
created_at        TIMESTAMP
```

#### 6. Financial Ledgers
```sql
-- salesman_ledgers
id                INTEGER PRIMARY KEY
salesman_id       INTEGER REFERENCES user_profiles(id)
transaction_date  DATE
transaction_type  VARCHAR              -- 'commission', 'salary', 'advance'
debit             DECIMAL(10,2)
credit            DECIMAL(10,2)
balance           DECIMAL(10,2)
description       TEXT
created_at        TIMESTAMP
```

### Key Relationships
- **Business → Branches**: 1-to-many (one business has multiple branches)
- **Business → Users**: 1-to-many (users belong to a business)
- **Branch → Sales**: 1-to-many (sales happen at specific branches)
- **Branch → Inventory**: 1-to-many (each branch has its own stock)
- **User (Salesman) → Sales**: 1-to-many (salesman makes sales)
- **User (Salesman) → Ledger**: 1-to-many (salary/commission tracking)

### Data Isolation Strategy
- **Row-Level Security (RLS)**: Users can only see data for their `business_id`
- **Branch Filtering**: Active branch stored in localStorage, filters all queries
- **Soft Deletes**: `deleted_at` timestamp instead of hard deletes

---

## Branch Management System

### Business Context
In a multi-branch retail business:
- Each branch operates semi-independently
- Inventory is branch-specific (stock at Branch A ≠ stock at Branch B)
- Sales are recorded per branch
- Reports can be aggregated or branch-specific
- Users may work at specific branches or have access to all

### Requirements
1. **Global Branch Selection**: User selects active branch in header
2. **Persistent Selection**: Branch choice persists across page reloads
3. **Auto-Tagging**: New transactions auto-tagged with active branch
4. **Branch Filtering**: Dashboard shows data for active branch only
5. **Branch Switching**: Instant switch without data loss

### Technical Implementation

#### Architecture: V1 vs V2

| Feature | V1 (Legacy) | V2 (Production) |
|---------|-------------|-----------------|
| Write Points | 2 (useEffect + setActiveBranch) | 1 (switchBranch only) |
| localStorage Keys | `active_branch_id`, `active_branch` | `active_branch_id_v2`, `branches_cache_v2` |
| Reload Timing | 200ms setTimeout | Immediate |
| Verification | None | Verify write before reload |
| Logging | Minimal | Comprehensive with timestamps |

#### V2 Implementation (Production-Stable)

**File**: `lib/context/BranchContextV2.tsx`

**Key Features**:
1. **Single Write Point**: Only `switchBranch()` writes to localStorage
2. **Synchronous Operations**: Write → Verify → Reload (no async gaps)
3. **localStorage Verification**: Reads back value to confirm write succeeded
4. **Comprehensive Logging**: Timestamped logs for debugging
5. **Branch Caching**: Branches cached in localStorage for fast load

**Code Pattern**:
```typescript
const switchBranch = (branchId: number) => {
  const timestamp = Date.now();
  
  // 1. Write to localStorage
  localStorage.setItem('active_branch_id_v2', branchId.toString());
  
  // 2. Verify write
  const verify = localStorage.getItem('active_branch_id_v2');
  if (verify !== branchId.toString()) {
    alert('Failed to save branch selection');
    return;
  }
  
  // 3. Reload page immediately (no setTimeout)
  window.location.reload();
};
```

**Console Output** (Success):
```
[1704729600000] 🖱️ User clicked branch ID: 2
[1704729600001] 🔀 switchBranch: START (ID: 2)
[1704729600002] 📝 Switching to: Downtown Outlet (ID: 2)
[1704729600003] ✅ localStorage written: 2
[1704729600004] 🔍 localStorage verify read: 2
[1704729600005] ✅ localStorage write verified
[1704729600006] 🔄 Reloading page NOW...
```

#### Root Cause: Provider Mismatch

**Problem**: Branch selection appeared to work in isolation but failed in production.

**Diagnosis**:
- `BranchContextV2` was created with bulletproof logic ✅
- Test page (`/test-branch`) used `useBranchV2()` ✅
- **But**: `app/layout.tsx` still used `BranchProvider` (V1) ❌
- **Result**: V2 consumers couldn't find V2 provider → Context error

**Solution**: Wrap both providers during migration
```tsx
// app/layout.tsx
<BranchProvider>          {/* V1 - for legacy components */}
  <BranchProviderV2>      {/* V2 - for new components */}
    <SettingsProvider>
      {children}
    </SettingsProvider>
  </BranchProviderV2>
</BranchProvider>
```

**Migration Path**:
1. Phase 1: Both providers active (current state)
2. Phase 2: Migrate components one-by-one to V2
3. Phase 3: Remove V1 provider once all components use V2

#### Current Status: PRODUCTION-STABLE

**Test Page**: `/test-branch`
- Live localStorage monitoring
- Manual branch switching
- Debug actions (clear storage, reload, log state)
- Real-time state display

**Verification Checklist**:
- ✅ Branch selection persists after reload
- ✅ Hard refresh (Ctrl+F5) maintains selection
- ✅ localStorage contains correct branch ID
- ✅ Console logs show clear success/failure
- ✅ Works across all major browsers

**Known Issues**: None (V2 is stable)

---

## Global State Management

### Context Strategy

**Why Context (Not Redux)**:
- Simpler mental model
- Less boilerplate
- Built-in React feature
- Sufficient for ERP complexity
- Easy to debug

### Active Contexts

#### 1. BranchContext (V1 + V2)
**Purpose**: Manage active branch selection  
**Scope**: Global (entire app)  
**State**:
- `activeBranch`: Currently selected branch object
- `branches`: Array of all available branches
- `loading`: Initial load state

**Methods**:
- V1: `setActiveBranch(branch)` - Legacy method
- V2: `switchBranch(branchId)` - Production method

**Usage**:
```typescript
// V1 (Legacy)
import { useBranch } from '@/lib/context/BranchContext';
const { activeBranch, branches } = useBranch();

// V2 (Production)
import { useBranchV2 } from '@/lib/context/BranchContextV2';
const { activeBranch, branches, switchBranch } = useBranchV2();
```

#### 2. SettingsContext
**Purpose**: Global business settings  
**Scope**: Global  
**State**:
- Currency settings
- Tax configuration
- Date/time format
- Number format (decimal places)
- Feature flags

#### 3. ModalContext
**Purpose**: Manage modal dialogs  
**Scope**: Global  
**State**:
- Active modal type
- Modal data
- Modal visibility

**Methods**:
- `openModal(type, data)` - Show modal
- `closeModal()` - Hide modal

#### 4. QueryProvider (React Query)
**Purpose**: Server state management  
**Scope**: Global  
**Features**:
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

### localStorage Strategy

**Keys Used**:
- `active_branch_id_v2`: Current branch ID (V2)
- `branches_cache_v2`: Cached branches array (V2)
- `active_branch_id`: Legacy branch ID (V1)
- `active_branch`: Legacy branch object (V1)
- `user_preferences`: User-specific settings
- `demo_mode`: Demo mode flag

**Design Decisions**:
1. **V2 Suffix**: Prevents conflicts during migration
2. **Caching**: Reduce database calls on page load
3. **Verification**: Always verify writes before relying on data
4. **Cleanup**: Clear outdated keys during major version changes

---

## POS Features

### Implemented Features

#### 1. Sales Entry
**Status**: ✅ Production-ready  
**Features**:
- Product search with auto-complete (ProductSearchPortal)
- Variation support (size, color)
- Quantity, price, discount per item
- Packing details (boxes, pieces, meters)
- Customer selection (existing or quick-add)
- Payment tracking (paid, partial, pending)
- Invoice generation

**Key Components**:
- `components/sales/AddSaleModal.tsx`
- `components/inventory/ProductSearchPortal.tsx`
- `components/purchases/PackingOverlay.tsx`

**Branch Integration**: All sales auto-tagged with active branch ID

#### 2. Purchase Orders
**Status**: ✅ Production-ready  
**Features**:
- Supplier selection
- Product search with variations
- Packing entry (detailed or quick/lump sum)
- Cost tracking (separate from sale price)
- Stock auto-update on purchase completion

**Key Components**:
- `components/purchases/AddPurchaseModal.tsx`
- `components/purchases/PackingOverlay.tsx`

#### 3. Packing System
**Status**: ✅ Production-ready  
**Features**:
- Two modes: Detailed entry (box-by-box) or Quick/lump sum
- Individual meter values preserved (no averaging)
- Mode locking (prevents data corruption)
- Display format: "2 Box / 15 Pc / 450M"

**Technical Decision**: Store individual meter values in `packing_data` JSONB field

#### 4. Product Search
**Status**: ✅ Production-ready (V2)  
**Features**:
- Instant search (no debounce lag)
- Searches name and SKU
- Variation support (shows as separate rows)
- "Add New Product" option when no results
- Icon auto-hide (smooth transition)
- 2-decimal stock display

**Implementation**: `ProductSearchPortal.tsx` (uses React Portal to prevent clipping)

### In Progress

#### 1. Receipt Printing
**Status**: 🔄 In development  
**Target**: Thermal printer support (58mm, 80mm)

#### 2. Barcode Scanning
**Status**: 🔄 Planned  
**Target**: USB scanner integration

#### 3. Cash Drawer Integration
**Status**: 🔄 Planned  
**Target**: Automatic open on sale completion

---

## ERP Features

### Implemented Features

#### 1. User Management
**Status**: ✅ Production-ready  
**Features**:
- User creation with email validation
- Role assignment (Admin, Manager, Salesman, Cashier)
- Salesman-specific fields (base salary, commission %)
- User ledger (for salesmen)
- Active/Inactive status toggle

**Key Files**:
- `app/users/page.tsx`
- `components/users/UserFormModal.tsx`
- `database/ADD_SALESMAN_COLUMNS.sql`

**Salesman Commission Tracking**:
- Automatic ledger creation
- Commission posted on sale completion
- Salary payments recorded as debits
- Running balance calculation

#### 2. Branch Management
**Status**: ✅ Production-ready  
**Features**:
- Branch CRUD (Create, Read, Update, Delete)
- Branch code (e.g., "MB-01")
- Location/address details
- Active/Inactive status

**Key Files**:
- `app/settings/branches/page.tsx`
- Integrated with BranchContext

#### 3. Contact Management (Customers/Suppliers)
**Status**: ✅ Basic implementation  
**Features**:
- Customer/Supplier database
- Balance tracking (receivable/payable)
- Quick-add from transaction modals
- Ledger view

#### 4. Inventory Management
**Status**: ✅ Basic implementation  
**Features**:
- Product database
- Category management
- Variation support
- Stock tracking (branch-specific or aggregated)

### In Progress

#### 1. Finance & Accounting
**Status**: 🔄 In development  
**Planned**:
- Chart of accounts
- Journal entries
- Ledger reports
- Profit & loss statement
- Balance sheet

#### 2. Reporting Module
**Status**: 🔄 Basic implementation  
**Planned**:
- Daily sales report
- Monthly sales summary
- Stock movement report
- Low stock alerts
- Salesman performance report
- Branch comparison report

#### 3. Custom Orders (Stitching)
**Status**: 🔄 Planned  
**Planned**:
- Custom order tracking
- Measurement management
- Order status workflow
- Due date tracking

---

## Security & Access Control

### Authentication
**Provider**: Supabase Auth (JWT-based)  
**Features**:
- Email/password authentication
- Session management
- Secure token storage
- Auto-refresh tokens

### Authorization (Role-Based)

#### Roles Defined
1. **Admin**: Full system access
2. **Manager**: Branch-level management, reporting
3. **Salesman**: Sales entry, customer management
4. **Cashier**: POS operations only

#### Permission System
**File**: `components/auth/RoleGuard.tsx`

**Usage**:
```tsx
<RoleGuard allowedRoles={['admin', 'manager']}>
  <AdminOnlyComponent />
</RoleGuard>
```

**Demo Mode Override**: If `isDemoMode()` returns true, all role checks bypassed

### Row-Level Security (RLS)
**Database Level**: PostgreSQL RLS policies  
**Purpose**: Ensure users can only access their business data

**Example Policy**:
```sql
CREATE POLICY "Users can only see their business data"
ON sales
FOR SELECT
USING (business_id = (SELECT business_id FROM user_profiles WHERE user_id = auth.uid()));
```

### Data Isolation
- **Business ID**: All tables filtered by `business_id`
- **Branch ID**: Transactions filtered by `branch_id` when needed
- **User ID**: Audit trails track `created_by`, `updated_by`

---

## UI/UX Standards

### Design System

#### Color Scheme (Dark Mode)
- **Background**: `#0f172a` (Deep Navy / Slate-950)
- **Surface**: `#1e293b` (Slate-900)
- **Border**: `#334155` (Slate-700)
- **Primary**: Indigo shades (500, 400)
- **Text**: White, Slate-300, Slate-400

#### Component Library
**Base**: Shadcn/UI (Radix UI primitives)  
**Customizations**:
- Dark theme by default
- Consistent spacing (Tailwind scale)
- Portal-based dropdowns (z-index: 99999)
- Smooth transitions (300ms duration)

### Global Standards (Finalized)

#### 1. Icon Auto-Hide Pattern
**Rule**: Icons in input fields hide when user types

**Implementation**:
```tsx
<div className="relative">
  <Search className={cn(
    'absolute left-3 top-1/2 -translate-y-1/2',
    'transition-opacity duration-300',
    (isFocused || value.length > 0) ? 'opacity-0' : 'opacity-100'
  )} />
  <input className={cn(
    'transition-all duration-300',
    (isFocused || value.length > 0) ? 'pl-3' : 'pl-10'
  )} />
</div>
```

**Applied to**: All search bars, filter inputs

#### 2. Decimal Formatting Standard
**Rule**: All currency and measurements show exactly 2 decimal places

**Implementation**:
```typescript
// lib/utils/formatters.ts
export const formatDecimal = (value: number): string => {
  return parseFloat(value.toString()).toFixed(2);
};

// Usage
<span>{formatDecimal(price)}M</span>  // "125.50M"
<span>${formatDecimal(total)}</span>   // "$1,234.56"
```

**Applied to**: Stock, prices, totals, salaries, commissions

#### 3. Portal-Based Dropdowns
**Rule**: All dropdowns render using React Portal to prevent clipping

**Reason**: Prevents overflow:hidden from parent containers cutting off dropdowns

**Implementation**:
```tsx
import { createPortal } from 'react-dom';

{isOpen && createPortal(
  <div style={{ zIndex: 99999 }}>
    {/* Dropdown content */}
  </div>,
  document.body
)}
```

**Applied to**: BranchSelector, UniversalSearch, ProductSearchPortal, all Select components

#### 4. Search Delay Handling
**Rule**: Search results don't vanish on focus loss

**Implementation**: 250ms delay before closing dropdown
```typescript
setTimeout(() => {
  setIsFocused(false);
}, 250); // Allows click to register
```

**Applied to**: UniversalSearch, ProductSearchPortal

### Layout Structure

**Header**: 
- Universal search (products, invoices, customers)
- Branch selector (global)
- Notifications
- Create New button (context-aware)
- User menu

**Sidebar**:
- Dashboard
- POS
- Sales
- Purchases
- Inventory
- Contacts
- Reports
- Accounting
- Settings
- Users

**Dashboard Content**:
- Responsive grid layout
- Cards with stats
- Recent transactions
- Quick actions

---

## Current Status

### Production-Ready ✅
- [x] Next.js App Router setup
- [x] Supabase integration (Auth + Database + Storage)
- [x] Branch Management System (V2)
- [x] User Management (with Salesman support)
- [x] Sales Entry (with packing)
- [x] Purchase Orders (with packing)
- [x] Product Search (ProductSearchPortal)
- [x] Contact Management (Customers/Suppliers)
- [x] Global UI Standards (icon hide, decimal format, portals)
- [x] Role-Based Access Control (RoleGuard)
- [x] Demo Mode Support

### In Progress 🔄
- [ ] Finance & Accounting Module (70% complete)
  - Basic ledger structure ✅
  - Journal entries 🔄
  - Reports 🔄
- [ ] Reporting Module (40% complete)
  - Sales reports ✅
  - Stock reports 🔄
  - Financial reports 🔄
- [ ] Receipt Printing (30% complete)
  - HTML template ✅
  - Thermal printer integration 🔄
- [ ] Branch-Specific Inventory Tracking (60% complete)
  - Database schema ✅
  - UI implementation 🔄

### Planned 📋
- [ ] Barcode scanning
- [ ] Custom orders (stitching)
- [ ] Multi-currency support
- [ ] Advanced reporting (charts, graphs)
- [ ] Stock transfer between branches
- [ ] Low stock alerts
- [ ] Batch operations (bulk upload, bulk edit)
- [ ] Export to PDF/Excel

### Known Issues 🐛
None critical. See individual component files for minor TODOs.

---

## Known Technical Decisions

### 1. Next.js App Router (Not Pages Router)
**Decision**: Use App Router exclusively  
**Reason**: Future-proof, better performance, React Server Components  
**Trade-off**: Steeper learning curve, less community examples

### 2. Context API (Not Redux)
**Decision**: Use React Context for global state  
**Reason**: Simpler, less boilerplate, sufficient for ERP complexity  
**Trade-off**: More providers to manage, manual optimization needed

### 3. Supabase (Not Custom Backend)
**Decision**: Use Supabase as backend  
**Reason**: Faster development, managed infrastructure, built-in auth  
**Trade-off**: Vendor lock-in, some features harder to customize

### 4. localStorage for Branch Selection
**Decision**: Store active branch in localStorage (not cookies)  
**Reason**: Client-side only, no server round-trip, simple API  
**Trade-off**: Not accessible server-side, user-specific (not device-specific)

### 5. V1/V2 Pattern for Major Refactors
**Decision**: Keep V1 active while V2 is developed  
**Reason**: Zero downtime, safe rollback, gradual migration  
**Trade-off**: Code duplication during migration period

### 6. Reload-Based Branch Switching
**Decision**: Reload page after branch selection  
**Reason**: Guarantees fresh data, simpler than partial refetch  
**Trade-off**: Slower UX (page reload), loses unsaved state

**Alternative Considered**: Refetch all queries without reload  
**Why Rejected**: Complex, error-prone, hard to guarantee all data refreshes

### 7. JSONB for Flexible Data (Packing)
**Decision**: Store packing details as JSONB in `sale_items.packing_data`  
**Reason**: Flexible schema, supports varying packing structures  
**Trade-off**: Harder to query, requires application-level validation

### 8. Dark Mode Only (No Light Mode)
**Decision**: Dark theme by default, no light theme toggle  
**Reason**: Professional ERP aesthetic, reduce development time  
**Trade-off**: Some users prefer light mode

**Future**: May add light mode if requested by clients

### 9. 2-Decimal Standard (Not Configurable)
**Decision**: Enforce 2 decimal places globally  
**Reason**: Accounting standard, prevents float precision issues  
**Trade-off**: Not suitable for businesses needing 3+ decimals

**Future**: Make configurable via Settings if needed

### 10. Demo Mode for Testing
**Decision**: Full-featured demo mode (no database required)  
**Reason**: Easy testing, client demonstrations, offline capability  
**Implementation**: `isDemoMode()` checks environment variable

---

## Next Steps

### Immediate Priorities (Week 1-2)

#### 1. Complete Branch Migration (V1 → V2)
**Action Items**:
- [x] Wrap both providers in layout.tsx ✅
- [ ] Migrate `BranchSelector` to `BranchSelectorV2`
- [ ] Update all components using `useBranch()` to `useBranchV2()`
- [ ] Remove V1 provider after full migration
- [ ] Rename V2 files to remove "V2" suffix

**Priority**: HIGH (technical debt cleanup)

#### 2. Finalize Finance Module
**Action Items**:
- [ ] Complete chart of accounts setup
- [ ] Implement journal entry form
- [ ] Add ledger report generation
- [ ] Test profit/loss calculation

**Priority**: HIGH (blocking other features)

#### 3. Branch-Specific Inventory
**Action Items**:
- [ ] Complete `branch_inventory` table integration
- [ ] Update stock display to show per-branch
- [ ] Implement stock transfer functionality
- [ ] Add low stock alerts (per branch)

**Priority**: MEDIUM (important for multi-branch operations)

### Short-Term Goals (Month 1)

#### 4. Enhanced Reporting
**Action Items**:
- [ ] Add date range filters to all reports
- [ ] Implement branch comparison report
- [ ] Add export to PDF functionality
- [ ] Create dashboard widgets (sales today, low stock, etc.)

**Priority**: MEDIUM (improves usability)

#### 5. Receipt Printing
**Action Items**:
- [ ] Test thermal printer integration
- [ ] Add print preview
- [ ] Support multiple receipt formats
- [ ] Add QR code to receipts

**Priority**: MEDIUM (POS feature)

#### 6. Performance Optimization
**Action Items**:
- [ ] Add React Query caching to all data fetches
- [ ] Implement lazy loading for heavy components
- [ ] Optimize bundle size (code splitting)
- [ ] Add loading skeletons

**Priority**: LOW (optimize after feature completion)

### Long-Term Goals (Quarter 1)

#### 7. Advanced Features
- [ ] Barcode scanning
- [ ] Multi-currency support
- [ ] Custom order module (stitching)
- [ ] Mobile app (React Native)
- [ ] Offline mode (PWA)

#### 8. Analytics & Insights
- [ ] Sales trends (charts)
- [ ] Predictive stock alerts
- [ ] Customer segmentation
- [ ] Salesman performance analytics

#### 9. Integrations
- [ ] Payment gateway integration
- [ ] SMS notifications
- [ ] Email marketing
- [ ] Third-party accounting software sync

---

## Maintenance Notes

### Critical Files (Don't Break!)
- `app/layout.tsx` - Provider hierarchy
- `lib/context/BranchContextV2.tsx` - Branch state management
- `utils/supabase/client.ts` - Database connection
- `components/layout/ModernDashboardLayout.tsx` - Main layout

### Before Major Changes
1. Run full test suite (once implemented)
2. Test in demo mode
3. Test with real database
4. Check browser console for errors
5. Verify localStorage keys are correct
6. Test on multiple browsers

### Debugging Tips
1. **Branch issues**: Check `/test-branch` page first
2. **Context issues**: Verify provider is wrapped in layout.tsx
3. **Database issues**: Check Supabase logs
4. **UI issues**: Check console for Radix UI warnings
5. **localStorage issues**: Clear storage and hard refresh

### Code Style Guidelines
- Use TypeScript strictly (no `any` without reason)
- Document complex logic with comments
- Use descriptive variable names
- Keep components under 500 lines (split if larger)
- Extract reusable logic to hooks
- Use `formatDecimal()` for all numbers

---

## Appendix

### Useful Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
supabase db reset        # Reset database (dev only)
supabase db push         # Apply migrations

# Testing
npm test                 # Run tests (once implemented)
```

### Environment Variables

**Required** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Server-side only
```

**Optional**:
```env
NEXT_PUBLIC_DEMO_MODE=true           # Enable demo mode
NEXT_PUBLIC_ENABLE_LOGGING=true      # Verbose console logs
```

### Related Documentation Files
- `BRANCH_SELECTION_COMPLETE_SOLUTION.md` - Branch system deep dive
- `SENIOR_ARCHITECT_DIAGNOSIS.md` - Branch debugging process
- `FINAL_FIX_BOTH_PROVIDERS.md` - V1/V2 migration strategy
- `BULLETPROOF_BRANCH_SOLUTION.md` - Technical implementation details
- `SUPABASE_SETUP.md` - Database setup guide

---

**Document Version**: 1.0  
**Last Updated**: January 8, 2026  
**Maintained By**: Development Team  
**Review Frequency**: Monthly or after major changes

