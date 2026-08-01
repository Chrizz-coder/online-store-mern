# Architecture Review & System Evaluation

> **Target Workspace:** E-Commerce Monorepo Backend (`backend/src`)  
> **Audit Date:** July 31, 2026  
> **Architecture Pattern:** MVC (Model-View-Controller) with Express.js & Mongoose

---

## Executive Overview

This report presents an architectural evaluation of the Node.js/Express backend codebase. It assesses pattern adherence, separation of concerns, service isolation, coupling, scalability, and technical debt. A dedicated **Duplicated Logic Audit** section highlights repeated business logic across controllers and recommends refactoring targets into reusable utility services.

---

## 1. Confirmed Issues

### ARCH-01: Incomplete Service Layer Isolation & Leaky Controller Abstractions

* **Confidence Level:** High
* **Location:** `backend/src/controllers/orderController.js`, `backend/src/controllers/cartController.js`, `backend/src/controllers/paymentControllers.js`
* **Evidence:**
  ```javascript
  // orderController.js contains core business logic:
  export const validateAndCalculateCart = (cart) => { ... };

  // paymentControllers.js imports business logic directly from orderController.js:
  import { validateAndCalculateCart } from "./orderController.js";
  import { executeOrderFinalization } from "../services/orderService.js";
  ```
* **Why It Is a Problem:** Controllers should be transport-layer handlers responsible for HTTP request parsing and response formatting. In this codebase, `orderController.js` defines business domain rules (`validateAndCalculateCart`) that are imported across controller boundaries by `paymentControllers.js`. Meanwhile, `orderService.js` exists but only encapsulates `executeOrderFinalization`.
* **Impact:** Tight coupling between controllers, fragmented business logic, and inability to test business rules independently of Express `req`/`res` objects.
* **Recommendation:** Consolidate all domain logic (`validateAndCalculateCart`, `executeOrderFinalization`, stock reservation) into `backend/src/services/orderService.js` and keep controllers strictly focused on HTTP routing and status codes.

---

### ARCH-02: Tight Coupling Between Auth Middleware and Database Storage

* **Confidence Level:** High
* **Location:** `backend/src/middleware/authMiddleware.js`
* **Evidence:**
  ```javascript
  // lines 16-17
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");
  ```
* **Why It Is a Problem:** Every authenticated HTTP request triggers a blocking MongoDB `User.findById` database query inside `authMiddleware.js`. This tightly couples authentication middleware directly to database availability and introduces a database I/O overhead on every protected endpoint.
* **Impact:** Reduced throughput on high-traffic endpoints (e.g. browsing cart, viewing wishlist) due to redundant database queries.
* **Recommendation:** Trust stateless JWT claims for basic user identification (`req.user = { id: decoded.id, role: decoded.role }`) or cache active user sessions in an in-memory store (e.g. Redis) for fast session validation.

---

## 2. Potential Risks

### ARCH-03: Duplicated Logic Audit Matrix

The following repeated logic patterns were identified across multiple controllers and services:

| Logic Domain | Duplicate Instances | Locations | Recommended Refactoring Target |
|---|---|---|---|
| **ObjectId Validation** | 6 instances | `productController.js`, `orderController.js`, `addressController.js`, `reviewController.js`, `wishlistController.js`, `paymentControllers.js` | Extracted to `variantUtils.js` (`isObjectId`), but remaining controllers use inline `mongoose.Types.ObjectId.isValid()`. Centralize in `utils/validationUtils.js`. |
| **Variant Identification & Matching** | 4 instances | `cartController.js`, `orderController.js`, `reviewController.js`, `wishlistController.js` | `reviewController.js` and `wishlistController.js` use `variantUtils.js`, but `cartController.js` and `orderController.js` use custom inline `find()` loops matching `color` and `size`. Unify variant resolution in `services/variantService.js`. |
| **Address Payload Validation** | 2 instances | `addressController.js` (`validateAddressFields`), `orderController.js` (inline checking) | Create `services/addressService.js` or export address validation schema via `utils/validators.js`. |
| **Stock & Price Validation** | 3 instances | `cartController.js`, `orderController.js`, `paymentControllers.js` | Duplicate logic for verifying whether `salePrice || basePrice` or `variant.price` applies. Consolidate into `services/pricingService.js`. |
| **Cart Subtotal Calculation** | 2 instances | `cartModel.js` (pre-save hook), `orderController.js` (`validateAndCalculateCart`) | Cart subtotal math is performed both in Mongoose pre-save hooks and manually in checkout functions. Standardize on domain calculator in `services/cartService.js`. |

