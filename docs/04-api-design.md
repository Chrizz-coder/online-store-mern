# API Design — Online Store Backend

> **Source of Truth:** Generated from backend source code — `backend/src/` (routes, controllers, models, middleware, services, utils).
> **Base URL:** `http://localhost:5000`
> **Last Updated:** 2026-07-31

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication](#2-authentication)
3. [Products](#3-products)
4. [Cart](#4-cart)
5. [Orders](#5-orders)
6. [Payment](#6-payment)
7. [Wishlist](#7-wishlist)
8. [Reviews](#8-reviews)
9. [Addresses](#9-addresses)
10. [Flow Diagrams](#10-flow-diagrams)

---

## 1. API Conventions

### Base Prefix

All endpoints are prefixed under `/api/`:

| Module | Prefix |
|---|---|
| Auth & Profile | `/api/user` |
| Addresses | `/api/user/address` |
| Products | `/api/products` |
| Cart | `/api/cart` |
| Orders | `/api/orders` |
| Payment | `/api/payment` |
| Wishlist | `/api/wishlist` |
| Reviews | `/api/review` |

### Authentication Header

All protected routes require a JWT Bearer token:

```
Authorization: Bearer <token>
```

The token is returned by `POST /api/user/login` and `POST /api/user/register`.

### Standard Response Format

**Success:**
```json
{ "message": "Human-readable success message.", "data": {} }
```

**Error:**
```json
{ "message": "Human-readable error message." }
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK — request succeeded |
| `201` | Created — resource created |
| `400` | Bad Request — invalid input or business rule violation |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — authenticated but not permitted |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g. already reviewed) |
| `500` | Internal Server Error |

### Variant Fields

Several endpoints accept an optional `selectedVariant` object:

```json
{
  "selectedVariant": {
    "color": "Grey",
    "size": "11"
  }
}
```

Or a direct `variantId` (MongoDB ObjectId of the embedded variant):

```json
{
  "variantId": "6a6741a2b320910b2566a943"
}
```

---

## 2. Authentication

**Purpose:** Register new users, log in existing users, and retrieve the authenticated user's profile.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/user/register` | Register a new user | Public |
| `POST` | `/api/user/login` | Login and receive JWT | Public |
| `GET` | `/api/user/profile` | Get current user profile | JWT Required |

---

### POST `/api/user/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | String | ✅ | Non-empty |
| `email` | String | ✅ | Valid email format, unique |
| `password` | String | ✅ | Min 6 characters |

**Success `201`:**
```json
{
  "message": "User registered successfully.",
  "token": "<jwt_token>",
  "user": {
    "id": "6a66cd55870134f24abdc0eb",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Any field is missing |
| `409` | Email already registered |
| `500` | Server error |

**Business Logic:**
- Hashes password using bcrypt (salt rounds: 10)
- Creates user with default role `"customer"`
- Returns signed JWT valid for 2 days

**DB Impact:** Writes to `users` collection.

---

### POST `/api/user/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Success `200`:**
```json
{
  "message": "Logged in successfully.",
  "token": "<jwt_token>",
  "user": {
    "id": "6a66cd55870134f24abdc0eb",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Email or password missing |
| `401` | Invalid credentials |
| `500` | Server error |

**Business Logic:** Compares password with bcrypt. Signs JWT on success.

**DB Impact:** Reads `users`.

---

### GET `/api/user/profile`

**Auth:** JWT Required

**Success `200`:** Returns the full Mongoose user document (password excluded by `select("-password")`).

**Errors:**

| Code | When |
|---|---|
| `401` | No token or invalid token |

---

## 3. Products

**Purpose:** Browse and manage product catalog. Read operations are public; write operations require admin privileges.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/products` | Get all active products | Public |
| `GET` | `/api/products/:id` | Get single product | Public |
| `POST` | `/api/products` | Create a new product | Admin |
| `PUT` | `/api/products/:id` | Update product fields | Admin |
| `PATCH` | `/api/products/:productId/variants/:variantId` | Update variant price/stock | Admin |
| `DELETE` | `/api/products/:id` | Soft-delete (deactivate) product | Admin |

---

### GET `/api/products`

**Success `200`:**
```json
{
  "count": 12,
  "products": [
    {
      "_id": "6a66cfd63b0059c20575760a",
      "name": "Running Sneakers",
      "slug": "running-sneakers",
      "description": "...",
      "basePrice": 2999,
      "salePrice": 2499,
      "category": "Footwear",
      "brand": "Nike",
      "images": ["https://..."],
      "variants": [
        { "_id": "6a6741a2...", "color": "Grey", "size": "11", "price": 2499, "stock": 10 }
      ],
      "globalStock": 0,
      "isActive": true,
      "averageRating": 4.5
    }
  ]
}
```

Returns only products where `isActive: true`.

---

### GET `/api/products/:id`

**URL Parameter:** `:id` — MongoDB ObjectId of the product.

**Success `200`:** Full product document.

**Errors:**

| Code | When |
|---|---|
| `400` | Malformed ObjectId |
| `404` | Product not found |

---

### POST `/api/products`

**Auth:** Admin JWT

**Request Body:**
```json
{
  "name": "Running Sneakers",
  "description": "Lightweight running shoe",
  "basePrice": 2999,
  "salePrice": 2499,
  "category": "Footwear",
  "subCategory": "Running",
  "brand": "Nike",
  "tags": ["sport", "running"],
  "images": ["https://cdn.example.com/img1.jpg"],
  "globalStock": 0,
  "variants": [
    { "color": "Grey", "size": "11", "price": 2499, "stock": 10 },
    { "color": "White", "size": "10", "price": 2499, "stock": 5 }
  ]
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | Non-empty |
| `description` | ✅ | Non-empty |
| `basePrice` | ✅ | > 0 |
| `category` | ✅ | Non-empty |
| `brand` | ✅ | Non-empty |
| `images` | ✅ | Array, min 1 item |
| `salePrice` | ❌ | Optional |
| `subCategory` | ❌ | Optional |
| `tags` | ❌ | String array |
| `globalStock` | ❌ | Defaults to `0` |
| `variants` | ❌ | Each must have a `price >= 0` |

**Success `201`:**
```json
{
  "message": "Product created successfully.",
  "product": { ...productDocument }
}
```

**Business Logic:**
- Auto-generates `slug` from `name` via pre-save hook
- Sets `isActive: true` and `averageRating: 0` on creation

**DB Impact:** Writes to `products`.

---

### PUT `/api/products/:id`

**Auth:** Admin JWT

**Request Body:** Any subset of product fields to update (partial updates supported via `$set`).

```json
{
  "salePrice": 1999,
  "isActive": false
}
```

**Validation:** `basePrice` must be > 0 if provided.

**Success `200`:**
```json
{
  "message": "Product updated successfully.",
  "product": { ...updatedDocument }
}
```

**DB Impact:** Updates `products`.

---

### PATCH `/api/products/:productId/variants/:variantId`

**Auth:** Admin JWT

**URL Parameters:**
- `:productId` — Parent product ObjectId
- `:variantId` — Embedded variant ObjectId

**Request Body:**
```json
{
  "price": 2299,
  "stock": 25
}
```

Both fields are optional. At least one should be provided.

| Field | Rules |
|---|---|
| `price` | >= 0 |
| `stock` | >= 0 |

**Success `200`:**
```json
{
  "message": "Variant updated successfully.",
  "product": { ...productDocument }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid ObjectId format |
| `400` | Price or stock < 0 |
| `404` | Product or variant not found |

**DB Impact:** Updates embedded variant in `products`.

---

### DELETE `/api/products/:id`

**Auth:** Admin JWT

**Business Logic:** Soft-delete — sets `isActive: false`. Product is hidden from `getAllProducts` but preserved in the database (orders referencing it remain intact).

**Success `200`:**
```json
{ "message": "Product deactivated successfully." }
```

**DB Impact:** Updates `isActive` field in `products`.

---

## 4. Cart

**Purpose:** Manages the user's shopping cart with real-time price and stock synchronization on every fetch.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/cart` | View cart (with sync) | JWT Required |
| `POST` | `/api/cart` | Add item to cart | JWT Required |
| `PUT` | `/api/cart/:productId` | Update item quantity | JWT Required |
| `DELETE` | `/api/cart/:productId` | Remove item from cart | JWT Required |

---

### GET `/api/cart`

**Business Logic (Cart Sync on every fetch):**
1. Fetches cart with populated product references
2. For each item: checks product is still active
3. Looks up current price (variant or base/sale price)
4. Adjusts `priceAtTimeOfAdding` if price changed
5. Removes items where product/variant is no longer available
6. Clamps quantity to available stock if stock decreased
7. Saves updated cart if any changes occurred
8. Returns `cartSubtotal` (auto-calculated by pre-save hook)

**Success `200`:** Full cart document with populated products.

```json
{
  "_id": "...",
  "user": "6a66cd55...",
  "items": [
    {
      "product": { "_id": "...", "name": "Running Sneakers", ... },
      "quantity": 2,
      "selectedVariant": { "color": "Grey", "size": "11" },
      "priceAtTimeOfAdding": 2499
    }
  ],
  "cartSubtotal": 4998
}
```

**DB Impact:** Reads `carts`, `products`. Conditionally writes to `carts`.

---

### POST `/api/cart`

**Request Body:**
```json
{
  "productId": "6a66cfd63b0059c20575760a",
  "quantity": 2,
  "selectedVariant": {
    "color": "Grey",
    "size": "11"
  }
}
```

| Field | Required | Rules |
|---|---|---|
| `productId` | ✅ | Valid ObjectId |
| `quantity` | ❌ | Positive integer, defaults to `1` |
| `selectedVariant` | ❌ | Required if product has variants |
| `selectedVariant.color` | ❌ | Must match a variant in the product |
| `selectedVariant.size` | ❌ | Must match a variant in the product |

**Business Logic:**
1. Validates product exists and is active
2. Resolves variant if provided; validates it exists in product
3. Checks stock: `variant.stock` or `product.globalStock` >= `existingQty + requestedQty`
4. If item already in cart (same product + same variant): increments quantity
5. If new item: pushes to `cart.items`
6. Pre-save hook recalculates `cartSubtotal`

**Success `200`:**
```json
{
  "message": "Item added to cart successfully.",
  "cart": { ...cartDocument }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid quantity |
| `400` | Variant not found |
| `400` | Insufficient stock |
| `404` | Product not found or inactive |
| `500` | Server error |

**DB Impact:** Reads `products`. Writes to `carts`.

---

### PUT `/api/cart/:productId`

**URL Parameter:** `:productId` — Product ObjectId (not variant ID)

**Request Body:**
```json
{
  "quantity": 3,
  "selectedVariant": { "color": "Grey", "size": "11" }
}
```

Setting `quantity: 0` removes the item from the cart.

**Business Logic:**
1. Finds item in cart matching `productId` + variant
2. If `quantity === 0`: removes item
3. Otherwise: validates stock availability, sets new quantity

**Success `200`:**
```json
{
  "message": "Cart quantity updated.",
  "cart": { ...cartDocument }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Quantity is negative (non-zero) |
| `400` | Exceeds available stock |
| `404` | Cart not found |
| `404` | Item not found in cart |
| `404` | Product no longer available |

**DB Impact:** Reads `products`. Writes to `carts`.

---

### DELETE `/api/cart/:productId`

**URL Parameter:** `:productId`

**Request Body:**
```json
{
  "selectedVariant": { "color": "Grey", "size": "11" }
}
```

Variant fields must match exactly what was used when adding the item.

**Success `200`:**
```json
{
  "message": "Item removed from cart.",
  "cart": { ...cartDocument }
}
```

**Errors:**

| Code | When |
|---|---|
| `404` | Cart not found |
| `404` | Item not found in cart |

**DB Impact:** Writes to `carts`.

---

## 5. Orders

**Purpose:** Manages order lifecycle from checkout preview through placement and cancellation. Uses MongoDB sessions (transactions) to ensure atomicity.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/orders/checkout-summary` | Preview cart totals | JWT Required |
| `POST` | `/api/orders` | Place a COD or Razorpay order | JWT Required |
| `GET` | `/api/orders/myOrders` | Get all orders for current user | JWT Required |
| `GET` | `/api/orders/:id` | Get a single order | JWT Required |
| `DELETE` | `/api/orders/:id/cancel` | Cancel an order | JWT Required |

---

### POST `/api/orders/checkout-summary`

**Purpose:** Validates the current cart and returns a checkout summary without creating an order.

**Success `200`:**
```json
{
  "message": "Checkout summary generated successfully.",
  "summary": {
    "items": [
      {
        "product": "6a66cfd6...",
        "name": "Running Sneakers",
        "image": "https://...",
        "quantity": 2,
        "purchasePrice": 2499,
        "selectedVariant": { "color": "Grey", "size": "11" }
      }
    ],
    "totalItemsCount": 1,
    "totalAmount": 4998
  }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Cart is empty |
| `400` | Any cart item is unavailable or out of stock |

**DB Impact:** Reads `carts`, `products`.

---

### POST `/api/orders`

**Request Body:**
```json
{
  "addressId": "6a77dd...",
  "paymentMethod": "COD"
}
```

| Field | Required | Values |
|---|---|---|
| `addressId` | ✅ | Valid ObjectId from user's saved addresses |
| `paymentMethod` | ✅ | `"COD"` or `"Razorpay"` |

> **Note:** For `"Razorpay"` payment flow, use `POST /api/payment/create-order` and `POST /api/payment/verify` instead. This endpoint handles both but Razorpay flow is normally completed via the payment routes.

**Business Logic (atomic transaction):**
1. Validates `paymentMethod` and `addressId`
2. Loads user and verifies address exists in profile
3. Loads cart with populated products
4. Calls `validateAndCalculateCart()`:
   - Verifies each product is still active
   - Resolves variant, checks stock
   - Calculates live price (variant price or sale/base price)
   - Builds `itemsSnapshot` (frozen copy of prices at time of order)
5. Creates `Order` document with snapshot
6. Decrements stock: `variants.$.stock` for variant items, `globalStock` for non-variant items
7. Clears `cart.items` and resets `cartSubtotal` to 0
8. Commits transaction

**Success `201`:**
```json
{
  "message": "Order placed successfully.",
  "orderId": "6b8812...",
  "orderStatus": "placed",
  "paymentStatus": "pending",
  "totalAmount": 4998
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid payment method |
| `400` | Missing or invalid `addressId` |
| `400` | Cart is empty |
| `400` | Any stock validation fails |
| `404` | User or address not found |
| `500` | Server error (transaction rolled back) |

**DB Impact:** Reads `users`, `carts`, `products`. Writes to `orders`, `products` (stock), `carts`.

---

### GET `/api/orders/myOrders`

**Success `200`:**
```json
{
  "count": 3,
  "orders": [ ...orderDocuments ]
}
```

Orders sorted by `createdAt` descending (newest first).

**DB Impact:** Reads `orders`.

---

### GET `/api/orders/:id`

**URL Parameter:** `:id` — Order ObjectId

**Business Logic:** Verifies `order.user === req.user.id`. Users can only access their own orders.

**Success `200`:**
```json
{
  "order": {
    "_id": "6b8812...",
    "user": "6a66cd55...",
    "items": [ ...itemSnapshots ],
    "shippingAddress": { "fullName": "...", "phone": "...", ... },
    "totalAmount": 4998,
    "paymentMethod": "COD",
    "paymentStatus": "pending",
    "orderStatus": "placed",
    "createdAt": "2026-07-31T..."
  }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid ObjectId format |
| `403` | Order belongs to another user |
| `404` | Order not found |

**DB Impact:** Reads `orders`.

---

### DELETE `/api/orders/:id/cancel`

**URL Parameter:** `:id` — Order ObjectId

**Business Logic (atomic transaction):**
1. Validates `order.user === req.user.id`
2. Checks `orderStatus !== "cancelled"` (already cancelled)
3. Only allows cancellation if status is `"placed"` or `"processing"`
4. Restores stock: increments `variants.$.stock` or `globalStock` for each item
5. Sets `orderStatus = "cancelled"`
6. Commits transaction

**Success `200`:**
```json
{ "message": "Order cancelled successfully. Stock has been restored." }
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid ObjectId |
| `400` | Order already cancelled |
| `400` | Status is `"shipped"` or `"delivered"` (cannot cancel) |
| `403` | Not user's order |
| `404` | Order not found |
| `500` | Server error (transaction rolled back) |

**DB Impact:** Reads `orders`. Writes to `orders`, `products` (stock restored).

---

## 6. Payment

**Purpose:** Integrates with Razorpay to create payment orders and verify signatures before finalizing a paid order. Uses MongoDB sessions for atomicity.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/payment/create-order` | Create a Razorpay order from cart total | JWT Required |
| `POST` | `/api/payment/verify` | Verify payment signature and place order | JWT Required |

---

### POST `/api/payment/create-order`

**Purpose:** Step 1 of Razorpay flow. Calculates the cart total and creates a Razorpay payment order. The returned `order.id` is passed to the Razorpay SDK on the frontend.

**Request Body:** None required. Cart is loaded from the authenticated user's session.

**Business Logic:**
1. Loads and validates cart (calls `validateAndCalculateCart`)
2. Converts `totalAmount` to paise (`× 100`) as required by Razorpay
3. Creates Razorpay order with currency `INR`

**Success `200`:**
```json
{
  "order": {
    "id": "order_XyZabc123",
    "entity": "order",
    "amount": 499800,
    "currency": "INR",
    "receipt": "receipt_1722422400000",
    "status": "created"
  }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Cart is empty or stock validation fails |
| `500` | Razorpay API error or server error |

**DB Impact:** Reads `carts`, `products`.

---

### POST `/api/payment/verify`

**Purpose:** Step 2 of Razorpay flow. Verifies the Razorpay payment signature using HMAC-SHA256 and, if valid, finalizes and places the order.

**Request Body:**
```json
{
  "razorpay_order_id": "order_XyZabc123",
  "razorpay_payment_id": "pay_AbcXyz456",
  "razorpay_signature": "<hmac_sha256_signature>",
  "addressId": "6a77dd..."
}
```

| Field | Required | Description |
|---|---|---|
| `razorpay_order_id` | ✅ | Returned by Razorpay from `create-order` |
| `razorpay_payment_id` | ✅ | Returned by Razorpay after payment |
| `razorpay_signature` | ✅ | HMAC-SHA256 signature from Razorpay |
| `addressId` | ✅ | User's saved address ObjectId |

**Business Logic (atomic transaction):**
1. Validates `RAZORPAY_KEY_SECRET` env variable is set
2. Validates `addressId` format
3. Verifies all three Razorpay fields are present
4. Computes expected signature: `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id)`
5. Compares with `razorpay_signature` — rejects if mismatch
6. Loads user, cart, and selected address
7. Calls `executeOrderFinalization()` (shared service) which:
   - Creates `Order` document with `paymentStatus: "paid"`, `paymentMethod: "Razorpay"`
   - Decrements stock for each item
   - Clears cart
8. Commits transaction

**Success `200`:**
```json
{
  "message": "Payment verified successfully.",
  "orderId": "6b8812..."
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Missing address or payment fields |
| `400` | Invalid address format |
| `400` | Signature mismatch (payment tampered) |
| `400` | Cart empty or stock validation fails |
| `404` | User or address not found |
| `500` | `RAZORPAY_KEY_SECRET` not configured |
| `500` | Server error (transaction rolled back) |

**DB Impact:** Reads `users`, `carts`, `products`. Writes to `orders`, `products` (stock), `carts`.

---

## 7. Wishlist

**Purpose:** Saves products (with optional variant selection) to a user's personal wishlist. Each user has one wishlist document. The same product in different variants is stored as separate items.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/wishlist` | Add product/variant to wishlist | JWT Required |
| `GET` | `/api/wishlist` | Get user's full wishlist | JWT Required |
| `DELETE` | `/api/wishlist` | Remove product/variant from wishlist | JWT Required |

---

### POST `/api/wishlist`

**Request Body — Option A (Variant by ID):**
```json
{
  "productId": "6a66cfd63b0059c20575760a",
  "variantId": "6a6741a2b320910b2566a943"
}
```

**Request Body — Option B (Variant by Attributes):**
```json
{
  "productId": "6a66cfd63b0059c20575760a",
  "selectedVariant": { "color": "Grey", "size": "11" }
}
```

**Request Body — Option C (Direct Variant ID as productId):**
```json
{
  "productId": "6a6741a2b320910b2566a943"
}
```

**Request Body — Option D (Product-level, no variant):**
```json
{
  "productId": "6a66cfd63b0059c20575760a"
}
```

| Field | Required | Notes |
|---|---|---|
| `productId` | ✅ | Can be a parent product ID or a variant's embedded `_id` |
| `variantId` | ❌ | Explicit variant ObjectId |
| `selectedVariant` | ❌ | Object with `color` and/or `size` |

**Business Logic:**
1. Validates `productId` is a valid ObjectId
2. Resolves product — if not found as parent, searches as embedded variant ID
3. Resolves variant using `variantId`, `selectedVariant`, or auto-match from passed variant ID
4. Checks if item with same `product._id` + `variantId` already exists — returns `409` if so
5. Stores `{ product, selectedVariant: { variantId, color, size } }` in wishlist

**Success `200`:**
```json
{
  "message": "Product added to wishlist successfully.",
  "wishlist": { ...wishlistDocument }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Missing or invalid `productId` |
| `400` | Variant not found in product |
| `404` | Product not found or inactive |
| `409` | Product/variant already in wishlist |
| `500` | Server error |

**DB Impact:** Reads `products`. Writes to `wishlists`.

---

### GET `/api/wishlist`

**Business Logic:** Returns wishlist with populated product fields (`name`, `images`, `basePrice`, `salePrice`, `globalStock`, `variants`, `isActive`).

**Success `200`:**
```json
{
  "count": 2,
  "wishlist": {
    "_id": "...",
    "user": "6a66cd55...",
    "items": [
      {
        "product": {
          "_id": "6a66cfd6...",
          "name": "Running Sneakers",
          "images": ["https://..."],
          "basePrice": 2999,
          "salePrice": 2499,
          "variants": [...],
          "isActive": true
        },
        "selectedVariant": {
          "variantId": "6a6741a2...",
          "color": "Grey",
          "size": "11"
        },
        "addedAt": "2026-07-31T..."
      }
    ]
  }
}
```

If no wishlist exists yet, returns `{ "items": [] }`.

**DB Impact:** Reads `wishlists`, `products`.

---

### DELETE `/api/wishlist`

**Request Body — Remove specific variant:**
```json
{
  "productId": "6a66cfd63b0059c20575760a",
  "variantId": "6a6741a2b320910b2566a943"
}
```

**Request Body — Remove all entries for a product (no variant):**
```json
{
  "productId": "6a66cfd63b0059c20575760a"
}
```

**Business Logic:**
- If `variantId` is provided: removes only the specific variant entry
- If no `variantId`: removes all wishlist items for that product

**Success `200`:**
```json
{
  "message": "Item removed from wishlist successfully.",
  "wishlist": { ...wishlistDocument }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Missing or invalid `productId` |
| `400` | Invalid `variantId` format |
| `404` | Wishlist not found |
| `404` | Item not found in wishlist |
| `500` | Server error |

**DB Impact:** Writes to `wishlists`.

---

## 8. Reviews

**Purpose:** Allows users to submit, view, edit, and delete reviews for products. Reviews are variant-aware — a user may submit one review per product variant. Purchase verification is enforced before any review is accepted.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/review/:productId` | Get all reviews for a product | Public |
| `POST` | `/api/review` | Submit a new review | JWT Required |
| `PUT` | `/api/review/:reviewId` | Update own review | JWT Required |
| `DELETE` | `/api/review/:reviewId` | Delete own review | JWT Required |

---

### GET `/api/review/:productId`

**URL Parameter:** `:productId` — Parent product ObjectId or any embedded variant ObjectId.

**Business Logic:** If the passed ID is a variant ID (not found as a product), the backend resolves the parent product and returns all reviews for that parent product.

**Success `200`:**
```json
{
  "count": 2,
  "reviews": [
    {
      "_id": "6a6c5fd9...",
      "user": { "_id": "6a66cd55...", "name": "John Doe" },
      "product": "6a66cfd6...",
      "selectedVariant": {
        "variantId": "6a6741a2...",
        "color": "Grey",
        "size": "11"
      },
      "rating": 4,
      "comment": "Great shoes after 2 weeks!",
      "createdAt": "2026-07-31T..."
    }
  ]
}
```

Reviews sorted by `createdAt` descending.

**DB Impact:** Reads `reviews`, `products`.

---

### POST `/api/review`

**Request Body — Option A (Variant by ID):**
```json
{
  "productId": "6a66cfd63b0059c20575760a",
  "variantId": "6a6741a2b320910b2566a943",
  "rating": 5,
  "comment": "Excellent quality!"
}
```

**Request Body — Option B (Variant ID passed as productId):**
```json
{
  "productId": "6a6741a2b320910b2566a943",
  "rating": 4,
  "comment": "Great fit."
}
```

**Request Body — Option C (Product-level, no variant):**
```json
{
  "productId": "6a66cfd63b0059c20575760a",
  "rating": 5,
  "comment": "Excellent product!"
}
```

| Field | Required | Rules |
|---|---|---|
| `productId` | ✅ | Parent product or variant ObjectId |
| `rating` | ✅ | Integer between 1 and 5 |
| `comment` | ✅ | Non-empty string |
| `variantId` | ❌ | Explicit variant ObjectId |
| `selectedVariant` | ❌ | Object with `color` and/or `size` |

**Business Logic:**
1. Validates `productId`, `rating` (1–5 integer), `comment`
2. Resolves product (parent or via variant ID lookup)
3. Resolves matched variant if any variant info provided
4. **Purchase Verification:** Checks `orders` collection for an order by this user containing this product + variant (matches by `variantId` OR `color`/`size` for legacy orders)
5. **Duplicate Check:** Ensures no existing review for same user + product + variant combination
6. Saves review with `selectedVariant` snapshot (`variantId`, `color`, `size`)
7. Recalculates and updates `product.averageRating` (average of all reviews for that product)

**Success `201`:**
```json
{
  "message": "Review posted successfully.",
  "review": {
    "_id": "6a6c5fd9...",
    "user": "6a66cd55...",
    "product": "6a66cfd6...",
    "selectedVariant": {
      "variantId": "6a6741a2...",
      "color": "Grey",
      "size": "11"
    },
    "rating": 5,
    "comment": "Excellent quality!",
    "createdAt": "2026-07-31T..."
  }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Missing fields or rating out of range |
| `400` | Invalid variant identifier |
| `400` | Variant does not belong to this product |
| `403` | User has not purchased this product/variant |
| `404` | Product not found or inactive |
| `409` | Review already exists for this product/variant |
| `500` | Server error |

**DB Impact:** Reads `products`, `orders`, `reviews`. Writes to `reviews`, `products` (`averageRating`).

---

### PUT `/api/review/:reviewId`

**URL Parameter:** `:reviewId` — Review ObjectId

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated: Very comfortable after a month of use."
}
```

Both fields are required.

**Business Logic:**
1. Validates `reviewId` format
2. Validates `rating` and `comment`
3. Verifies `review.user === req.user.id` (only own reviews)
4. Updates rating and comment
5. Recalculates `product.averageRating`

**Success `200`:**
```json
{
  "message": "Review updated successfully.",
  "review": { ...updatedReview }
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid `reviewId` format |
| `400` | Invalid rating or missing comment |
| `403` | Review belongs to another user |
| `404` | Review not found |
| `500` | Server error |

**DB Impact:** Reads `reviews`. Writes to `reviews`, `products` (`averageRating`).

---

### DELETE `/api/review/:reviewId`

**URL Parameter:** `:reviewId` — Review ObjectId

**Business Logic:**
1. Verifies `review.user === req.user.id`
2. Deletes the review
3. Recalculates `product.averageRating` (if no reviews remain, resets to `0`)

**Success `200`:**
```json
{ "message": "Review deleted successfully. Ratings recalculated." }
```

**Errors:**

| Code | When |
|---|---|
| `403` | Review belongs to another user |
| `404` | Review not found |
| `500` | Server error |

**DB Impact:** Reads `reviews`. Writes to `reviews`, `products` (`averageRating`).

---

## 9. Addresses

**Purpose:** Manages saved delivery addresses embedded within the user's profile document. Each user can have multiple addresses; exactly one is marked as `isDefault`. The first address added is automatically set as default.

**Routes:**

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/user/address` | Add a new address | JWT Required |
| `GET` | `/api/user/address` | Get all saved addresses | JWT Required |
| `PUT` | `/api/user/address/:addressId` | Update an address | JWT Required |
| `DELETE` | `/api/user/address/:addressId` | Delete an address | JWT Required |
| `PATCH` | `/api/user/address/:addressId/default` | Set an address as default | JWT Required |

---

### POST `/api/user/address`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phone": "9876543210",
  "houseBuilding": "12A, Green Apartments",
  "streetArea": "MG Road",
  "landmark": "Near City Mall",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "pincode": "560001",
  "addressType": "Home"
}
```

| Field | Required | Notes |
|---|---|---|
| `fullName` | ✅ | |
| `phone` | ✅ | |
| `houseBuilding` | ✅ | House/flat number and building name |
| `streetArea` | ✅ | Street or area name |
| `city` | ✅ | |
| `state` | ✅ | |
| `pincode` | ✅ | |
| `landmark` | ❌ | Defaults to `""` |
| `country` | ❌ | Defaults to `"India"` |
| `addressType` | ❌ | `"Home"`, `"Office"`, `"Hostel"`, or `"Other"`. Defaults to `"Home"` |

**Business Logic:** If this is the user's first address, `isDefault` is automatically set to `true`.

**Success `201`:**
```json
{
  "message": "Address added successfully.",
  "address": { ...newAddress },
  "count": 2,
  "addresses": [ ...allAddresses ]
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Any required field is missing |
| `404` | User not found |
| `500` | Server error |

**DB Impact:** Reads `users`. Writes embedded address to `users`.

---

### GET `/api/user/address`

**Success `200`:**
```json
{
  "count": 2,
  "addresses": [
    {
      "_id": "6a77dd...",
      "fullName": "John Doe",
      "phone": "9876543210",
      "houseBuilding": "12A, Green Apartments",
      "streetArea": "MG Road",
      "landmark": "Near City Mall",
      "city": "Bangalore",
      "state": "Karnataka",
      "country": "India",
      "pincode": "560001",
      "addressType": "Home",
      "isDefault": true
    }
  ]
}
```

**DB Impact:** Reads `users`.

---

### PUT `/api/user/address/:addressId`

**URL Parameter:** `:addressId` — Embedded address `_id`

**Request Body:** Any subset of address fields (partial update supported via `??` operator):

```json
{
  "phone": "9000000000",
  "pincode": "560002"
}
```

All fields are optional — only provided fields are updated.

**Success `200`:**
```json
{
  "message": "Address updated successfully.",
  "addresses": [ ...allAddresses ]
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid `addressId` format |
| `404` | User or address not found |
| `500` | Server error |

**DB Impact:** Reads and writes `users`.

---

### DELETE `/api/user/address/:addressId`

**URL Parameter:** `:addressId`

**Business Logic:** If the deleted address was the default, the first remaining address is automatically promoted to default.

**Success `200`:**
```json
{
  "message": "Address deleted successfully.",
  "addresses": [ ...remainingAddresses ]
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid `addressId` format |
| `404` | User or address not found |
| `500` | Server error |

**DB Impact:** Reads and writes `users`.

---

### PATCH `/api/user/address/:addressId/default`

**URL Parameter:** `:addressId`

**Business Logic:** Sets all addresses to `isDefault: false`, then sets the target address to `isDefault: true`.

**Success `200`:**
```json
{
  "message": "Default address updated successfully.",
  "addresses": [ ...allAddresses ]
}
```

**Errors:**

| Code | When |
|---|---|
| `400` | Invalid `addressId` format |
| `404` | User or address not found |
| `500` | Server error |

**DB Impact:** Reads and writes `users`.

---

## 10. Flow Diagrams

### Complete Purchase Flow (COD)

```
Customer registers / logs in
        ↓
    GET /api/products
    Browse product catalog
        ↓
    GET /api/products/:id
    View product details + variants
        ↓
    POST /api/cart
    Add product (with selected variant) to cart
        ↓
    GET /api/cart
    View cart — prices + stock auto-synced
        ↓
    GET /api/user/address
    Select a saved delivery address
         (or POST /api/user/address to add one)
        ↓
    POST /api/orders/checkout-summary
    Preview cart total and item snapshot
        ↓
    POST /api/orders  { addressId, paymentMethod: "COD" }
    ├── Validates cart + stock
    ├── Creates Order document (snapshot)
    ├── Decrements product stock
    ├── Clears cart
    └── Returns orderId
        ↓
    GET /api/orders/myOrders
    View order history
```

---

### Complete Purchase Flow (Razorpay)

```
POST /api/cart  →  Add items to cart
        ↓
POST /api/payment/create-order
    ├── Calculates cart total
    └── Creates Razorpay order → returns { order.id, amount }
        ↓
    [Frontend] Razorpay SDK opens payment modal
        ↓
    [Razorpay] Payment processed
    Returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        ↓
POST /api/payment/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId }
    ├── HMAC-SHA256 signature verification
    ├── Creates Order document (paymentStatus: "paid")
    ├── Decrements product stock
    ├── Clears cart
    └── Returns orderId
        ↓
    GET /api/orders/:id  →  View order confirmation
```

---

### Order Cancellation Flow

```
GET /api/orders/myOrders  →  Find order to cancel
        ↓
DELETE /api/orders/:id/cancel
    ├── Validates ownership
    ├── Checks status is "placed" or "processing"
    ├── Restores stock for each item
    └── Sets orderStatus = "cancelled"
```

---

### Wishlist Flow

```
GET /api/products  →  Browse products
        ↓
POST /api/wishlist  { productId, variantId? }
    ├── Resolves product and variant
    ├── Checks for duplicate
    └── Stores { product, selectedVariant } in wishlist
        ↓
GET /api/wishlist  →  View saved items (with populated product data)
        ↓
[Add to Cart from Wishlist]
POST /api/cart  { productId, selectedVariant }
        ↓
DELETE /api/wishlist  { productId, variantId? }  →  Remove from wishlist
```

---

### Review Flow

```
GET /api/orders/myOrders  →  Confirm product was purchased
        ↓
POST /api/review  { productId, variantId?, rating, comment }
    ├── Resolves product and variant
    ├── Verifies purchase in orders collection
    ├── Checks no duplicate review exists for this variant
    ├── Saves review with variant snapshot
    └── Recalculates product.averageRating
        ↓
GET /api/review/:productId  →  View all reviews (public)
        ↓
PUT /api/review/:reviewId  →  Edit own review → Recalculates averageRating
        ↓
DELETE /api/review/:reviewId  →  Delete own review → Recalculates averageRating
```

---

### Address Management Flow

```
POST /api/user/address  →  Add address (first one auto-set as default)
        ↓
GET /api/user/address  →  View all addresses
        ↓
PATCH /api/user/address/:id/default  →  Change default address
        ↓
PUT /api/user/address/:id  →  Edit address fields
        ↓
DELETE /api/user/address/:id  →  Remove address (next one auto-promoted to default)
```

---

*End of API Design Document*
