# Mobile App MVP - Phase F

## Status: ✅ ARCHITECTURE READY

**Date**: January 8, 2026  
**Phase**: Phase F - Mobile App MVP  
**Framework**: React Native (Expo recommended)  
**Backend**: Existing Express.js APIs (no changes)

---

## Architecture Decision: Decision-Free Design

**Design**: Single codebase that can work as:
- ✅ **Single Super App**: One app with role-based module visibility
- ✅ **Multiple Apps**: Same codebase can be split into separate apps later

**Key Principle**: Navigation and screen visibility are **role-driven**, not hard-coded.

---

## Folder Structure

```
mobile-app/
├── src/
│   ├── api/                    # API integration layer
│   │   ├── client.ts          # API client (base)
│   │   ├── auth.ts            # Authentication API
│   │   ├── sales.ts           # Sales API
│   │   ├── worker.ts          # Worker API
│   │   └── production.ts      # Production API
│   ├── auth/                  # Authentication
│   │   ├── AuthContext.tsx   # Auth context provider
│   │   ├── useAuth.ts         # Auth hook
│   │   └── storage.ts         # Secure token storage
│   ├── screens/               # Screen components
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx (role-based dashboard)
│   │   ├── worker/
│   │   │   ├── WorkerStepsScreen.tsx
│   │   │   └── UpdateStepScreen.tsx
│   │   ├── sales/
│   │   │   ├── SalesListScreen.tsx
│   │   │   └── CreateSaleScreen.tsx
│   │   └── shared/
│   │       └── ErrorScreen.tsx
│   ├── navigation/            # Navigation setup
│   │   ├── AppNavigator.tsx   # Main navigator (role-based)
│   │   ├── WorkerNavigator.tsx
│   │   ├── SalesNavigator.tsx
│   │   └── AdminNavigator.tsx
│   ├── components/            # Reusable components
│   │   ├── RoleGuard.tsx     # Role-based component guard
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── hooks/                 # Custom hooks
│   │   ├── useRole.ts         # Role hook
│   │   ├── usePermissions.ts  # Permissions hook
│   │   └── useApi.ts          # API call hook
│   ├── types/                 # TypeScript types
│   │   ├── auth.ts
│   │   ├── sales.ts
│   │   ├── worker.ts
│   │   └── api.ts
│   └── utils/                 # Utilities
│       ├── permissions.ts     # Permission checking
│       └── constants.ts       # App constants
├── App.tsx                    # Root component
├── app.json                   # Expo config
├── package.json
└── tsconfig.json
```

---

## Screen List with Responsibilities

### 1. Login Screen (`screens/auth/LoginScreen.tsx`)

**Responsibilities**:
- Email/password input
- Login button
- Error display
- Navigation to Home after login

**API Calls**:
- `POST /api/v1/auth/login` (or Supabase Auth directly)

**No Role Logic**: Just authentication

---

### 2. Home / Dashboard (`screens/home/HomeScreen.tsx`)

**Responsibilities**:
- Role-based module cards/buttons
- Navigation to role-specific screens
- User info display
- Logout button

**Role-Based Visibility**:
- `production_worker`: Show "My Steps" card
- `cashier` / `sales`: Show "Create Sale", "View Sales" cards
- `manager` / `admin`: Show all cards (Sales, Accounting, Production, Reports)

**No Business Logic**: Just navigation

---

### 3. Worker Steps Screen (`screens/worker/WorkerStepsScreen.tsx`)

**Responsibilities**:
- Fetch assigned steps via API
- Display list of steps
- Show step details (order_no, step_name, qty, status)
- Navigate to update screen

**API Calls**:
- `GET /api/v1/worker/steps`

**Role Required**: `production_worker`, `admin`, `manager`

---

### 4. Update Step Screen (`screens/worker/UpdateStepScreen.tsx`)

**Responsibilities**:
- Display step details
- Input for `completed_qty`
- Button to update progress
- Button to update status
- Handle API responses

**API Calls**:
- `PATCH /api/v1/worker/steps/:id/progress`
- `PATCH /api/v1/worker/steps/:id/status`

**Role Required**: `production_worker`, `admin`, `manager`

---

### 5. Create Sale Screen (`screens/sales/CreateSaleScreen.tsx`)

**Responsibilities**:
- Product selection
- Quantity input
- Customer selection (optional)
- Payment method selection
- Create sale button
- Handle draft/final status

**API Calls**:
- `GET /api/v1/products` (for product list)
- `GET /api/v1/contacts` (for customer list)
- `POST /api/v1/sales`

**Role Required**: `cashier`, `sales`, `admin`, `manager`

---

### 6. Sales List Screen (`screens/sales/SalesListScreen.tsx`)

**Responsibilities**:
- Fetch sales list via API
- Display sales in list
- Show sale details (invoice_no, total, status, date)
- Filter by status (optional)
- Navigate to sale details (future)

**API Calls**:
- `GET /api/v1/sales`

**Role Required**: `cashier`, `sales`, `admin`, `manager`, `auditor`

---

## API Integration Points

### Base API Client (`src/api/client.ts`)

