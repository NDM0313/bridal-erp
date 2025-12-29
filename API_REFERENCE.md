# API Reference Guide

## Base URL
```
Production: https://api.yourdomain.com/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /auth/login
Login and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "business_id": 1
    }
  }
}
```

---

## Product Endpoints

### GET /products
List all products with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `category_id` (optional): Filter by category
- `brand_id` (optional): Filter by brand
- `location_id` (optional): Include stock for location

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU-001",
      "type": "single",
      "unit": {
        "id": 1,
        "actual_name": "Pieces",
        "short_name": "Pcs"
      },
      "secondary_unit": {
        "id": 3,
        "actual_name": "Box",
        "short_name": "Box",
        "multiplier": 12
      },
      "stock": {
        "qty_available": 120,
        "qty_in_pieces": 120,
        "qty_in_boxes": 10
      }
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

### GET /products/:id
Get product details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Product Name",
    "sku": "SKU-001",
    "variations": [
      {
        "id": 10,
        "name": "Variation Name",
        "sub_sku": "SKU-001-VAR1",
        "retail_price": 100.00,
        "wholesale_price": 80.00,
        "stock": {
          "qty_available": 120
        }
      }
    ]
  }
}
```

### POST /products
Create a new product.

**Request:**
```json
{
  "name": "New Product",
  "sku": "SKU-002",
  "type": "single",
  "unit_id": 1,
  "secondary_unit_id": 3,
  "category_id": 5,
  "brand_id": 2,
  "enable_stock": true,
  "variations": [
    {
      "name": "Default",
      "sub_sku": "SKU-002-DEF",
      "retail_price": 100.00,
      "wholesale_price": 80.00
    }
  ]
}
```

### PUT /products/:id
Update a product.

### DELETE /products/:id
Delete a product (soft delete).

---

## Variation Endpoints

### GET /variations/:id/stock
Get stock for a variation by location.

**Query Parameters:**
- `location_id` (required): Location ID

**Response:**
```json
{
  "success": true,
  "data": {
    "variation_id": 10,
    "location_id": 1,
    "location_name": "Main Store",
    "qty_available": 120,
    "base_unit": {
      "id": 1,
      "actual_name": "Pieces",
      "short_name": "Pcs"
    },
    "secondary_unit": {
      "id": 3,
      "actual_name": "Box",
      "short_name": "Box",
      "multiplier": 12
    },
    "display": {
      "base": {
        "quantity": 120,
        "unit": { "id": 1, "actual_name": "Pieces" }
      },
      "secondary": {
        "quantity": 10,
        "unit": { "id": 3, "actual_name": "Box" }
      }
    }
  }
}
```

### PUT /variations/:id/pricing
Update retail/wholesale prices.

**Request:**
```json
{
  "retail_price": 120.00,
  "wholesale_price": 90.00
}
```

---

## Sales Endpoints

### POST /sales
Create a new sale transaction.

**Request:**
```json
{
  "location_id": 1,
  "contact_id": 5,
  "customer_type": "retail",
  "items": [
    {
      "variation_id": 10,
      "quantity": 2,
      "unit_id": 3,
      "unit_price": 100.00
    }
  ],
  "payment_method": "cash",
  "discount": 0,
  "notes": "Customer notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": 123,
    "invoice_no": "INV-2025-001",
    "total": 200.00,
    "stock_updated": true,
    "items": [
      {
        "variation_id": 10,
        "quantity": 2,
        "unit_id": 3,
        "unit_price": 100.00,
        "line_total": 200.00,
        "stock_deducted": 24
      }
    ]
  }
}
```

### GET /sales
List sales transactions.

**Query Parameters:**
- `page`, `per_page`: Pagination
- `location_id`: Filter by location
- `date_from`, `date_to`: Date range
- `status`: Filter by status

### GET /sales/:id
Get sale details.

### POST /sales/:id/return
Create a return for a sale.

**Request:**
```json
{
  "items": [
    {
      "sell_line_id": 50,
      "quantity": 1,
      "unit_id": 3
    }
  ],
  "reason": "Defective product"
}
```

---

## Purchase Endpoints

### POST /purchases
Create a new purchase.

**Request:**
```json
{
  "location_id": 1,
  "contact_id": 10,
  "items": [
    {
      "variation_id": 10,
      "quantity": 10,
      "unit_id": 3,
      "purchase_price": 80.00
    }
  ],
  "payment_method": "cash"
}
```

### GET /purchases
List purchases.

---

## Inventory Endpoints

### GET /inventory/stock/:variation_id
Get stock for a variation across all locations.

**Query Parameters:**
- `location_id` (optional): Filter by location

**Response:**
```json
{
  "success": true,
  "data": {
    "variation_id": 10,
    "total_stock": 240,
    "stock_by_location": [
      {
        "location_id": 1,
        "location_name": "Main Store",
        "qty_available": 120,
        "qty_in_pieces": 120,
        "qty_in_boxes": 10
      },
      {
        "location_id": 2,
        "location_name": "Branch Store",
        "qty_available": 120,
        "qty_in_pieces": 120,
        "qty_in_boxes": 10
      }
    ]
  }
}
```

### POST /inventory/adjust
Stock adjustment.

**Request:**
```json
{
  "location_id": 1,
  "variation_id": 10,
  "adjustment_type": "increase",
  "quantity": 10,
  "unit_id": 1,
  "reason": "Found extra stock"
}
```

### POST /inventory/transfer
Transfer stock between locations.

**Request:**
```json
{
  "from_location_id": 1,
  "to_location_id": 2,
  "variation_id": 10,
  "quantity": 5,
  "unit_id": 3
}
```

---

## Unit Endpoints

### GET /units
List all units.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "actual_name": "Pieces",
      "short_name": "Pcs",
      "base_unit_id": null,
      "base_unit_multiplier": null
    },
    {
      "id": 3,
      "actual_name": "Box",
      "short_name": "Box",
      "base_unit_id": 1,
      "base_unit_multiplier": 12
    }
  ]
}
```

### GET /units/:id/conversions
Get unit conversion chain.

**Response:**
```json
{
  "success": true,
  "data": {
    "unit": {
      "id": 3,
      "actual_name": "Box"
    },
    "base_unit": {
      "id": 1,
      "actual_name": "Pieces"
    },
    "multiplier": 12,
    "conversion": "1 Box = 12 Pieces"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `INSUFFICIENT_STOCK`: Not enough stock available
- `INVALID_UNIT_CONVERSION`: Units are not compatible

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

---

## Rate Limiting

- **Authenticated requests:** 1000 requests/hour
- **Unauthenticated requests:** 100 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Webhooks

### POST /webhooks/whatsapp
Receive WhatsApp messages (for automation).

**Request:**
```json
{
  "type": "message",
  "from": "+1234567890",
  "text": "STOCK 123",
  "timestamp": "2025-12-25T10:00:00Z"
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

