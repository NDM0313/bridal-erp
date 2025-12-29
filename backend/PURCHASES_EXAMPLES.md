# Purchases API Examples
## Step 5: Purchases & Stock IN Implementation

## 📋 Overview

The Purchases API handles:
- Creating purchase transactions (draft or final)
- Unit conversion (Box → Pieces)
- Stock increase (only for final transactions)
- Purchase price management

## 🔑 Key Features

- **Unit Conversion**: Automatically converts Box to Pieces for stock
- **Stock Increase**: Adds purchased quantity to stock
- **Draft Support**: Draft purchases don't affect stock
- **Final Transactions**: Only final purchases increase stock

---

## 📝 API Endpoints

### 1. Create Purchase

**POST** `/api/v1/purchases`

### 2. Get Purchases List

**GET** `/api/v1/purchases`

### 3. Get Purchase by ID

**GET** `/api/v1/purchases/:id`

### 4. Complete Purchase (Draft → Final)

**POST** `/api/v1/purchases/:id/complete`

---

## 💡 Example 1: Purchase in PIECES

### Request

```http
POST /api/v1/purchases
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 10,
  "items": [
    {
      "variationId": 10,
      "quantity": 100,
      "unitId": 1,
      "purchasePrice": 60.00
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
      "ref_no": "PUR-202512-0001",
      "type": "purchase",
      "status": "final",
      "final_total": 6000.00,
      "transaction_date": "2025-12-25T10:00:00Z"
    },
    "items": [
      {
        "id": 1,
        "transaction_id": 1,
        "variation_id": 10,
        "quantity": 100,
        "unit_id": 1,
        "purchase_price": 60.00,
        "line_total": 6000.00
      }
    ],
    "stockUpdates": [
      {
        "variationId": 10,
        "locationId": 1,
        "quantityPurchased": 100,
        "unit": "Pieces",
        "quantityInPieces": 100,
        "newStock": 172
      }
    ]
  }
}
```

**Explanation:**
- Purchased 100 Pieces
- Purchase price: 60.00 per piece
- Stock increased: 100 pieces (72 + 100 = 172 remaining)

---

## 💡 Example 2: Purchase in BOX

### Request

```http
POST /api/v1/purchases
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 10,
  "items": [
    {
      "variationId": 10,
      "quantity": 5,
      "unitId": 3,
      "purchasePrice": 720.00
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
      "ref_no": "PUR-202512-0002",
      "type": "purchase",
      "status": "final",
      "final_total": 3600.00,
      "transaction_date": "2025-12-25T10:05:00Z"
    },
    "items": [
      {
        "id": 2,
        "transaction_id": 2,
        "variation_id": 10,
        "quantity": 5,
        "unit_id": 3,
        "purchase_price": 720.00,
        "line_total": 3600.00
      }
    ],
    "stockUpdates": [
      {
        "variationId": 10,
        "locationId": 1,
        "quantityPurchased": 5,
        "unit": "Box",
        "quantityInPieces": 60,
        "newStock": 232
      }
    ]
  }
}
```

**Explanation:**
- Purchased 5 Boxes
- Purchase price: 720.00 per box (60.00 per piece)
- **Conversion**: 5 boxes × 12 = 60 pieces added
- Stock increased: 60 pieces (172 + 60 = 232 remaining)

---

## 💡 Example 3: Draft Purchase (No Stock Increase)

### Request

```http
POST /api/v1/purchases
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 10,
  "items": [
    {
      "variationId": 10,
      "quantity": 50,
      "unitId": 1,
      "purchasePrice": 60.00
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
      "ref_no": "PUR-202512-0003",
      "type": "purchase",
      "status": "draft",
      "final_total": 3000.00
    },
    "items": [...],
    "stockUpdates": []
  }
}
```

**Explanation:**
- Transaction created as draft
- **No stock increase** (stockUpdates is empty)
- Can be completed later using `/api/v1/purchases/3/complete`

