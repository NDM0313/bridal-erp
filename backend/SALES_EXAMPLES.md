# Sales API Examples
## Step 4: Sales & Inventory Implementation

## 📋 Overview

The Sales API handles:
- Creating sales transactions (draft or final)
- Unit conversion (Box → Pieces)
- Stock deduction (only for final transactions)
- Price selection (retail vs wholesale)

## 🔑 Key Features

- **Unit Conversion**: Automatically converts Box to Pieces for stock
- **Stock Validation**: Checks availability before sale
- **Price Selection**: Uses retail_price or wholesale_price based on customer_type
- **Draft Support**: Draft transactions don't affect stock
- **Final Transactions**: Only final transactions deduct stock

---

## 📝 API Endpoints

### 1. Create Sale

**POST** `/api/v1/sales`

### 2. Get Sales List

**GET** `/api/v1/sales`

### 3. Get Sale by ID

**GET** `/api/v1/sales/:id`

### 4. Complete Sale (Draft → Final)

**POST** `/api/v1/sales/:id/complete`

---

## 💡 Example 1: Sale in PIECES (Retail Customer)

### Request

```http
POST /api/v1/sales
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 5,
  "customerType": "retail",
  "items": [
    {
      "variationId": 10,
      "quantity": 24,
      "unitId": 1
    }
  ],
  "paymentMethod": "cash",
  "status": "final"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 1,
      "invoice_no": "INV-202512-0001",
      "type": "sell",
      "status": "final",
      "customer_type": "retail",
      "final_total": 2400.00,
      "transaction_date": "2025-12-25T10:00:00Z"
    },
    "items": [
      {
        "id": 1,
        "transaction_id": 1,
        "variation_id": 10,
        "quantity": 24,
        "unit_id": 1,
        "unit_price": 100.00,
        "line_total": 2400.00
      }
    ],
    "stockUpdates": [
      {
        "variationId": 10,
        "locationId": 1,
        "quantitySold": 24,
        "unit": "Pieces",
        "quantityInPieces": 24,
        "newStock": 96
      }
    ]
  }
}
```

**Explanation:**
- Sold 24 Pieces
- Used retail_price (100.00 per piece)
- Stock deducted: 24 pieces (120 - 24 = 96 remaining)

---

## 💡 Example 2: Sale in BOX (Wholesale Customer)

### Request

```http
POST /api/v1/sales
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 8,
  "customerType": "wholesale",
  "items": [
    {
      "variationId": 10,
      "quantity": 2,
      "unitId": 3
    }
  ],
  "paymentMethod": "cash",
  "status": "final"
}
```

**Note:** `unitId: 3` is Box (1 Box = 12 Pieces)

