/**
 * Modern ERP Type Definitions
 * Types for Rental, Production, and Accounting modules
 */

// ============================================
// Base Types
// ============================================

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at?: string;
}

// ============================================
// Product Types (Extended)
// ============================================

export interface Product extends BaseEntity {
  business_id: number;
  name: string;
  type: 'single' | 'variable';
  unit_id: number;
  secondary_unit_id?: number;
  brand_id?: number;
  category_id?: number;
  sub_category_id?: number;
  sku: string;
  enable_stock: boolean;
  alert_quantity: number;
  is_inactive: boolean;
  product_description?: string;
  image?: string;
  weight?: number;
  // Rental fields (from MODERN_ERP_EXTENSION)
  is_rentable?: boolean;
  rental_price?: number;
  security_deposit_amount?: number;
  rent_duration_unit?: 'hour' | 'day' | 'event';
}

export interface Variation extends BaseEntity {
  product_id: number;
  name: string;
  sub_sku?: string;
  default_purchase_price: number;
  retail_price: number;
  wholesale_price: number;
}

// ============================================
// Rental Types
// ============================================

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

// ============================================
// Production Types
// ============================================

export interface ProductionOrder extends BaseEntity {
  id: number;
  business_id: number;
  customer_id?: number;
  order_no: string; // Display as "Design #" in UI
  status: 'new' | 'dyeing' | 'stitching' | 'handwork' | 'completed' | 'dispatched' | 'cancelled';
  deadline_date?: string;
  total_cost: number;
  final_price: number;
  description?: string;
  created_by: string;
  measurements?: Record<string, any>; // JSON field for measurements
  assigned_vendor_id?: number; // Vendor assigned to the order
  // Relations
  customer?: {
    id: number;
    name: string;
    mobile?: string;
    email?: string;
  };
  assigned_vendor?: {
    id: number;
    name: string;
    mobile?: string;
    address_line_1?: string; // May contain role info
  };
  steps?: ProductionStep[];
  materials?: ProductionMaterial[];
}

export interface ProductionStep extends BaseEntity {
  id: number;
  production_order_id: number;
  step_name: 'Dyeing' | 'Stitching' | 'Handwork' | 'Cutting' | 'Finishing' | 'Quality Check' | 'Packaging';
  vendor_id?: number;
  cost: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  started_at?: string;
  completed_at?: string;
  // Relations
  vendor?: {
    id: number;
    name: string;
    mobile?: string;
  };
}

export interface ProductionMaterial extends BaseEntity {
  id: number;
  production_order_id: number;
  product_id: number;
  variation_id?: number;
  quantity_used: number;
  unit_id: number;
  unit_cost: number;
  total_cost: number;
  notes?: string;
  // Relations
  product?: Product;
  variation?: Variation;
}

// ============================================
// Accounting Types
// ============================================

export interface FinancialAccount extends BaseEntity {
  id: number;
  business_id: number;
  name: string;
  type: 'bank' | 'cash' | 'wallet' | 'credit_card' | 'loan';
  account_number?: string;
  bank_name?: string;
  branch_name?: string;
  current_balance: number;
  opening_balance: number;
  is_active: boolean;
  notes?: string;
  created_by: string;
}

export interface AccountTransaction extends BaseEntity {
  id: number;
  account_id: number;
  business_id: number;
  type: 'debit' | 'credit';
  amount: number;
  reference_type?: 'sell' | 'purchase' | 'expense' | 'transfer' | 'opening_balance' | 'adjustment' | 'rental' | 'production';
  reference_id?: number;
  description?: string;
  transaction_date: string;
  created_by: string;
  // Relations
  account?: {
    id: number;
    name: string;
    type: FinancialAccount['type'];
  };
}

export interface FundTransfer extends BaseEntity {
  id: number;
  business_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transfer_date: string;
  reference_no?: string;
  notes?: string;
  created_by: string;
  // Relations
  from_account?: FinancialAccount;
  to_account?: FinancialAccount;
  transactions?: AccountTransaction[];
}

// ============================================
// Form Types
// ============================================

export interface ProductFormData {
  name: string;
  sku: string;
  unitId?: number;
  brandId?: number;
  categoryId?: number;
  subCategoryId?: number;
  enableStock: boolean;
  alertQuantity?: number;
  productDescription?: string;
  // Rental fields
  isRentable?: boolean;
  rentalPrice?: number;
  securityDepositAmount?: number;
  rentDurationUnit?: 'hour' | 'day' | 'event';
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

export interface ProductionOrderFormData {
  customerId?: number;
  orderNo: string;
  deadlineDate?: string;
  description?: string;
  steps: Array<{
    stepName: string;
    vendorId?: number;
    cost: number;
    notes?: string;
  }>;
  materials: Array<{
    productId: number;
    variationId?: number;
    quantityUsed: number;
    unitId: number;
    unitCost: number;
    notes?: string;
  }>;
}

export interface FundTransferFormData {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  transferDate?: string;
  referenceNo?: string;
  notes?: string;
}

