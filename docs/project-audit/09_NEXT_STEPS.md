# Immediate Next Steps & Execution Guide

> **Target Workspace:** E-Commerce Monorepo Backend (`backend/src`)  
> **Audit Date:** July 31, 2026  
> **Execution Focus:** Sequential Remediation, Security Hardening, and Frontend Integration Enablement

---

## Executive Overview

This document provides a sequential, prioritized step-by-step implementation guide for developers preparing this backend for frontend integration and production launch. All tasks are ordered strictly by priority, placing critical bug fixes and security hardening ahead of new feature development.

---

## Phase 1: Critical Bug Fixes & Concurrency Hardening (Immediate - Step 1 to 4)

### Step 1: Implement Conditional Stock Guards on Order Placement
* **Task:** Update `orderController.js` (`placeOrder`) and `orderService.js` (`executeOrderFinalization`) to enforce `{ "variants.$.stock": { $gte: item.quantity } }` in update filters.
* **Why It Matters:** Prevents inventory over-selling and negative stock counts during simultaneous user purchases.
* **Estimated Effort:** 3 Hours
* **Difficulty:** Medium
* **Dependencies:** None

---

### Step 2: Fix Environment Variable Typo & Add Standard Fallbacks
* **Task:** Update `backend/src/config/db.js` to read `process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MOGODB_URL`. Update `.github/workflows/backend-ci.yml`.
* **Why It Matters:** Ensures seamless deployment across cloud hosting platforms (Render, Vercel, Railway, Heroku) without startup database connection crashes.
* **Estimated Effort:** 1 Hour
* **Difficulty:** Easy
* **Dependencies:** None

---

### Step 3: Add Missing MongoDB Indexes for High-Traffic Queries
* **Task:** Add indexes to `orderModel.js` (`{ user: 1, createdAt: -1 }`) and `productModel.js` (`{ isActive: 1, category: 1 }`, `{ slug: 1 }`).
* **Why It Matters:** Eliminates full collection scans (`COLLSCAN`) when users view order history or browse products.
* **Estimated Effort:** 2 Hours
* **Difficulty:** Easy
* **Dependencies:** None

---

### Step 4: Register Centralized Express Error Handling Middleware
* **Task:** Create `backend/src/middleware/errorMiddleware.js` and mount it after all routes in `server.js`.
* **Why It Matters:** Prevents raw HTML stack traces from leaking technical implementation details to clients during uncaught exceptions.
* **Estimated Effort:** 2 Hours
* **Difficulty:** Easy
* **Dependencies:** None

---

## Phase 2: Security & Infrastructure Hardening (Step 5 to 8)

### Step 5: Install and Configure Helmet & CORS Policy
* **Task:** Install `helmet` (`npm install helmet`). Update `server.js` to mount `app.use(helmet())` and configure CORS to restrict allowed origins to trusted domains.
* **Why It Matters:** Secures HTTP headers against XSS, MIME sniffing, clickjacking, and unauthorized cross-origin requests.
* **Estimated Effort:** 2 Hours
* **Difficulty:** Easy
* **Dependencies:** `helmet`, `cors`

---

### Step 6: Apply Rate Limiting to Authentication Endpoints
* **Task:** Install `express-rate-limit` and apply strict rate limiters (max 10 requests per 15 mins) on `/api/user/login` and `/api/user/register`.
* **Why It Matters:** Protects authentication endpoints against brute-force password cracking and credential stuffing.
* **Estimated Effort:** 2 Hours
* **Difficulty:** Easy
* **Dependencies:** `express-rate-limit`

---

### Step 7: Add `start` Script to `package.json`
* **Task:** Add `"start": "node src/server.js"` to `backend/package.json`.
* **Why It Matters:** Standardizes process execution for production environments (Docker, Render, AWS Elastic Beanstalk).
* **Estimated Effort:** 15 Minutes
* **Difficulty:** Easy
* **Dependencies:** None

---

### Step 8: Refactor HTTP DELETE Requests with Request Bodies
* **Task:** Update wishlist and cart remove routes to pass product and variant identifiers via URI params/query strings rather than `req.body`.
* **Why It Matters:** Ensures compatibility with HTTP proxies, CDNs, and API gateways that strip DELETE bodies.
* **Estimated Effort:** 3 Hours
* **Difficulty:** Medium
* **Dependencies:** None

---

## Phase 3: Frontend Enablement & Feature Completion (Step 9 to 11)

### Step 9: Add Product Search & Filtering Capabilities
* **Task:** Create a MongoDB text index on `Product` (`name`, `description`, `brand`, `category`) and add query parameter support (`?search=...&category=...&minPrice=...&maxPrice=...&page=1&limit=20`) to `getAllProducts`.
* **Why It Matters:** Enables the React frontend to render search bars, category filters, and paginated product listings.
* **Estimated Effort:** 5 Hours
* **Difficulty:** Medium
* **Dependencies:** Product Model Index

---

### Step 10: Implement Automated Unit & API Integration Tests
* **Task:** Install `jest` and `supertest`. Write automated API integration tests covering authentication (`/register`, `/login`), cart operations, and order checkout.
* **Why It Matters:** Ensures regression resistance before frontend integration and CI/CD deployment.
* **Estimated Effort:** 12 Hours
* **Difficulty:** Medium
* **Dependencies:** `jest`, `supertest`

---

### Step 11: Add Refresh Token & Logout Endpoints
* **Task:** Implement short-lived access tokens (15 mins) and refresh tokens stored in HTTP-only cookies, along with a POST `/api/user/logout` route.
* **Why It Matters:** Restores industry-standard session security and allows users to securely terminate sessions.
* **Estimated Effort:** 6 Hours
* **Difficulty:** Medium
* **Dependencies:** `cookieParser`

---

## Suggested Implementation Execution Sequence

```
[Step 1: Stock Guard Fix] ──► [Step 2: Env Variable Fix] ──► [Step 3: DB Indexing]
                                                                     │
                                                                     ▼
[Step 6: Rate Limiting]  ◄── [Step 5: Helmet & CORS]   ◄── [Step 4: Error Middleware]
       │
       ▼
[Step 7: Package.json]   ──► [Step 8: Refactor DELETE] ──► [Step 9: Search/Filter]
                                                                     │
                                                                     ▼
                                                          [Step 10 & 11: Tests & Auth]
```

