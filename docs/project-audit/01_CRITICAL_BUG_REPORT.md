# Critical Bug & Issue Report

> **Target Workspace:** E-Commerce Monorepo Backend (`backend/src`)  
> **Audit Date:** July 31, 2026  
> **Scope:** Full Source Code Deep-Dive (Controllers, Models, Services, Middleware, Configuration, Routes, Utilities, CI/CD Workflows)

---

## Executive Overview

This report documents all verified bugs, runtime risks, concurrency vulnerabilities, and potential exception vectors identified during the static analysis of the backend. Every finding is categorized into **Confirmed Issues** (reproducible flaws in current source code), **Potential Risks** (vulnerabilities under specific operational conditions), or **Future Improvements** (preventative architectural enhancements).

---

## 1. Confirmed Issues

### ISSUE-01: Non-Atomic Stock Deduction Allows Negative Inventory During Concurrent Purchases

* **Confidence Level:** High
* **Location:** `backend/src/controllers/orderController.js` (`placeOrder`), `backend/src/services/orderService.js` (`executeOrderFinalization`)
* **Evidence:**
  ```javascript
  // In orderController.js (lines 167-177) and orderService.js (lines 33-43)
  if (color || size) {
    await Product.updateOne(
      { _id: item.product, "variants.color": color, "variants.size": size },
      { $inc: { "variants.$.stock": -item.quantity } },
      { session },
    );
  } else {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { globalStock: -item.quantity } },
      { session },
    );
  }
  ```
* **Why It Is a Problem:** The stock validation step (`validateAndCalculateCart`) checks stock in memory *before* initiating the stock decrement query. However, the database update query uses an unconstrained `$inc: { ...: -item.quantity }`. If two or more checkout requests execute concurrently for the last remaining unit of a product, both requests pass `validateAndCalculateCart` simultaneously. MongoDB then executes both `$inc` updates inside their transactions, decrementing `stock` or `globalStock` below zero (e.g. `-1` or `-2`).
* **Impact:** Inventory over-selling, financial liabilities, customer dissatisfaction, and manual order cancellations.
* **Recommendation:** Include conditional stock guards directly inside the atomic update query filter:
  ```javascript
  const updateResult = await Product.updateOne(
    {
      _id: item.product,
      "variants.color": color,
      "variants.size": size,
      "variants.$.stock": { $gte: item.quantity } // Stock Guard
    },
    { $inc: { "variants.$.stock": -item.quantity } },
    { session }
  );
  if (updateResult.matchedCount === 0) {
    throw new Error(`Insufficient stock for item ${item.name}`);
  }
  ```

---

### ISSUE-02: Razorpay Post-Payment Order Creation Failure Results in Unhandled Financial Deductions

* **Confidence Level:** High
* **Location:** `backend/src/controllers/paymentControllers.js` (`verifyPayment`)
* **Evidence:**
  ```javascript
  // Signature verified successfully on line 74
  if (expectedSignature !== razorpay_signature) { ... }

  // Order finalization invoked on line 106
  const order = await executeOrderFinalization({ ... });
  ```
* **Why It Is a Problem:** When `verifyPayment` succeeds in signature verification, the customer's bank account or card has ALREADY been charged by Razorpay. If `executeOrderFinalization` throws an unhandled error (e.g. database disconnect, schema validation error, or insufficient stock occurring between payment creation and verification), the catch block catches the error and returns HTTP `500 Server error verifying payment.` No order is recorded in MongoDB, no notification is dispatched, and no automated refund is issued via Razorpay API.
* **Impact:** Customer money is captured without an order being created in the system, creating legal and customer support friction.
* **Recommendation:** Wrap post-payment order finalization in a dedicated retry/reconciliation block. If order finalization fails catastrophically after signature verification, invoke `razorpayInstance.payments.refund(razorpay_payment_id)` or flag the transaction in a dedicated `FailedPayments` collection for automated administrative reconciliation.

---

### ISSUE-03: Environment Variable Typo Causes MongoDB Connection Failure in Default Configurations

* **Confidence Level:** High
* **Location:** `backend/src/config/db.js`
* **Evidence:**
  ```javascript
  // line 5
  await mongoose.connect(process.env.MOGODB_URL);
  ```
* **Why It Is a Problem:** The variable name contains a typo (`MOGODB_URL` missing an `N`). Standard deployment environments and hosting providers default to `MONGODB_URI` or `MONGODB_URL`. Furthermore, in `.github/workflows/backend-ci.yml`, the environment variable was hardcoded with the typo (`MOGODB_URL: mongodb://127.0.0.1:27017/online-store-ci`) to pass CI tests, propagating the error into the CI pipeline.
* **Why Confidence Is High:** Directly visible in `db.js` line 5 and `backend-ci.yml` line 66.
* **Impact:** The application crashes on startup with `Database connection failed` (`process.exit(1)`) unless the operator specifically configures their environment variables with the misspelled key.
* **Recommendation:** Update `db.js` to look for standard environment variables with fallbacks:
  ```javascript
  const mongoURI = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MOGODB_URL;
  ```

---

### ISSUE-04: Inconsistent Variant Array Querying Fails for Single-Attribute Variants

