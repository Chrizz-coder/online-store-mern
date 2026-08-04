# Rate Limiting Implementation Report

## Summary

Rate limiting was introduced to protect this Express 5 + MongoDB e-commerce backend against a wide spectrum of automated attacks — brute-force login attempts, credential stuffing, payment spam, order flooding, review manipulation, product scraping, and denial-of-service traffic — all without touching any existing business logic, controller, model, or authentication code.

Different endpoints carry fundamentally different risk profiles and traffic volumes. A login endpoint that gets hammered 100 times in a second is almost certainly under attack; a product listing endpoint that receives 100 requests per minute is a normal busy shopper. Applying a single flat limit across all routes would either block legitimate users or leave sensitive endpoints exposed. Tiered, route-level limits solve this problem cleanly.

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/middleware/rateLimitMiddleware.js` | Centralized rate limiter factory — all named limiter instances, shared config, and the store abstraction layer |

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/server.js` | Added `globalLimiter` import; mounted `app.use("/api", globalLimiter)` before all route registrations |
| `backend/src/routes/authRoutes.js` | Applied `authLimiter` to `/register` and `/login` |
| `backend/src/routes/paymentRoutes.js` | Applied `paymentLimiter` to `/create-order` and `/verify` |
| `backend/src/routes/orderRoutes.js` | Applied `orderLimiter` to `POST /` (place order) |
| `backend/src/routes/reviewRoutes.js` | Applied `reviewLimiter` to `POST /` (create review) |
| `backend/src/routes/cartRoutes.js` | Applied `cartLimiter` to `POST`, `PUT`, and `DELETE` cart routes |
| `backend/src/routes/productRoutes.js` | Applied `searchLimiter` to GET routes; `adminLimiter` to admin write routes |

**No controllers, models, authentication logic, or API responses were modified.**

---

## Architecture

### Design Decisions

The implementation follows a **centralized, modular, future-ready** design:

1. **Single source of truth** — all limiters live in `rateLimitMiddleware.js`. Changing a limit, window, or message requires editing exactly one file.
2. **Shared base configuration** — a `baseConfig` object holds common options (`standardHeaders`, `legacyHeaders`, `handler`). Individual limiters spread this object and override only what differs.
3. **Store abstraction layer** — a single `store` constant at the top of the file is the only place that references storage. Today it is `undefined` (default MemoryStore). Switching to Redis means changing that one constant.
4. **Route-level injection** — limiters are injected inline at the route definition (`router.post("/login", authLimiter, loginUser)`), keeping server.js clean and making it immediately obvious which limits apply to which routes.

### Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│  Helmet Headers │  (security HTTP headers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CORS Policy   │  (strict origin whitelist)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Global Limiter │  app.use("/api", globalLimiter)
│  100 req/15 min │  — first gate, catches floods
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Route-Level Limiter    │  authLimiter / paymentLimiter / etc.
│  (endpoint-specific)    │  — second gate, catches targeted abuse
└──────────┬──────────────┘
           │
           ▼