### Response

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 2,
      "invoice_no": "INV-202512-0002",
      "type": "sell",
      "status": "final",
      "customer_type": "wholesale",
      "final_total": 1920.00,
      "transaction_date": "2025-12-25T10:05:00Z"
    },
    "items": [
      {
        "id": 2,
        "transaction_id": 2,
        "variation_id": 10,
        "quantity": 2,
        "unit_id": 3,
        "unit_price": 960.00,
        "line_total": 1920.00
      }
    ],
    "stockUpdates": [
      {
        "variationId": 10,
        "locationId": 1,
        "quantitySold": 2,
        "unit": "Box",
        "quantityInPieces": 24,
        "newStock": 72
      }
    ]
  }
}
```

**Explanation:**
- Sold 2 Boxes
- Used wholesale_price (960.00 per box = 80.00 per piece)
- **Conversion**: 2 boxes × 12 = 24 pieces deducted
- Stock deducted: 24 pieces (96 - 24 = 72 remaining)

---

## 💡 Example 3: Draft Transaction (No Stock Deduction)

### Request

```http
POST /api/v1/sales
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 5,
  "customerType": "retail",
  "items": [
    {
      "variationId": 10,
      "quantity": 50,
      "unitId": 1
    }
  ],
  "paymentMethod": "cash",
  "status": "draft"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 3,
      "invoice_no": "INV-202512-0003",
      "type": "sell",
      "status": "draft",
      "final_total": 5000.00
    },
    "items": [...],
    "stockUpdates": []
  }
}
```

**Explanation:**
- Transaction created as draft
- **No stock validation** (can exceed available stock)
- **No stock deduction** (stockUpdates is empty)
- Can be completed later using `/api/v1/sales/3/complete`

---

## 💡 Example 4: Complete Draft Transaction

### Request

```http
POST /api/v1/sales/3/complete
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 3,
    "status": "final",
    "payment_status": "paid"
  },
  "message": "Transaction completed successfully"
}
```

**What happens:**
1. Validates stock availability
2. Deducts stock (converts to Pieces if needed)
3. Updates transaction status to 'final'
4. Updates payment_status to 'paid'

---

## 💡 Example 5: Mixed Units Sale

### Request

```http
POST /api/v1/sales
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 5,
  "customerType": "retail",
  "items": [
    {
      "variationId": 10,
      "quantity": 1,
      "unitId": 3
    },
    {
      "variationId": 10,
      "quantity": 6,
      "unitId": 1
    }
  ],
  "status": "final"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "transaction": {...},
    "items": [
      {
        "variation_id": 10,
        "quantity": 1,
        "unit_id": 3,
        "unit_price": 1200.00
      },
      {
        "variation_id": 10,
        "quantity": 6,
        "unit_id": 1,
        "unit_price": 100.00
      }
    ],
    "stockUpdates": [
      {
        "variationId": 10,
        "quantitySold": 1,
        "unit": "Box",
        "quantityInPieces": 12
      },
      {
        "variationId": 10,
        "quantitySold": 6,
        "unit": "Pieces",
        "quantityInPieces": 6
      }
    ]
  }
}
```

**Explanation:**
- Item 1: 1 Box = 12 Pieces deducted
- Item 2: 6 Pieces deducted
- **Total**: 18 Pieces deducted from stock

---

## ❌ Error Examples

### Insufficient Stock

**Request:**
```json
{
  "locationId": 1,
  "items": [
    {
      "variationId": 10,
      "quantity": 100,
      "unitId": 1
    }
  ],
  "status": "final"
}
```

**Response (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for variation 10. Available: 72 pieces, Required: 100 pieces"
  }
}
```

### Invalid Customer Type

**Request:**
```json
{
  "customerType": "invalid"
}
```

**Response (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "customerType must be 'retail' or 'wholesale'"
  }
}
```

---

## 🔍 Get Sales List

### Request

```http
GET /api/v1/sales?page=1&per_page=20&status=final&location_id=1
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoice_no": "INV-202512-0001",
      "status": "final",
      "customer_type": "retail",
      "final_total": 2400.00,
      "contact": {
        "id": 5,
        "name": "John Doe",
        "customer_type": "retail"
      },
      "location": {
        "id": 1,
        "name": "Main Store"
      }
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

## 🔍 Get Sale Details

### Request

```http
GET /api/v1/sales/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_no": "INV-202512-0001",
    "status": "final",
    "customer_type": "retail",
    "final_total": 2400.00,
    "items": [
      {
        "id": 1,
        "variation_id": 10,
        "quantity": 24,
        "unit_id": 1,
        "unit_price": 100.00,
        "line_total": 2400.00,
        "variation": {
          "id": 10,
          "name": "Default",
          "sub_sku": "PROD-001-DEF",
          "retail_price": 100.00,
          "wholesale_price": 80.00
        },
        "product": {
          "id": 1,
          "name": "Test Product",
          "sku": "PROD-001"
        },
        "unit": {
          "id": 1,
          "actual_name": "Pieces",
          "short_name": "Pcs"
        }
      }
    ]
  }
}
```

---

## 📊 Stock Calculation Flow

### Example: Selling 2 Boxes (1 Box = 12 Pieces)

1. **Request**: `quantity: 2, unitId: 3` (Box)
2. **Get Unit**: Box unit with `base_unit_id: 1, base_unit_multiplier: 12`
3. **Get Base Unit**: Pieces unit (id: 1)
4. **Convert**: `2 × 12 = 24 pieces`
5. **Validate Stock**: Check if 24 pieces available
6. **Deduct Stock**: `qty_available -= 24`
7. **Response**: Shows both sold quantity (2 Box) and deducted quantity (24 Pieces)

---

## ✅ Key Points

1. **Stock is ALWAYS in Pieces**: All stock operations use base unit
2. **Conversion is Automatic**: Box quantities converted to Pieces before deduction
3. **Draft vs Final**: Only final transactions affect stock
4. **Price Selection**: Automatic based on customer_type
5. **Validation**: Stock checked before final transactions
6. **Error Handling**: Clear error messages for insufficient stock

---

**Ready to test!** 🚀

