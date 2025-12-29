# 🚀 Modern ERP API Integration Guide

## Overview

This guide documents the new Modern ERP API endpoints for:
- **Hybrid Inventory** (Products with Rental Support)
- **Rental Management** (Date-based bookings with conflict detection)
- **Custom Studio / Manufacturing** (Production orders with vendor ledger integration)
- **Advanced Accounting** (Fund transfers with double-entry transactions)

---

## 📦 Products API (Extended)

### POST /api/v1/products
Create a product with rental support

**Request Body:**
```json
{
  "name": "Red Bridal Lehenga",
  "sku": "BRD-RED-001",
  "unitId": 1,
  "enableStock": true,
  "alertQuantity": 5,
  "isRentable": true,
  "rentalPrice": 35000,
  "securityDepositAmount": 10000,
  "rentDurationUnit": "day"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Red Bridal Lehenga",
    "is_rentable": true,
    "rental_price": 35000,
    "security_deposit_amount": 10000,
    "rent_duration_unit": "day"
  }
}
```

---

## 🎫 Rental Bookings API

### GET /api/v1/rentals/products
Get all rentable products

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "Red Bridal Lehenga",
      "sku": "BRD-RED-001",
      "is_rentable": true,
      "rental_price": 35000,
      "security_deposit_amount": 10000,
      "rent_duration_unit": "day",
      "variations": [...]
    }
  ]
}
```

### GET /api/v1/rentals/check-conflicts
Check for date conflicts before booking

**Query Parameters:**
- `productId` (required)
- `pickupDate` (required, ISO string)
- `returnDate` (required, ISO string)
- `excludeBookingId` (optional, for updates)

**Response:**
```json
{
  "success": true,
  "hasConflicts": false,
  "data": []
}
```

### POST /api/v1/rentals
Create a rental booking

**Request Body:**
```json
{
  "contactId": 45,
  "productId": 123,
  "variationId": 456,
  "pickupDate": "2024-01-15T10:00:00Z",
  "returnDate": "2024-01-17T18:00:00Z",
  "rentalAmount": 35000,
  "securityDepositAmount": 10000,
  "securityType": "cash",
  "notes": "Customer requested early pickup"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 789,
    "status": "reserved",
    "pickup_date": "2024-01-15T10:00:00Z",
    "return_date": "2024-01-17T18:00:00Z",
    "contact": {...},
    "product": {...}
  }
}
```

**Error Response (Date Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "DATE_CONFLICT",
    "message": "Date conflict detected. Product is already booked from 2024-01-14 to 2024-01-16"
  }
}
```

### PATCH /api/v1/rentals/:id/status
Update booking status

**Request Body:**
```json
{
  "status": "out",
  "actualReturnDate": "2024-01-18T14:00:00Z"
}
```

---

## 🏭 Production Orders API

### POST /api/v1/production
Create a production order

**Request Body:**
```json
{
  "customerId": 45,
  "orderNo": "PO-2024-001",
  "deadlineDate": "2024-01-20T00:00:00Z",
  "description": "Custom bridal lehenga with handwork",
  "steps": [
    {
      "stepName": "Dyeing",
      "vendorId": 67,
      "cost": 2000,
      "notes": "Red color dye"
    },
    {
      "stepName": "Stitching",
      "vendorId": 68,
      "cost": 3000,
      "notes": "Full lehenga stitching"
    }
  ],
  "materials": [
    {
      "productId": 123,
      "variationId": 456,
      "quantityUsed": 5,
      "unitId": 1,
      "unitCost": 500
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "order_no": "PO-2024-001",
    "status": "new",
    "total_cost": 5000,
    "steps": [...],
    "materials": [...]
  }
}
```

### PATCH /api/v1/production/steps/:id/status
Update production step status (triggers vendor payment)

**Request Body:**
```json
{
  "status": "completed"
}
```

**Note:** When a step is marked as "completed" and has a `vendorId`, the system automatically:
1. Credits the vendor's financial account
2. Creates an account transaction with `reference_type: 'production'`

---

## 💰 Accounting API