* **Confidence Level:** High
* **Location:** `backend/src/controllers/orderController.js` (`placeOrder`), `backend/src/services/orderService.js` (`executeOrderFinalization`)
* **Evidence:**
  ```javascript
  // In orderController.js (line 168):
  { _id: item.product, "variants.size": size, "variants.color": color }

  // In orderService.js (line 34):
  { _id: item.product, "variants.color": color, "variants.size": size }
  ```
* **Why It Is a Problem:** If a product variant defines ONLY a `size` (and `color` is `undefined`) or ONLY a `color` (and `size` is `undefined`), passing `{ "variants.size": undefined }` to MongoDB causes Mongoose/MongoDB query builders to search for documents where `variants.size` is missing or null, which fails to match variants that have a size defined. Furthermore, using `$inc: { "variants.$.stock": -item.quantity }` with multiple array element criteria without `$elemMatch` can lead to positional operator positional index mismatches in MongoDB.
* **Impact:** Variant stock updates fail silently or target the wrong positional index in the variants array during order placement.
* **Recommendation:** Use explicit `$elemMatch` condition matching only defined properties:
  ```javascript
  const variantFilter = { _id: item.product };
  const elemMatch = {};
  if (color) elemMatch.color = color;
  if (size) elemMatch.size = size;
  variantFilter.variants = { $elemMatch: elemMatch };
  ```

---

### ISSUE-05: Missing Global Express Error Handler Middleware Leaks Internal Stack Traces

* **Confidence Level:** High
* **Location:** `backend/src/server.js`
* **Evidence:** `server.js` mounts routes directly (`app.use("/api/user", userRoutes); ...`) without registering a 4-parameter Express error handling middleware (`(err, req, res, next) => { ... }`) at the end of the middleware stack.
* **Why It Is a Problem:** If an unhandled asynchronous error occurs outside a try/catch block, or if `next(error)` is triggered by a third-party package, Express falls back to its default HTML error handler.
* **Impact:** Sends raw stack traces, file system paths, and internal dependency details in HTML format to clients, exposing sensitive technical implementation details to attackers.
* **Recommendation:** Mount a centralized JSON error handling middleware in `server.js` after all routes:
  ```javascript
  app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
      message: process.env.NODE_ENV === "production" ? "Internal server error." : err.message
    });
  });
  ```

---

## 2. Potential Risks

### RISK-01: In-Memory Full Collection Scans for Product Rating Recalculation

* **Confidence Level:** High
* **Location:** `backend/src/controllers/reviewController.js` (`updateProductAvgRating`)
* **Evidence:**
  ```javascript
  // lines 13-24
  const reviews = await Review.find({ product: productId });
  if (reviews.length === 0) { ... }
  const sumOfRating = reviews.reduce((total, r) => total + r.rating, 0);
  const calculatedAvgRating = parseFloat((sumOfRating / reviews.length).toFixed(2));
  ```
* **Why It Is a Risk:** Fetching ALL reviews for a product into Node.js application memory to compute an average via JavaScript `reduce()` scales linearly ($O(N)$ memory and network payload). For popular products with thousands of reviews, posting or updating a review will cause high memory allocation spikes and event loop blocking in Node.js.
* **Impact:** Node.js process memory exhaustion, garbage collection latency spikes, and potential process crash under high concurrent review submissions.
* **Recommendation:** Use MongoDB Aggregation Pipeline directly in the database engine:
  ```javascript
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: "$product", avgRating: { $avg: "$rating" } } }
  ]);
  const avg = stats.length > 0 ? parseFloat(stats[0].avgRating.toFixed(2)) : 0;
  await Product.findByIdAndUpdate(productId, { averageRating: avg });
  ```

---

### RISK-02: HTTP DELETE Requests Requiring Request Body

* **Confidence Level:** High
* **Location:** `backend/src/routes/wishlistRoutes.js`, `backend/src/controllers/wishlistController.js` (`removeFromWishlist`), `backend/src/routes/cartRoutes.js`, `backend/src/controllers/cartController.js` (`deleteCartItem`)
* **Evidence:**
  ```javascript
  // wishlistRoutes.js line 16
  router.delete("/", removeFromWishlist); // Payload passed in req.body

  // cartRoutes.js line 17
  router.delete("/:productId", deleteCartItem); // Payload passed in req.body
  ```
* **Why It Is a Risk:** HTTP RFC 7231 specifies that payload bodies on `DELETE` requests have no defined semantics. Many HTTP client libraries (Axios, Fetch in certain environments), reverse proxies (Nginx, Cloudflare), and Web Application Firewalls (WAFs) strip or reject HTTP `DELETE` requests that contain a body.
* **Impact:** Frontend integration failures, request body stripping leading to 400/500 errors when deployed behind production proxies.
* **Recommendation:** Refactor delete routes to pass parameters via URI query parameters or route parameters:
  ```javascript
  DELETE /api/wishlist/:productId?variantId=xxx
  DELETE /api/cart/:productId?color=Grey&size=11
  ```

---

### RISK-03: Cancelled and Failed Orders Qualify Users for "Verified Purchase" Product Reviews

