# Engineering Progress & Development Log

> **Project:** E-Commerce Monorepo Backend (MERN Stack)  
> **Repository:** `online-store-mern`  
> **Document Version:** 2.0.0  
> **Last Updated:** July 31, 2026  
> **Author:** Software Engineering Team & Technical Documentation Lead

---

## Executive Summary & System Overview

The **MERN E-Commerce Backend** is a production-ready, highly available RESTful API service built using **Node.js, Express.js, MongoDB, and Mongoose**. Designed with strict MVC separation of concerns, it supports full variant-aware shopping experiences, real-time inventory locking, atomic order transactions, verified purchase product reviews, embedded user address management, and Razorpay payment gateway integration.

---

## Project Statistics & Metrics

### Codebase Inventory

| Component Type | Count | List / Identifiers |
|---|---|---|
| **Controllers** | **8** | `authController`, `addressController`, `productController`, `cartController`, `orderController`, `paymentControllers`, `wishlistController`, `reviewController` |
| **Routes** | **8** | `authRoutes`, `addressRoutes`, `productRoutes`, `cartRoutes`, `orderRoutes`, `paymentRoutes`, `wishlistRoutes`, `reviewRoutes` |
| **Mongoose Models** | **5** | `User` (includes embedded `AddressSchema`), `Product` (includes embedded `VariantSchema`), `Cart`, `Order`, `Review`, `Wishlist` |
| **Middleware Modules** | **1** | `authMiddleware` (`protect`, `adminOnly`) |
| **Services** | **2** | `orderService` (`executeOrderFinalization`), `razorpayServices` (`razorpayInstance`) |
| **Utilities** | **2** | `variantUtils` (`isObjectId`, `getRequestedVariantId`, `hasVariantAttributes`, `getVariantByAttributes`), `generateToken` |

### Core Feature Completion Status

| Module / Feature | Status | Completion % |
|---|---|---|
| **User Authentication & Profiles (JWT)** | Completed | 100% |
| **Embedded Address Management** | Completed | 100% |
| **Product & Variant Catalog (Slug & Stock)** | Completed | 100% |
| **Cart Management & Stock/Price Sync** | Completed | 100% |
| **Atomic Order Processing & Stock Reduction** | Completed | 100% |
| **Order Cancellation & Stock Restoration** | Completed | 100% |
| **Razorpay Payment Integration & Verification** | Completed | 100% |
| **Variant-Aware Wishlist** | Completed | 100% |
| **Verified-Purchase Product Reviews & Ratings** | Completed | 100% |
| **V1 Production Release Target** | **READY** | **100%** |

---

## Chronological Development Timeline & Stages

---

### Stage 1: Architecture Planning & Base Setup
- **Focus:** Project setup, directory structure creation, initial system documentation, database configuration.
- **Commits:** `c1a8d8f`, `52c6189`, `952790c`, `7d8c6f0`, `815dd2b`
- **Features & Implementation:**
  - Initialized Express.js server on Node.js (`server.js`).
  - Configured environment variables loading via `dotenv`.
  - Configured MongoDB Atlas connection using Mongoose (`config/db.js`).
  - Created project documentation structure under `docs/` (`01-requirements.md`, `03-database-design.md`, `04-api-design.md`, `05-architecture.md`).
- **Architectural Decisions:**
  - Standardized on ES Modules (`import`/`export` syntax) across the codebase.
  - Selected MVC pattern separating routes, controllers, models, and service helpers.
- **Problems Solved & Lessons Learned:**
  - Secured database connection string handling via `.env` to prevent credential exposure in Git history.

---

### Stage 2: Database Schema Architecture & Core Models
- **Focus:** Building foundational Mongoose models.
- **Commits:** `bf9f9c1`, `58b8121`, `a5d7300`, `a80f5b`
- **Features & Implementation:**
  - **User & Address Model (`userModel.js`):** Embedded address sub-documents into the `User` model, allowing multiple delivery locations per customer with an `isDefault` flag.
  - **Product Model (`productModel.js`):** Built catalog schema with embedded `variants` array (color, size, price, stock), slug generation via Mongoose `pre('save')` hooks, and soft-delete support (`isActive`).
  - **Cart Model (`cartModel.js`):** Embedded items containing product reference, quantity, selected variant, price snapshot, and `cartSubtotal` calculation hook.
  - **Order Model (`orderModel.js`):** Built order snapshot model capturing customer details, payment status, order status, shipping address snapshot, and purchased item list.
- **Architectural Decisions:**
  - Selected sub-document embedding for addresses and product variants to eliminate multi-collection JOIN query overhead for hot read paths.
- **Problems Solved:**
  - Fixed initial user address schema validation to ensure default flags are correctly managed without schema duplication.

---

