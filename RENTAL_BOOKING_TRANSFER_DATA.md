# 📋 Rental Booking Implementation - Transfer Data

## 1. Component Location & Code

### File Path
**Reference Location:** `Modern ERP POS System/src/app/components/rentals/RentalBookingDrawer.tsx`
**Note:** This is in the reference folder. You'll need to create this component in your root project at:
`components/rentals/RentalBookingDrawer.tsx` or `app/components/rentals/RentalBookingDrawer.tsx`

### Component Code (First 400 lines)
```typescript
import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  ShoppingBag,
  ArrowRight,
  Info,
  Box,
  AlertCircle,
  Tag
} from 'lucide-react';
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { SecuritySection, SecurityDetails } from './SecuritySection';
import { ReturnDressModal } from './ReturnDressModal';
import { QuickAddContactModal } from '../contacts/QuickAddContactModal';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "../ui/command";
import { Check, ChevronsUpDown, User, PlusCircle } from "lucide-react";
import { Label } from "../ui/label";
import { RentalProductSearch, SearchProduct } from './RentalProductSearch';

interface RentalBookingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RentalBookingDrawer = ({ isOpen, onClose }: RentalBookingDrawerProps) => {
  // Context State
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [rentalStatus, setRentalStatus] = useState("booked");

  const [selectedCustomer, setSelectedCustomer] = useState<string>("1");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerList, setCustomerList] = useState(customers);

  // Cart State
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [manualRentPrice, setManualRentPrice] = useState<string>('');
  const [advancePaid, setAdvancePaid] = useState('');
  
  // Security State
  const [securityDetails, setSecurityDetails] = useState<SecurityDetails | null>(null);

  // Return Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Component continues with:
  // - Product mapping logic
  // - Date conflict checking
  // - Form submission
  // - UI rendering (drawer with product search, date pickers, security section)
  
  // ... (rest of component code)
};
```

**Key Features:**
- Date picker for pickup/return dates
- Product search and selection
- Customer selection (with quick add)
- Security deposit handling
- Manual rental price override
- Conflict detection (needs backend integration)
- Full-width drawer UI with dark theme

---

## 2. Database Schema: `rental_bookings` Table

### Table Structure
```sql
CREATE TABLE IF NOT EXISTS rental_bookings (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NULL,
    business_id INTEGER NOT NULL,
    contact_id INTEGER NULL,
    product_id INTEGER NOT NULL,
    variation_id INTEGER NULL,
    booking_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pickup_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP NOT NULL,
    actual_return_date TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reserved' 
        CHECK (status IN ('reserved', 'out', 'returned', 'overdue', 'cancelled')),
    security_type VARCHAR(20) NULL 
        CHECK (security_type IN ('cash', 'id_card', 'both', 'none')),
    security_doc_url TEXT NULL,
    penalty_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    rental_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    security_deposit_amount NUMERIC(22, 4) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_rental_bookings_transaction FOREIGN KEY (transaction_id) 
        REFERENCES transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_rental_bookings_business FOREIGN KEY (business_id) 
        REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_rental_bookings_contact FOREIGN KEY (contact_id) 
        REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_rental_bookings_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_rental_bookings_variation FOREIGN KEY (variation_id) 
        REFERENCES variations(id) ON DELETE SET NULL
);
```

### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_rental_bookings_business_id ON rental_bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_product_id ON rental_bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_pickup_date ON rental_bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_return_date ON rental_bookings(return_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_transaction_id ON rental_bookings(transaction_id);
```

### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | SERIAL | NO | auto | Primary key |
| `transaction_id` | INTEGER | YES | NULL | Links to transactions table (optional) |
| `business_id` | INTEGER | NO | - | Business owner (FK to businesses) |
| `contact_id` | INTEGER | YES | NULL | Customer/contact (FK to contacts) |
| `product_id` | INTEGER | NO | - | Product being rented (FK to products) |
| `variation_id` | INTEGER | YES | NULL | Product variation (FK to variations) |
| `booking_date` | TIMESTAMP | NO | CURRENT_TIMESTAMP | When booking was created |
| `pickup_date` | TIMESTAMP | NO | - | When product will be picked up |
| `return_date` | TIMESTAMP | NO | - | Expected return date |
| `actual_return_date` | TIMESTAMP | YES | NULL | Actual return date (when returned) |
| `status` | VARCHAR(20) | NO | 'reserved' | Status: reserved, out, returned, overdue, cancelled |
| `security_type` | VARCHAR(20) | YES | NULL | Type: cash, id_card, both, none |
| `security_doc_url` | TEXT | YES | NULL | URL to security document/image |
| `penalty_amount` | NUMERIC(22,4) | NO | 0 | Late return penalty |
| `rental_amount` | NUMERIC(22,4) | NO | 0 | Total rental fee |
| `security_deposit_amount` | NUMERIC(22,4) | NO | 0 | Security deposit collected |
| `notes` | TEXT | YES | NULL | Additional notes |
| `created_by` | UUID | NO | - | User who created booking (FK to auth.users) |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Last update timestamp |

### Conflict Detection View
```sql
CREATE OR REPLACE VIEW rental_booking_conflicts AS
SELECT 
    rb1.id as booking_id_1,
    rb2.id as booking_id_2,
    rb1.product_id,
    rb1.pickup_date as pickup_1,
    rb1.return_date as return_1,
    rb2.pickup_date as pickup_2,
    rb2.return_date as return_2
FROM rental_bookings rb1
JOIN rental_bookings rb2 ON rb1.product_id = rb2.product_id 
    AND rb1.id < rb2.id
    AND rb1.status IN ('reserved', 'out')
    AND rb2.status IN ('reserved', 'out')
WHERE (
    (rb1.pickup_date <= rb2.return_date AND rb1.return_date >= rb2.pickup_date)
);
```

---

## 3. Supabase Client Import

### File: `utils/supabase/client.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
```

### Usage in Components
```typescript
import { supabase } from '@/utils/supabase/client';
```

---

## 4. TypeScript Types

### File: `lib/types/modern-erp.ts`
```typescript
export interface RentalBooking extends BaseEntity {
  id: number;
  transaction_id?: number;
  business_id: number;
  contact_id?: number;
  product_id: number;
  variation_id?: number;
  booking_date: string;
  pickup_date: string;
  return_date: string;
  actual_return_date?: string;
  status: 'reserved' | 'out' | 'returned' | 'overdue' | 'cancelled';
  security_type?: 'cash' | 'id_card' | 'both' | 'none';
  security_doc_url?: string;
  penalty_amount: number;
  rental_amount: number;
  security_deposit_amount: number;
  notes?: string;
  created_by: string;
  // Relations
  contact?: {
    id: number;
    name: string;
    mobile?: string;
    email?: string;
  };
  product?: Product;
  variation?: Variation;
}

export interface RentalConflict {
  id: number;
  pickup_date: string;
  return_date: string;
  status: string;
  contact_id?: number;
}

export interface RentalBookingFormData {
  contactId: number;
  productId: number;
  variationId?: number;
  pickupDate: string;
  returnDate: string;
  rentalAmount: number;
  securityDepositAmount: number;
  securityType: 'cash' | 'id_card' | 'both' | 'none';
  securityDocUrl?: string;
  notes?: string;
}
```

---

## 5. Backend API Endpoints

### Base URL
```
http://localhost:3001/api/v1
```
**Environment Variable:** `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api/v1`)

### Endpoints Available

#### Check Date Conflicts
```
GET /api/v1/rentals/check-conflicts?productId={id}&pickupDate={iso}&returnDate={iso}&excludeBookingId={id}

