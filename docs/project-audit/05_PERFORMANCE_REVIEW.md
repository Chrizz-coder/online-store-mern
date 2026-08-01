# Performance Review & Bottleneck Analysis

> **Target Workspace:** E-Commerce Monorepo Backend (`backend/src`)  
> **Audit Date:** July 31, 2026  
> **Focus:** Query Efficiency, Indexing, Memory Profile, N+1 Patterns, Transaction Overhead, and Scalability

---

## Executive Overview

This performance evaluation analyzes the database interaction patterns, query execution paths, and memory characteristics of the Express backend. The assessment identifies critical indexing gaps, CPU-bound array operations, and network payload bottlenecks.

---

## 1. Confirmed Issues

### PERF-01: Missing Database Indexing on High-Frequency Order & User Query Paths

* **Confidence Level:** High
* **Location:** `backend/src/models/orderModel.js`, `backend/src/models/productModel.js`
* **Evidence:**
  - In `orderModel.js`, the `user` field has `type: mongoose.Schema.Types.ObjectId, ref: "User"`, but NO `index: true` or compound index is defined.
  - In `productModel.js`, `isActive`, `slug`, `brand`, `basePrice`, and `salePrice` lack indexes (only `category` has `index: true`).
* **Why It Is a Problem:**
  - `Order.find({ user: req.user.id })` in `getMyOrders` performs a Full Collection Scan (`COLLSCAN`) across the `orders` collection every time a user views their order history.
  - Filtering products by brand, price range, or status forces MongoDB to scan every document in the `products` collection.
* **Impact:** High CPU usage on MongoDB cluster, slow response times, and poor database query throughput under concurrent user load.
* **Recommendation:** Add single and compound indexes to `orderModel.js` and `productModel.js`:
  ```javascript
  // orderModel.js
  orderSchema.index({ user: 1, createdAt: -1 });

  // productModel.js
  productSchema.index({ isActive: 1, category: 1 });
  productSchema.index({ slug: 1 });
  productSchema.index({ isActive: 1, basePrice: 1 });
  ```

---

### PERF-02: Synchronous Cart Synchronization on Every `GET /api/cart` Fetch

* **Confidence Level:** High
* **Location:** `backend/src/controllers/cartController.js` (`viewCart`)
* **Evidence:**
  ```javascript
  // lines 101-145
  for (let item of cart.items) {
    const product = item.product;
    // ... loops through items, checks stock & price ...
  }
  if (cartDataChanged) {
    cart.items = verifiedItemsList;
    await cart.save();
  }
  ```
* **Why It Is a Problem:** Every time a user opens or refreshes their cart page, `viewCart` populates products, iterates over every item in JavaScript, checks stock thresholds, and conditionally issues a `cart.save()` write operation to MongoDB. Converting read operations (`GET`) into DB writes under read-heavy usage introduces write lock contention on the `carts` collection.
* **Impact:** Unnecessary database write operations on simple `GET` page loads, increasing MongoDB write load and latency.
* **Recommendation:** Perform cart stock and price reconciliation lazily during the **Checkout** transition (`POST /api/orders/checkout-summary`), or use a lightweight memory cache for product prices to avoid DB re-verification on simple reads.

---

## 2. Potential Risks

### PERF-03: Heavy Population Overhead on Large Cart and Order Queries

* **Confidence Level:** High
* **Location:** `backend/src/controllers/cartController.js`, `backend/src/controllers/orderController.js`
* **Evidence:**
  ```javascript
  // cartController.js line 91
  let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
  ```
* **Why It Is a Risk:** Using Mongoose `.populate("items.product")` executes a secondary query to fetch full product documents (including large `description` text, `variants` arrays, and `images` arrays). Cart rendering only requires basic metadata (`name`, `price`, `image`).
* **Impact:** Excessive memory consumption in Node.js heap and large network payload sizes transferred between MongoDB and Express.
* **Recommendation:** Restrict populate field selection to necessary fields only:
  ```javascript
  .populate("items.product", "name images basePrice salePrice globalStock variants isActive")
  ```

---

### PERF-04: In-Memory Rating Recalculation Loop ($O(N)$ Memory Overhead)

* **Confidence Level:** High
* **Location:** `backend/src/controllers/reviewController.js` (`updateProductAvgRating`)
* **Evidence:**
  ```javascript
  // lines 13-24
  const reviews = await Review.find({ product: productId });
  const sumOfRating = reviews.reduce((total, r) => total + r.rating, 0);
  ```
* **Why It Is a Risk:** Fetching all review documents into Express application memory to compute the average rating via JavaScript `.reduce()` consumes Node.js memory and blocks the event loop during array iteration.
* **Impact:** Event loop lag spikes under concurrent review creations for popular products.
* **Recommendation:** Use MongoDB `$avg` aggregation pipeline directly in the database engine:
  ```javascript
  const result = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } }
  ]);
  ```

---

## 3. Future Improvements

### PERF-05: Absence of Redis Caching Layer for Catalog Read Queries

* **Confidence Level:** High
* **Location:** `backend/src/controllers/productController.js` (`getAllProducts`, `getProductById`)
* **Evidence:** All catalog read requests hit MongoDB directly (`Product.find({ isActive: true })`).
* **Why It Is an Opportunity:** In e-commerce applications, product catalog reads outnumber write operations (orders/updates) by a ratio of 100:1. Querying MongoDB directly for static catalog listings creates unnecessary database load.
* **Impact:** Higher database hosting costs and slower response times under traffic surges (e.g. promotional sales).
* **Recommendation:** Implement Redis caching for public product endpoints (`GET /api/products` and `GET /api/products/:id`) with a TTL of 5–15 minutes and explicit cache invalidation on product updates.

---

## Performance Benchmark & Risk Scorecard

```
┌─────────────────────────────────────────────────────────────┐
│                 PERFORMANCE METRICS MATRIX                  │
├──────────────────────────┬──────────────────────────────────┤
│ Metric Category          │ Current Score / Assessment       │
├──────────────────────────┼──────────────────────────────────┤
│ Query Index Efficiency   │ 4 / 10 (Missing User/Order index)│
│ Payload Optimization     │ 6 / 10 (Over-populating fields)  │
│ In-Memory Processing     │ 5 / 10 (Reduce loops on reviews) │
│ Database Write Lock Ratio│ 6 / 10 (Read triggers DB write)  │
│ Caching Tier             │ 0 / 10 (No Redis / In-memory)    │
└──────────────────────────┴──────────────────────────────────┘
```