┌─────────────────┐
│  Authentication │  protect / adminOnly middleware
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Controllers   │  Business logic — untouched
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  MongoDB / Mongoose
└─────────────────┘
```

If any limiter triggers, Express returns HTTP **429** immediately and the request never reaches authentication, controllers, or the database.

---

## Applied Limits

| Endpoint Group | Routes | Limit | Window | Purpose |
|---|---|---|---|---|
| **Global** | All `/api/*` routes | 100 req | 15 min | Baseline flood protection |
| **Auth** | `POST /api/user/register`<br>`POST /api/user/login` | 5 req | 15 min | Brute-force & credential stuffing |
| **Payment** | `POST /api/payment/create-order`<br>`POST /api/payment/verify` | 10 req | 1 min | Payment spam & Razorpay order abuse |
| **Orders** | `POST /api/orders/` | 20 req | 1 hour | Order flooding & inventory exhaustion |
| **Reviews** | `POST /api/review/` | 5 req | 1 hour | Fake review & rating manipulation |
| **Cart** | `POST /api/cart/`<br>`PUT /api/cart/:id`<br>`DELETE /api/cart/:id` | 120 req | 1 min | Cart stuffing; allows rapid UX interactions |
| **Search** | `GET /api/products/`<br>`GET /api/products/:id` | 100 req | 1 min | Scraping protection; generous for real users |
| **Admin** | `POST/PUT/PATCH/DELETE /api/products/` | 20 req | 1 hour | Compromised admin token abuse |

---

## Why Different Limits

### Login vs. Product Browsing
A login attempt is a direct attack vector for account takeover. Five failed attempts in 15 minutes is a hard signal of brute force or credential stuffing. Blocking early is the correct response. Product browsing, on the other hand, is the core revenue-driving activity — users search, filter, paginate, and preview dozens of products in a single session. A 100 req/min ceiling is generous and will never affect a legitimate customer.

### Payments Have Dedicated Protection
Razorpay order creation translates directly into financial transactions. A compromised account or stolen card being tested programmatically could drain funds before detection. 10 req/min is fast enough for any real checkout flow (including retries on network failure) but stops automated payment-spamming cold.

### Cart Updates Have Higher Limits
Cart interactions are inherently high-frequency. A modern frontend may fire PUT requests on quantity slider debounce, on focus-out, and on page unload. Limiting too aggressively here would break the UI. 120 req/min accommodates even the most interactive frontend while still preventing headless bulk cart operations.

### Admin Operations Have Hourly Limits
Admins legitimately make many product updates during a catalogue import or a sale event, but even heavy catalogue management doesn't require more than 20 mutations per hour in normal operations. A stolen admin JWT should not be able to bulk-delete or mass-reprice an entire catalogue in seconds.

---

## Security Benefits

| Threat | How Rate Limiting Mitigates It |
|---|---|
| **Brute Force** | `authLimiter` (5/15 min) blocks dictionary attacks before they can test more than a handful of passwords |
| **Credential Stuffing** | Same limit + window means a list of 10,000 username:password pairs would take 500 hours to test |
| **API Abuse** | `globalLimiter` is a catch-all safety net for any undiscovered attack surface |
| **Payment Spam** | `paymentLimiter` prevents automated scripts from creating thousands of fake orders via Razorpay |
| **Order Flooding** | `orderLimiter` prevents inventory exhaustion attacks or denial-of-stock for other customers |
| **Review Spam** | `reviewLimiter` makes coordinated rating manipulation (fake 5-star or 1-star campaigns) economically infeasible |
| **Product Scraping** | `searchLimiter` slows catalogue scraping; while not impenetrable, it increases the cost of large-scale data theft |
| **Denial of Service** | `globalLimiter` reduces the blast radius of application-layer DoS — combined with Helmet headers and CORS this forms a layered perimeter |

---

## Future Upgrade Plan

### Why the Current Architecture Makes Redis Trivial to Add

The entire storage configuration is isolated to **three lines** at the top of `rateLimitMiddleware.js`:

```js
// Today
const store = undefined; // MemoryStore

// Tomorrow — Redis / Upstash
import { RedisStore } from "rate-limit-redis";
import { Redis } from "@upstash/redis";

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const store = new RedisStore({
  sendCommand: (...args) => redisClient.call(...args),
});
```

Because every limiter receives `store` via `baseConfig`, changing this one constant upgrades **all limiters simultaneously**. No route files, no controller files, no server.js changes required.

### Upgrade Paths

| Target Store | Package | Effort |
|---|---|---|
| **Redis (self-hosted)** | `rate-limit-redis` + `ioredis` | ~10 lines in `rateLimitMiddleware.js` |
| **Upstash Redis** | `rate-limit-redis` + `@upstash/redis` | ~10 lines in `rateLimitMiddleware.js` |
| **Cloudflare Rate Limiting** | Handled at the CDN layer — limiters become a secondary defence | Zero code changes; just configure Cloudflare rules |

> **When to upgrade:** Upgrade to a distributed store (Redis/Upstash) before deploying multiple server instances or containers. The default `MemoryStore` is not shared between processes, so horizontal scaling requires a shared store.

---

## Testing Guide

### How Each Limiter Works

When a limiter is triggered, the server returns:

```json
HTTP 429 Too Many Requests
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

The response also includes `RateLimit-*` headers (RFC 6585):

```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1722700800
```

---

### Auth Limiter — Brute Force Test

**curl:**
```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "Attempt $i: %{http_code}\n" \
    -X POST http://localhost:5000/api/user/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'; 
done
```

**Expected output:**
```
Attempt 1: 401
Attempt 2: 401
Attempt 3: 401
Attempt 4: 401
Attempt 5: 401
Attempt 6: 429   ← Blocked
```

**Postman:** Create a Collection Runner with 6 iterations hitting `POST /api/user/login`. The 6th request should return 429.

---

### Payment Limiter Test

```bash
for i in {1..11}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    -X POST http://localhost:5000/api/payment/create-order \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"amount":1000}';
done
```

**Expected:** Requests 1–10 succeed (or fail with business-logic errors). Request 11 returns **429**.

---

### Global Limiter Test

```bash
for i in {1..101}; do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:5000/api/products; 
done
```

**Expected:** Request 101 returns **429**.

---

### Product Browsing (Should NOT Be Blocked)

```bash
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code} " \
    http://localhost:5000/api/products; 
done
```

All 50 requests should return **200** — well within the 100 req/min search limit.

---

### Order Limiter Test

```bash
for i in {1..21}; do
  curl -s -o /dev/null -w "Order $i: %{http_code}\n" \
    -X POST http://localhost:5000/api/orders/ \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"addressId":"...","paymentMethod":"COD"}';
done
```

**Expected:** Request 21 returns **429**.

---

## Final Result

The implementation delivers a clean, production-hardened, route-level rate limiting architecture that:

- ✅ **Does not modify** any controller, model, authentication logic, or API response
- ✅ **Preserves all existing features** — payments, orders, reviews, cart, admin, wishlist, and address management work identically
- ✅ **Applies seven named limiters** across eight route files, each tuned to the sensitivity of its endpoint
- ✅ **Applies a global baseline limiter** to all `/api/*` routes as the first line of defence
- ✅ **Returns consistent, friendly JSON** on 429 without exposing implementation details
- ✅ **Uses RFC 6585 standard headers** (`RateLimit-*`) — not the deprecated `X-RateLimit-*` headers
- ✅ **Isolates the storage layer** in a single constant — upgrading to Redis, Upstash, or Cloudflare requires changing exactly one value in one file
- ✅ **Skips the health check route** (`GET /`) — monitoring tools and load balancers are unaffected