Response: {
  success: true,
  data: RentalConflict[],
  hasConflicts: boolean
}
```

#### Create Rental Booking
```
POST /api/v1/rentals
Headers: {
  Authorization: Bearer {jwt_token}
}
Body: {
  contactId: number,
  productId: number,
  variationId?: number,
  pickupDate: string (ISO),
  returnDate: string (ISO),
  rentalAmount: number,
  securityDepositAmount: number,
  securityType: 'cash' | 'id_card' | 'both' | 'none',
  securityDocUrl?: string,
  notes?: string
}

Response (201): {
  success: true,
  data: RentalBooking
}

Error (409): {
  success: false,
  error: {
    code: 'DATE_CONFLICT',
    message: string
  }
}
```

#### Get Rentable Products
```
GET /api/v1/rentals/products
Headers: {
  Authorization: Bearer {jwt_token}
}

Response: {
  success: true,
  data: Product[]
}
```

#### Get All Bookings
```
GET /api/v1/rentals?page=1&per_page=20&status=reserved&productId=123&contactId=45&startDate=2024-01-01&endDate=2024-12-31

Response: {
  success: true,
  data: RentalBooking[],
  meta: {
    page: number,
    perPage: number,
    total: number,
    totalPages: number
  }
}
```

#### Update Booking Status
```
PATCH /api/v1/rentals/:id/status
Headers: {
  Authorization: Bearer {jwt_token}
}
Body: {
  status: 'out' | 'returned' | 'overdue' | 'cancelled',
  actualReturnDate?: string (ISO)
}

Response: {
  success: true,
  data: RentalBooking
}
```

---

## 6. API Client Usage

### File: `lib/api/apiClient.ts`
```typescript
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { RentalBooking } from '@/lib/types/modern-erp';

// Check conflicts
const response = await apiClient.get<ApiResponse<RentalConflict[]>>(
  `/rentals/check-conflicts?productId=${productId}&pickupDate=${pickupDate}&returnDate=${returnDate}`
);

// Create booking
const response = await apiClient.post<ApiResponse<RentalBooking>>('/rentals', {
  contactId: 45,
  productId: 123,
  pickupDate: '2024-01-15T10:00:00Z',
  returnDate: '2024-01-17T18:00:00Z',
  rentalAmount: 35000,
  securityDepositAmount: 10000,
  securityType: 'cash',
});
```

---

## 7. Key Implementation Notes

### Date Conflict Detection
- Backend service: `backend/src/services/rentalService.js`
- Function: `checkDateConflicts(productId, pickupDate, returnDate, excludeBookingId)`
- Logic: Checks for overlapping dates where both bookings have status 'reserved' or 'out'
- Returns: Array of conflicting bookings

### RLS Policies
- All rental_bookings queries are protected by RLS
- Users can only access bookings from their own business
- Uses `get_user_business_id()` function

### Required Fields for Booking
- `contactId` (required)
- `productId` (required)
- `pickupDate` (required, ISO string)
- `returnDate` (required, ISO string)
- `rentalAmount` (optional, defaults to 0)
- `securityDepositAmount` (optional, defaults to 0)

---

## 8. Component Dependencies

The RentalBookingDrawer component uses:
- `date-fns` - Date formatting and manipulation
- `lucide-react` - Icons
- UI components from `@/components/ui/*`:
  - Button, Input, Calendar, Select, Badge, ScrollArea, Popover, Command, Label
- Custom components:
  - `SecuritySection` - Security deposit handling
  - `ReturnDressModal` - Return processing
  - `QuickAddContactModal` - Quick customer creation
  - `RentalProductSearch` - Product search functionality

---

## ✅ Summary

**Component:** `RentalBookingDrawer.tsx` (in reference folder)
**Database Table:** `rental_bookings` (see schema above)
**Supabase Client:** `import { supabase } from '@/utils/supabase/client'`
**Backend API:** `/api/v1/rentals` (see endpoints above)
**TypeScript Types:** `lib/types/modern-erp.ts`

**Next Steps:**
1. Create the component in your root project
2. Connect it to backend API using `apiClient`
3. Implement date conflict checking before submission
4. Handle security deposit collection
5. Update booking status on pickup/return