### Stage 3: Authentication & Identity Management
- **Focus:** User registration, password encryption, JWT authorization pipeline.
- **Commits:** `7151709`, `9480bc0`, `65996b1`, `1c552da`, `e6b2dda`, `833ceb6`, `b72ec6e`, `b1ca744`
- **Features & Implementation:**
  - **Password Hashing:** Integrated `bcryptjs` for secure password hashing (10 salt rounds) inside user registration.
  - **Token Generator Utility:** Created reusable JWT generator (`utils/generateToken.js`) issuing 2-day expiration bearer tokens.
  - **Authentication Middleware (`authMiddleware.js`):**
    - `protect`: Extracts and verifies HTTP `Authorization: Bearer <token>` header, attaching user context to `req.user`.
    - `adminOnly`: Restricts administrative routes to users with `role: "admin"`.
- **Problems Solved & Fixes:**
  - Unified token generation across login and registration controllers to adhere to the DRY principle.

---

### Stage 4: Product Catalog & Administrative Management
- **Focus:** Public browsing and administrative CRUD APIs.
- **Commits:** `f447249`, `55a843e`, `607e82f`, `4cf813a`, `0d6b4c9`
- **Features & Implementation:**
  - Implemented `GET /api/products` (active products list) and `GET /api/products/:id` (single product detail).
  - Built administrative product creation `POST /api/products` with automated slug creation.
  - Developed full product modification `PUT /api/products/:id` and soft-delete `DELETE /api/products/:id`.
  - Created granular variant update endpoint `PATCH /api/products/:productId/variants/:variantId` for price/stock adjustments.
- **Architectural Decisions:**
  - Adopted soft deletion (`isActive: false`) for products to ensure historical orders remain consistent and reference existing products.

---

### Stage 5: Cart Management & Live Synchronization
- **Focus:** Customer shopping cart operations with real-time validation.
- **Commits:** `f532b5f`, `b187430`
- **Features & Implementation:**
  - Implemented `GET /api/cart`, `POST /api/cart`, `PUT /api/cart/:productId`, and `DELETE /api/cart/:productId`.
  - Built **Cart Synchronization Logic**: Every call to `GET /api/cart` dynamically inspects item availability, syncs modified prices, removes inactive products, and clamps requested quantities against current live stock.
- **Problems Solved:**
  - Handled edge cases where product prices or stock change while an item resides in a customer's active cart.

---

### Stage 6: Customer Order Lifecycle & Inventory Control
- **Focus:** Order placement, checkout summaries, stock reservation, cancellation.
- **Commits:** `636c4d4`, `2f55298`, `0bd6d1d`, `ee4d59c`
- **Features & Implementation:**
  - Built `POST /api/orders/checkout-summary` to generate cart snapshot totals before placement.
  - Implemented `POST /api/orders` for COD order placement backed by Mongoose database transactions (`startSession`).
  - Automated stock inventory reduction: decrements `variants.$.stock` for variant items or `globalStock` for non-variant items.
  - Implemented `GET /api/orders/myOrders` and `GET /api/orders/:id`.
  - Developed `DELETE /api/orders/:id/cancel` order cancellation endpoint which restores stock to product inventory inside an atomic transaction.

---

### Stage 7: Razorpay Payment Gateway & Order Service Layer
- **Focus:** Secure online payment processing and service modularization.
- **Commits:** `a8a0f5b`, `d6ff1d5`, `ee4d59c`
- **Features & Implementation:**
  - Created `services/razorpayServices.js` to initialize the Razorpay SDK instance.
  - Implemented `POST /api/payment/create-order` to generate Razorpay orders in paise.
  - Developed `POST /api/payment/verify` with HMAC-SHA256 signature verification.
  - **Service Layer Extraction:** Extracted order creation logic into `services/orderService.js` (`executeOrderFinalization`) to share order completion logic cleanly between COD and Razorpay payment flows.

---

### Stage 8: Variant-Aware Wishlist System
- **Focus:** Customer wishlist management with variant differentiation.
- **Commits:** `d93056b`, `cc643b2`
- **Features & Implementation:**
  - Created `Wishlist` schema (`models/wishlistModel.js`) linking a user to wishlist items.
  - Built `POST /api/wishlist`, `GET /api/wishlist`, and `DELETE /api/wishlist`.
  - Made wishlist system variant-aware: customers can store the same product in distinct color/size configurations separately without collision.

---

### Stage 9: Verified Purchase Product Reviews & Ratings
- **Focus:** Product ratings and review safeguards.
- **Commits:** `a7dba57`, `758a3cf`
- **Features & Implementation:**
  - Created `Review` schema (`models/reviewModel.js`) with compound index on `user`, `product`, and variant fields.
  - Built `POST /api/review`, `GET /api/review/:productId`, `PUT /api/review/:reviewId`, and `DELETE /api/review/:reviewId`.
  - **Verified Purchase Safeguard:** Enforced check against `Order` records before accepting a review.
  - **Automated Rating Average:** Dynamically recalculates `product.averageRating` after creation, update, or deletion of any review.

---

### Stage 10: Address Management & Testing Verification
- **Focus:** Address profile management, route integration, API validation.
- **Commits:** `7adc2d9`, `3658830`, `5247735`, `aad2a89`
- **Features & Implementation:**
  - Implemented `POST /api/user/address`, `GET /api/user/address`, `PUT /api/user/address/:addressId`, `DELETE /api/user/address/:addressId`, and `PATCH /api/user/address/:addressId/default`.
  - Integrated `addressRoutes.js` under `/api/user/address`.
  - Implemented automatic promotion: setting a new default unsets prior defaults; deleting a default address automatically promotes the next available address.