* **Confidence Level:** High
* **Location:** `backend/src/controllers/reviewController.js` (`addReview`)
* **Evidence:**
  ```javascript
  // lines 88-108
  const purchasedOrder = await Order.findOne({
    user: req.user.id,
    items: { $elemMatch: { product: product._id } }
  });
  ```
* **Why It Is a Risk:** The query searches for ANY order matching `user` and `product`, regardless of `orderStatus` or `paymentStatus`.
* **Impact:** A user who places an order, immediately cancels it (`orderStatus: "cancelled"`), or whose payment failed (`paymentStatus: "failed"`), is granted access to write verified product reviews, undermining review integrity.
* **Recommendation:** Restrict purchase verification query to completed orders:
  ```javascript
  const purchasedOrder = await Order.findOne({
    user: req.user.id,
    orderStatus: "delivered",
    paymentStatus: "paid",
    items: { $elemMatch: { product: product._id } }
  });
  ```

---

### RISK-04: Index Synchronization Called at Model File Import Time

* **Confidence Level:** High
* **Location:** `backend/src/models/reviewModel.js`
* **Evidence:**
  ```javascript
  // lines 54-56
  Review.syncIndexes().catch((err) => {
    console.error("Error syncing Review indexes:", err);
  });
  ```
* **Why It Is a Risk:** `syncIndexes()` drops indexes in the MongoDB collection that are not present in the current Mongoose schema. Executing `syncIndexes()` automatically on module import can trigger unintended database index drops during application startup, blocking collection writes in production MongoDB clusters.
* **Impact:** Unintended index drops, database lockup during deployment, startup latency.
* **Recommendation:** Remove `syncIndexes()` from runtime code. Manage index builds via dedicated database migration scripts or deployment steps.

---

## 3. Future Improvements

### IMP-01: Dual Stock System (globalStock vs. variant stock) Lack Structural Validation

* **Confidence Level:** High
* **Location:** `backend/src/models/productModel.js`, `backend/src/controllers/productController.js`
* **Evidence:** `productModel.js` defines both `globalStock` (Number, default 0) and `variants: [{ price, stock, color, size }]`.
* **Why It Is an Issue:** There is no Mongoose schema validator or controller check ensuring that a product with variants does NOT use `globalStock`. When an order is placed for a variant, `variant.stock` is decremented while `globalStock` remains unchanged.
* **Impact:** Inventory tracking desynchronization when querying `globalStock` for catalog-wide stock reports.
* **Recommendation:** Implement a pre-save hook on `productModel.js` that automatically computes `globalStock` as the sum of all `variant.stock` values if variants exist:
  ```javascript
  productSchema.pre("save", function() {
    if (this.variants && this.variants.length > 0) {
      this.globalStock = this.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
    }
  });
  ```

---

### IMP-02: Missing Pagination Controls on Product, Order, Address, and Review Collections

* **Confidence Level:** High
* **Location:** `backend/src/controllers/productController.js` (`getAllProducts`), `backend/src/controllers/orderController.js` (`getMyOrders`), `backend/src/controllers/reviewController.js` (`getProductReviews`)
* **Evidence:** Queries use `Product.find({ isActive: true })` and `Order.find({ user: req.user.id })` without `.limit()` or `.skip()`.
* **Why It Is an Issue:** As the database grows to thousands of products or hundreds of orders per user, API responses will return multi-megabyte payloads.
* **Impact:** High memory consumption, network latency, slow page loads on frontend.
* **Recommendation:** Implement standardized `page` and `limit` query parameter handling with a default limit (e.g. 20 items per page).

---

## Summary Matrix of Critical Findings

| ID | Finding Title | Type | Confidence | Priority | Affected Modules |
|---|---|---|---|---|---|
| **ISSUE-01** | Non-Atomic Stock Deduction | Confirmed Issue | High | Critical | `orderController`, `orderService` |
| **ISSUE-02** | Razorpay Order Failure After Payment | Confirmed Issue | High | Critical | `paymentControllers` |
| **ISSUE-03** | Env Variable Typo (`MOGODB_URL`) | Confirmed Issue | High | High | `config/db.js`, `backend-ci.yml` |
| **ISSUE-04** | Single-Attribute Variant Query Failure | Confirmed Issue | High | High | `orderController`, `orderService` |
| **ISSUE-05** | Missing Express Global Error Handler | Confirmed Issue | High | High | `server.js` |
| **RISK-01** | In-Memory Review Rating Calculation | Potential Risk | High | Medium | `reviewController` |
| **RISK-02** | HTTP DELETE Body Anti-Pattern | Potential Risk | High | Medium | `wishlistRoutes`, `cartRoutes` |
| **RISK-03** | Cancelled Order Review Eligibility | Potential Risk | High | Medium | `reviewController` |
| **RISK-04** | Import-Time `syncIndexes()` Invocation | Potential Risk | High | Low | `models/reviewModel.js` |
| **IMP-01** | Dual Stock Desynchronization | Future Improvement | High | Medium | `models/productModel.js` |
| **IMP-02** | Unpaginated Collection Queries | Future Improvement | High | Medium | `productController`, `orderController` |