```typescript
// Base API client with authentication
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  async request(endpoint: string, options: RequestInit = {}) {
    // Add auth token
    // Handle errors (401, 403, network)
    // Retry logic
  }
}
```

### API Services

**Sales API** (`src/api/sales.ts`):
- `getSales()` → `GET /api/v1/sales`
- `createSale(data)` → `POST /api/v1/sales`
- `getSaleById(id)` → `GET /api/v1/sales/:id`

**Worker API** (`src/api/worker.ts`):
- `getAssignedSteps()` → `GET /api/v1/worker/steps`
- `updateStepProgress(id, qty)` → `PATCH /api/v1/worker/steps/:id/progress`
- `updateStepStatus(id, status)` → `PATCH /api/v1/worker/steps/:id/status`

**Production API** (`src/api/production.ts`):
- `getProductionOrders()` → `GET /api/v1/production`
- `getCostReports()` → `GET /api/v1/production/cost-reports`

---

## Role → Screen Mapping

### production_worker

**Visible Screens**:
- ✅ Home Screen
- ✅ Worker Steps Screen
- ✅ Update Step Screen

**Hidden Screens**:
- ❌ Create Sale Screen
- ❌ Sales List Screen
- ❌ Accounting Screens

**API Access**:
- ✅ `/api/v1/worker/*`
- ❌ `/api/v1/sales/*` (403 if accessed)

---

### cashier / sales

**Visible Screens**:
- ✅ Home Screen
- ✅ Create Sale Screen
- ✅ Sales List Screen

**Hidden Screens**:
- ❌ Worker Steps Screen
- ❌ Accounting Screens (read-only later)

**API Access**:
- ✅ `/api/v1/sales/*`
- ❌ `/api/v1/worker/*` (403 if accessed)

---

### manager / admin

**Visible Screens**:
- ✅ Home Screen
- ✅ Create Sale Screen
- ✅ Sales List Screen
- ✅ Worker Steps Screen (if needed)
- ✅ Production Overview (future)
- ✅ Reports (future)

**API Access**:
- ✅ All APIs (full access)

---

### auditor

**Visible Screens**:
- ✅ Home Screen
- ✅ Sales List Screen (read-only)
- ✅ Reports (read-only)

**API Access**:
- ✅ Read-only APIs
- ❌ Write APIs (403 if accessed)

---

## Future-Proofing

### Extensibility Points

1. **Navigation Structure**:
   - Modular navigators (WorkerNavigator, SalesNavigator, etc.)
   - Easy to add new navigators (AccountingNavigator, ReportsNavigator)

2. **Screen Registration**:
   - Role-based screen registry
   - Easy to add new screens without breaking existing

3. **API Layer**:
   - Modular API services
   - Easy to add new API services

4. **Permission System**:
   - Centralized permission checking
   - Easy to add new permissions

---

## Implementation Notes

### Authentication Flow

1. User enters email/password
2. Call Supabase Auth (or backend auth endpoint)
3. Store token securely (React Native SecureStore or similar)
4. Fetch user role from backend
5. Store role in context
6. Navigate to Home (role-based)

### Role Fetching

```typescript
// After login, fetch role from backend
const response = await api.get('/api/v1/auth/me');
const userRole = response.data.role;
// Store in AuthContext
```

### Permission Checking

```typescript
// Check permission before showing screen
const { hasPermission } = usePermissions();

if (hasPermission('sales.create')) {
  // Show Create Sale button
}
```

### Error Handling

```typescript
// Handle API errors
try {
  await createSale(data);
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // Redirect to login
  } else if (error.code === 'INSUFFICIENT_PERMISSIONS') {
    // Show permission error
  } else {
    // Show generic error
  }
}
```

---

## Backend API Usage

### Existing Endpoints Used

**Sales**:
- `GET /api/v1/sales` - List sales
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales/:id` - Get sale details

**Worker**:
- `GET /api/v1/worker/steps` - Get assigned steps
- `PATCH /api/v1/worker/steps/:id/progress` - Update progress
- `PATCH /api/v1/worker/steps/:id/status` - Update status

**Production** (future):
- `GET /api/v1/production` - List production orders
- `GET /api/v1/production/cost-reports` - Cost reports

**No New Endpoints**: Mobile app uses ONLY existing APIs

---

## Confirmation

### ✅ Backend Untouched
- No backend code changes
- No database changes
- No new endpoints
- Existing APIs work as-is

### ✅ Phase A–E Rules Respected
- Phase A: Sale → Production (backend handles automatically)
- Phase B: Worker APIs (mobile consumes)
- Phase C: Costing (backend handles, mobile can view reports)
- Phase D: Social media (backend handles, mobile can view messages later)
- Phase E: System contract (mobile follows all rules)

### ✅ App Can Scale to Full ERP
- Navigation structure extensible
- Screen registration extensible
- API layer extensible
- Permission system extensible

---

**Status**: ✅ **Mobile App MVP Architecture Ready**  
**Ready For**: Mobile app development  
**Backend**: ✅ Unchanged

---

**Last Updated**: January 8, 2026