### GET /api/v1/accounting/accounts
Get all financial accounts

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Meezan Bank Corp",
      "type": "bank",
      "account_number": "1234567890",
      "current_balance": 125000,
      "is_active": true
    },
    {
      "id": 2,
      "name": "Cash Drawer",
      "type": "cash",
      "current_balance": 50000,
      "is_active": true
    }
  ]
}
```

### POST /api/v1/accounting/accounts
Create a financial account

**Request Body:**
```json
{
  "name": "JazzCash Wallet",
  "type": "wallet",
  "accountNumber": "03001234567",
  "openingBalance": 10000,
  "notes": "Mobile wallet for online payments"
}
```

### POST /api/v1/accounting/transfers
Transfer funds between accounts (creates double-entry transactions)

**Request Body:**
```json
{
  "fromAccountId": 2,
  "toAccountId": 1,
  "amount": 50000,
  "transferDate": "2024-01-15T10:30:00Z",
  "referenceNo": "TRF-2024-001",
  "notes": "Daily deposit to bank"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 201,
    "from_account_id": 2,
    "to_account_id": 1,
    "amount": 50000,
    "transfer_date": "2024-01-15T10:30:00Z",
    "from_account": {
      "id": 2,
      "name": "Cash Drawer",
      "current_balance": 0
    },
    "to_account": {
      "id": 1,
      "name": "Meezan Bank Corp",
      "current_balance": 175000
    },
    "transactions": [
      {
        "id": 301,
        "account_id": 2,
        "type": "debit",
        "amount": 50000,
        "reference_type": "transfer",
        "reference_id": 201
      },
      {
        "id": 302,
        "account_id": 1,
        "type": "credit",
        "amount": 50000,
        "reference_type": "transfer",
        "reference_id": 201
      }
    ]
  }
}
```

**Note:** The system automatically:
1. Creates a debit transaction on the source account
2. Creates a credit transaction on the destination account
3. Updates both account balances via triggers

---

## 🔐 Authentication

All endpoints require:
- **JWT Token** in `Authorization: Bearer <token>` header
- **Business Context** (automatically attached via middleware)

---

## 📝 Error Codes

- `VALIDATION_ERROR` - Missing or invalid fields
- `DATE_CONFLICT` - Rental booking date conflict
- `INSUFFICIENT_BALANCE` - Account balance too low
- `DUPLICATE_SKU` - Product SKU already exists
- `DUPLICATE_ORDER_NO` - Production order number already exists
- `DUPLICATE_ACCOUNT_NAME` - Financial account name already exists
- `NOT_FOUND` - Resource not found

---

## 🧪 Testing

### Test Rental Booking with Conflict Check
```bash
# 1. Check conflicts
curl -X GET "http://localhost:3001/api/v1/rentals/check-conflicts?productId=123&pickupDate=2024-01-15T10:00:00Z&returnDate=2024-01-17T18:00:00Z" \
  -H "Authorization: Bearer <token>"

# 2. Create booking
curl -X POST "http://localhost:3001/api/v1/rentals" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": 45,
    "productId": 123,
    "pickupDate": "2024-01-15T10:00:00Z",
    "returnDate": "2024-01-17T18:00:00Z",
    "rentalAmount": 35000,
    "securityDepositAmount": 10000
  }'
```

### Test Fund Transfer
```bash
curl -X POST "http://localhost:3001/api/v1/accounting/transfers" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": 2,
    "toAccountId": 1,
    "amount": 50000,
    "notes": "Daily deposit"
  }'
```

---

## ✅ Next Steps

1. **Frontend Integration:**
   - Update ProductForm to send rental fields
   - Update RentalBookingDrawer to call conflict check API
   - Update NewCustomOrder to create production orders
   - Update FundsTransferModal to call transfer API

2. **Database Migration:**
   - Run `MODERN_ERP_EXTENSION.sql` in Supabase SQL Editor

3. **Testing:**
   - Test all endpoints with Postman/curl
   - Verify RLS policies work correctly
   - Test date conflict detection
   - Test double-entry accounting

---

**Status:** ✅ Backend APIs Complete  
**Next:** Frontend Integration

