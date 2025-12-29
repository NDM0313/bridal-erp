# Backend Project Structure

## 📁 Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js              # Supabase client configuration
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication & user-business mapping
│   │   ├── errorHandler.js         # Global error handling
│   │   └── requestContext.js       # Business context attachment
│   ├── routes/
│   │   └── products.js              # Product API routes
│   ├── services/
│   │   └── productService.js        # Product business logic & database operations
│   └── server.js                    # Express server setup & entry point
├── database/
│   └── user_profiles_setup.sql      # User profiles table & get_user_business_id() function
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore rules
├── package.json                      # Dependencies & scripts
├── README.md                         # Setup & usage guide
├── ENVIRONMENT_VARIABLES.md          # Environment variables reference
├── API_EXAMPLES.md                   # API request/response examples
└── PROJECT_STRUCTURE.md              # This file
```

## 📂 Directory Descriptions

### `/src/config`
**Purpose**: Configuration files for external services

- `supabase.js`: Creates Supabase clients (anon, service role, authenticated)

### `/src/middleware`
**Purpose**: Express middleware functions

- `auth.js`: 
  - Verifies Supabase JWT tokens
  - Extracts user information
  - Gets `business_id` from `user_profiles` table
  - Attaches user & business context to request

- `errorHandler.js`:
  - Global error handling middleware
  - Formats error responses
  - 404 handler

- `requestContext.js`:
  - Attaches business context to request
  - Ensures `business_id` is available

### `/src/routes`
**Purpose**: API route definitions

- `products.js`: Product CRUD endpoints
  - GET `/api/v1/products` - List products
  - GET `/api/v1/products/search` - Search products
  - GET `/api/v1/products/:id` - Get product
  - POST `/api/v1/products` - Create product
  - PUT `/api/v1/products/:id` - Update product
  - DELETE `/api/v1/products/:id` - Delete product

### `/src/services`
**Purpose**: Business logic and database operations

- `productService.js`: Product service layer
  - Abstracts database operations
  - Handles Supabase queries
  - Respects RLS and `business_id`
  - Returns formatted data

### `/src/server.js`
**Purpose**: Express application setup

- Creates Express app
- Configures middleware (CORS, JSON parsing)
- Registers routes
- Sets up error handling
- Starts server

### `/database`
**Purpose**: Database setup scripts

- `user_profiles_setup.sql`: 
  - Creates `user_profiles` table
  - Updates `get_user_business_id()` function
  - Sets up RLS policies

## 🔄 Request Flow

1. **Request arrives** → `server.js`
2. **CORS & JSON parsing** → Middleware
3. **Authentication** → `auth.js` middleware
   - Verifies JWT token
   - Gets user info
   - Gets `business_id` from `user_profiles`
4. **Business context** → `requestContext.js` middleware
   - Attaches `business_id` to request
5. **Route handler** → `routes/products.js`
   - Validates request
   - Calls service
6. **Service layer** → `services/productService.js`
   - Performs database operations
   - Respects RLS
7. **Response** → JSON response to client
8. **Error handling** → `errorHandler.js` (if error occurs)

## 🔐 Security Layers

1. **JWT Authentication**: Verifies user identity
2. **Business Isolation**: `business_id` filtering
3. **RLS Policies**: Database-level security
4. **Middleware Validation**: Request validation

## 📝 Adding New Modules

To add a new module (e.g., `variations`):

1. Create service: `src/services/variationService.js`
2. Create routes: `src/routes/variations.js`
3. Register routes in `server.js`:
   ```js
   import variationRoutes from './routes/variations.js';
   app.use('/api/v1/variations', variationRoutes);
   ```

## 🎯 Key Principles

- **Separation of Concerns**: Routes → Services → Database
- **RLS First**: All queries respect Row Level Security
- **Business Isolation**: All operations filtered by `business_id`
- **Error Handling**: Centralized error handling
- **Type Safety**: Use TypeScript in future (optional)