---

## 💡 Example 4: Complete Draft Purchase

### Request

```http
POST /api/v1/purchases/3/complete
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
  "message": "Purchase completed successfully"
}
```

**What happens:**
1. Converts quantities to Pieces (if needed)
2. Increases stock in variation_location_details
3. Updates transaction status to 'final'
4. Updates payment_status to 'paid'

---

## 💡 Example 5: Mixed Units Purchase

### Request

```http
POST /api/v1/purchases
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": 1,
  "contactId": 10,
  "items": [
    {
      "variationId": 10,
      "quantity": 2,
      "unitId": 3,
      "purchasePrice": 720.00
    },
    {
      "variationId": 10,
      "quantity": 24,
      "unitId": 1,
      "purchasePrice": 60.00
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
        "quantity": 2,
        "unit_id": 3,
        "purchase_price": 720.00
      },
      {
        "variation_id": 10,
        "quantity": 24,
        "unit_id": 1,
        "purchase_price": 60.00
      }
    ],
    "stockUpdates": [
      {
        "variationId": 10,
        "quantityPurchased": 2,
        "unit": "Box",
        "quantityInPieces": 24
      },
      {
        "variationId": 10,
        "quantityPurchased": 24,
        "unit": "Pieces",
        "quantityInPieces": 24
      }
    ]
  }
}
```

**Explanation:**
- Item 1: 2 Boxes = 24 Pieces added
- Item 2: 24 Pieces added
- **Total**: 48 Pieces added to stock

---

## 🔍 Get Purchases List

### Request

```http
GET /api/v1/purchases?page=1&per_page=20&status=final&location_id=1
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ref_no": "PUR-202512-0001",
      "status": "final",
      "final_total": 6000.00,
      "contact": {
        "id": 10,
        "name": "Supplier ABC",
        "supplier_business_name": "ABC Trading Co."
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

## 🔍 Get Purchase Details

### Request

```http
GET /api/v1/purchases/1
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "ref_no": "PUR-202512-0001",
    "status": "final",
    "final_total": 6000.00,
    "items": [
      {
        "id": 1,
        "variation_id": 10,
        "quantity": 100,
        "unit_id": 1,
        "purchase_price": 60.00,
        "line_total": 6000.00,
        "variation": {
          "id": 10,
          "name": "Default",
          "sub_sku": "PROD-001-DEF",
          "default_purchase_price": 60.00
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

## 📊 Stock IN Flow

### Example: Purchasing 5 Boxes (1 Box = 12 Pieces)

1. **Request**: `quantity: 5, unitId: 3` (Box)
2. **Get Unit**: Box unit with `base_unit_id: 1, base_unit_multiplier: 12`
3. **Get Base Unit**: Pieces unit (id: 1)
4. **Convert**: `5 × 12 = 60 pieces`
5. **Increase Stock**: `qty_available += 60`
6. **Response**: Shows both purchased quantity (5 Box) and added quantity (60 Pieces)

---

## ✅ Key Points

1. **Stock is ALWAYS in Pieces**: All stock operations use base unit
2. **Conversion is Automatic**: Box quantities converted to Pieces before increase
3. **Draft vs Final**: Only final purchases affect stock
4. **Stock INCREASES**: Purchases add to stock (opposite of sales)
5. **No Validation Needed**: Can purchase any quantity (unlike sales)

---

## 🔄 Comparison: Sales vs Purchases

| Aspect | Sales | Purchases |
|--------|-------|-----------|
| **Stock Effect** | Decreases | Increases |
| **Validation** | Check availability | No validation needed |
| **Price Source** | retail_price / wholesale_price | purchase_price |
| **Customer Type** | retail / wholesale | N/A (supplier) |
| **Transaction Type** | 'sell' | 'purchase' |
| **Line Table** | transaction_sell_lines | purchase_lines |

---

**Ready to test!** 🚀