---

## 3. Structural Evaluation & SOLID Principles

### Evaluation Matrix

```
┌─────────────────────────────────────────────────────────┐
│              MVC ARCHITECTURE EVALUATION                │
├──────────────────────┬──────────────────────────────────┤
│ Pattern Component    │ Compliance Score & Status        │
├──────────────────────┼──────────────────────────────────┤
│ Models               │ 8 / 10 — Well-structured schemas │
│ Controllers          │ 6 / 10 — Overloaded responsibilities│
│ Service Layer        │ 4 / 10 — Underutilized/fragmented│
│ Middleware           │ 7 / 10 — Good auth, missing error│
│ Utilities            │ 6 / 10 — Good variant helpers    │
└──────────────────────┴──────────────────────────────────┘
```

#### 1. Single Responsibility Principle (SRP)
* **Status:** Partially Violated
* **Analysis:** Controllers handle HTTP routing, input validation, DB queries, inventory calculations, and error formatting within single functions (e.g. `cartController.js` `viewCart` is 60 lines long handling product hydration, stock clamping, price verification, and response returning).

#### 2. Open/Closed Principle (OCP)
* **Status:** Compliant
* **Analysis:** Mongoose models and Express router modules allow adding new features (e.g. Wishlist, Reviews) without modifying existing route files.

#### 3. Liskov Substitution Principle (LSP)
* **Status:** N/A
* **Analysis:** Standard JavaScript functional exports; class hierarchies are not utilized.

#### 4. Interface Segregation Principle (ISP)
* **Status:** Compliant
* **Analysis:** Middleware functions (`protect`, `adminOnly`) maintain clean, minimal handler signatures.

#### 5. Dependency Inversion Principle (DIP)
* **Status:** Violated
* **Analysis:** Controllers directly import Mongoose models (`Product`, `Cart`, `User`) rather than depending on data access abstractions or repository services.

---

## 4. Architectural Strengths & Technical Debt

### Architectural Strengths
1. **Clean Route Modularization:** Clear 1:1 mapping between domain routes (`authRoutes.js`, `productRoutes.js`, `cartRoutes.js`) and controllers.
2. **Variant Utility Extraction:** Recent creation of `variantUtils.js` demonstrates an effort to consolidate variant identification helper methods.
3. **Mongoose Pre-Hooks:** `cartModel.js` uses pre-save hooks for automated subtotal calculations, keeping cart totals synchronized at the model level.
4. **Database Indexing Awareness:** Models define basic indexes (`unique: true` on user cart and user wishlist).

### Technical Debt Inventory
1. **Controller-to-Controller Imports:** `paymentControllers.js` importing functions from `orderController.js` creates inter-controller coupling.
2. **Missing Repository / Data Access Layer:** Database queries (`Product.find`, `Cart.findOne`) are written directly in controller bodies.
3. **Absence of DTOs (Data Transfer Objects):** Express `req.body` objects are passed directly into Mongoose constructors without structural sanitization.

---

## Recommended Architecture Target (V1.1 - V2)

```
backend/src/
├── config/
│   └── db.js
├── controllers/       <-- Transport Layer (HTTP request/response ONLY)
│   ├── authController.js
│   ├── cartController.js
│   ├── orderController.js
│   └── ...
├── services/          <-- Business & Domain Logic Layer
│   ├── authService.js
│   ├── cartService.js
│   ├── orderService.js
│   ├── pricingService.js
│   └── variantService.js
├── models/            <-- Data Persistence Schemas
│   ├── userModel.js
│   └── ...
├── middleware/        <-- Infrastructure Cross-Cutting Concerns
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── rateLimitMiddleware.js
├── utils/             <-- Pure Helper Functions
│   ├── generateToken.js
│   └── variantUtils.js
└── server.js
```