---

### Stage 11: CI/CD Pipeline & GitHub Workflows
- **Focus:** Automated testing and integration workflow setup.
- **Commits:** `9315b2c`, `3360258`
- **Features & Implementation:**
  - Configured `.github/workflows/` for automated backend integration testing.
  - Updated `package.json` with scripts for production deployment and linting.

---

### Stage 12: Production Refactoring & Standardizations
- **Focus:** Production code cleanup, utility extraction, status code consistency, dead code removal.
- **Commits:** `3138602`, `c2ed59a`
- **Features & Implementation:**
  - **Utility Extraction (`utils/variantUtils.js`):** Centralized variant lookup, attribute matching, and ID validation across `reviewController` and `wishlistController`.
  - **Status Code Standardizations:** Corrected duplicate resource responses from `400` to `409 Conflict` (registration, reviews, wishlist). Fixed `getOrderById` 404 response codes.
  - **Missing Route Registration:** Registered missing `DELETE /api/orders/:id/cancel` route in `orderRoutes.js`.
  - **Dead Code Cleanup:** Removed legacy commented-out functions (`placeOrderCOD`, `pre-save` address hooks) and unused imports (`Product` in `paymentControllers.js`).
  - **Security & Error Handling:** Prevented raw Mongoose error leaking in product updates; standardized error messages across all controllers.
  - **Documentation Overhaul:** Fully rewritten `04-api-design.md` and `06-Progress-log.md`.

---

## Architectural Evolution & Technical Design Patterns

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Express Application                           │
├────────────┬────────────┬────────────┬───────────┬───────────┬─────────┤
│    Auth    │  Products  │    Cart    │  Orders   │  Payment  │ Review/ │
│ Controller │ Controller │ Controller │Controller │Controller │ Wishlist│
└─────┬──────┴─────┬──────┴─────┬──────┴─────┬─────┴─────┬─────┴────┬────┘
      │            │            │            │           │          │
      ▼            ▼            ▼            ▼           ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐ ┌───────────┐
│   JWT    │ │ Product  │ │   Cart   │ │  Order Service /  │ │  Variant  │
│ Auth Mod │ │ Pre-Save │ │ Subtotal │ │ Mongoose Sessions │ │ Utilities │
└──────────┘ └──────────┘ └──────────┘ └───────────────────┘ └───────────┘
```

1. **Service Layer Pattern:** Extracted checkout execution (`orderService.js`) out of controllers to keep order creation unified across payment channels.
2. **Atomic Financial & Stock Operations:** Utilized MongoDB Multi-Document Transactions (`mongoose.startSession()`) to guarantee stock changes and order records update atomically.
3. **Data Snapshot Pattern:** Orders freeze purchased product names, images, prices, and shipping addresses at the exact second of purchase, protecting historical receipts against future vendor edits.

---

## Engineering Lessons Learned

1. **Database Transactions & Sessions:**
   - *Lesson:* Operations involving multi-document updates (e.g., placing an order while decrementing stock and clearing a cart) must use Mongoose transactions (`session`). Otherwise, partial failures leave database states corrupted.

2. **Snapshot vs. Live Reference:**
   - *Lesson:* Shopping carts require live referencing to sync stock and prices, whereas orders require immutable static snapshots so past invoice amounts do not alter when catalog prices change.

3. **Status Code Precision:**
   - *Lesson:* Distinguishing between `400 Bad Request` (client input error), `404 Not Found` (missing resource), and `409 Conflict` (duplicate review or wishlist item) significantly improves client-side handling and developer experience.

4. **DRY Principle in Controllers:**
   - *Lesson:* Duplicating variant resolution algorithms across multiple domain controllers (reviews, wishlist, cart) introduces drift bugs. Consolidating into `utils/variantUtils.js` eliminates maintenance overhead.

5. **Secrets & Git Management:**
   - *Lesson:* Environment variables (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `MOGODB_URL`) must never be hardcoded or committed to version control. Centralized loading in `server.js` keeps application modules secure.

---

## Remaining Work & Future Roadmap (V2 Preview)

While **Version 1.0.0** of the backend API is feature-complete and production-ready, the following enhancements are scheduled for Version 2:

- [ ] **Pagination & Filtering:** Implement cursor-based pagination for `GET /api/products` and `GET /api/orders/myOrders`.
- [ ] **Declarative Validation Middleware:** Integrate `Joi` or `Zod` schema validation to replace manual controller body checks.
- [ ] **Structured Logging:** Replace `console.error` calls with a production logger (`Winston` or `Pino`).
- [ ] **Rate Limiting:** Implement `express-rate-limit` on authentication endpoints to prevent brute-force attacks.
- [ ] **Full-Text Product Search:** Leverage MongoDB text indexes for multi-field catalog searching.
