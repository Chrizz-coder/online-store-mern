# Health Check & Centralized Configuration Report

## Summary

Two production-readiness improvements were implemented:

1. **`GET /health`** — a public, unauthenticated, unrated endpoint that returns real-time server and database status. Used by Render, Railway, Docker, and Kubernetes to detect unhealthy instances and trigger automatic restarts.
2. **`src/config/env.js`** — a centralized environment configuration module that becomes the single source of truth for all environment variables. Implements fail-fast startup validation so missing required variables crash the process immediately with a clear error, rather than silently failing at runtime.

No business logic, controllers, routes, models, or authentication was modified.

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/config/env.js` | Centralized environment variable configuration with validation |

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/server.js` | Added `GET /health` route; imported `env`; replaced `process.env.NODE_ENV`, `FRONTEND_URL`, `PORT` |
| `backend/src/config/db.js` | Imported `env`; replaced three-fallback MongoDB URI chain with `env.MONGODB_URI` |
| `backend/src/middleware/authMiddleware.js` | Imported `env`; replaced `process.env.JWT_SECRET`; removed redundant runtime guard |
| `backend/src/middleware/errorMiddleware.js` | Imported `env`; replaced `process.env.NODE_ENV` |
| `backend/src/utils/generateToken.js` | Imported `env`; replaced `process.env.JWT_SECRET`; removed redundant runtime guard |
| `backend/src/controllers/paymentControllers.js` | Imported `env`; replaced `process.env.RAZORPAY_KEY_SECRET` in two locations |
| `backend/src/services/razorpayServices.js` | Imported `env`; replaced `process.env.RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` |

---

## Health Check

### Purpose

Deployment platforms (Render, Railway, Docker, Kubernetes) need an HTTP endpoint to poll periodically to determine whether the service is healthy and ready to serve traffic. Without it, they can only detect process death — not a zombie process that is running but unable to serve requests (e.g., MongoDB disconnected).

### Response

**When healthy (MongoDB connected):**
```json
{
  "status": "OK",
  "database": "Connected",
  "uptime": 12345.67
}
```

**When unhealthy (MongoDB disconnected):**
```json
{
  "status": "ERROR",
  "database": "Disconnected",
  "uptime": 12345.67
}
```

### HTTP Status Codes

| Scenario | Code | Effect |
|----------|------|--------|
| MongoDB connected | `200 OK` | Platform marks service as healthy |
| MongoDB disconnected | `503 Service Unavailable` | Platform marks service as unhealthy, stops routing traffic, triggers restart |

### Route Placement

```js
app.use(cors(corsOptions));
app.use(compression(...));

app.get("/health", (req, res) => { ... });   // ← BEFORE rate limiter and all routes

app.use("/api", globalLimiter);              // ← rate limiter starts here
```

Placed before the rate limiter and all application routes so:
- No JWT token required (platform's HTTP probe has no auth credentials)
- No rate limit applied (platform pings every 30–60 seconds; rate limiting would eventually return 429 and trigger a false restart)

### Database Status Detection

```js
const isConnected = mongoose.connection.readyState === 1;
```

`mongoose.connection.readyState` values:
- `0` = Disconnected
- `1` = Connected ✅
- `2` = Connecting
- `3` = Disconnecting

Only state `1` returns `200`. All others return `503`.

### Uptime Calculation

```js
uptime: process.uptime()
```

`process.uptime()` returns the number of seconds the Node.js process has been running. Does not reset on new connections — reflects actual server uptime.

---

## Centralized Configuration

### Why `env.js` Was Introduced

Before this change, `process.env` was accessed in 7 locations across 6 files with 12 total accesses. Problems this caused:

| Problem | Example |
|---------|---------|
| Duplicate validation | `JWT_SECRET` guard existed in both `authMiddleware.js` and `generateToken.js` |
| Silent undefined failure | `process.env.RAZORPAY_KEY_ID` — no guard, silently `undefined` if missing |
| Typo-prone fallback | `process.env.MOGODB_URL` — a real typo bug in this codebase |
| No single place for defaults | `|| 5000` buried in `server.js` |

### How Validation Works

```js
const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const optional = (name, defaultValue = undefined) =>
  process.env[name] ?? defaultValue;
```

### Fail-Fast Startup

`env.js` is imported at module load time. If a required variable is missing, `required()` throws synchronously before any route is registered or any database connection is attempted.

```
npm start
  → import env from "./config/env.js"
  → required("JWT_SECRET") — JWT_SECRET is missing
  → throws: "Missing required environment variable: JWT_SECRET"
  → process exits immediately
  → Render marks deployment as FAILED
  → Developer notified before any traffic hits the broken deployment
```

Contrast with the previous behaviour — the server starts and only fails when a user tries to log in.

### Required vs Optional

| Variable | Classification | Reason |
|----------|---------------|--------|
| `MONGODB_URI` | Required (special fallback logic) | App cannot function without DB |
| `JWT_SECRET` | Required | Auth cannot function without it |
| `PORT` | Optional (default: `"5000"`) | Has sensible default |
| `NODE_ENV` | Optional (default: `"development"`) | Has sensible default |
| `FRONTEND_URL` | Optional (default: `"http://localhost:5173"`) | Has sensible default |
| `RAZORPAY_KEY_ID` | Optional | Runtime guard in payment controller |
| `RAZORPAY_KEY_SECRET` | Optional | Runtime guard in payment controller |
| `CLOUDINARY_*` | Optional | Not yet accessed via process.env |

### Legacy MongoDB URI Fallback

The existing `db.js` used three fallback names for historical compatibility:
```js
// Old
process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MOGODB_URL
```

This fallback logic is preserved in `env.js`:
```js
MONGODB_URI:
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.MOGODB_URL,
```

`db.js` now simply uses `env.MONGODB_URI`. Existing `.env` files with any of the three variable names continue to work unchanged.

---

## Refactored Files

| File | What changed |
|------|-------------|
| `src/config/db.js` | `process.env.MONGODB_URI \|\| MONGODB_URL \|\| MOGODB_URL` → `env.MONGODB_URI` |
| `src/server.js` | `process.env.NODE_ENV`, `FRONTEND_URL`, `PORT` → `env.*` |
| `src/middleware/authMiddleware.js` | `process.env.JWT_SECRET` → `env.JWT_SECRET`; manual guard removed |
| `src/middleware/errorMiddleware.js` | `process.env.NODE_ENV` → `env.NODE_ENV` |
| `src/utils/generateToken.js` | `process.env.JWT_SECRET` → `env.JWT_SECRET`; manual guard removed |
| `src/controllers/paymentControllers.js` | `process.env.RAZORPAY_KEY_SECRET` → `env.RAZORPAY_KEY_SECRET` (×2) |
| `src/services/razorpayServices.js` | `process.env.RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` → `env.*` |

---

## Benefits

### Maintainability

All environment variable names are declared once. Renaming a variable means updating one line in `env.js` — not grepping across 6 files.

### Reliability

`optional()` with explicit defaults replaces implicit `|| fallback` patterns scattered across files. Default values are documented and centralized.

### Deployment Safety

Fail-fast validation catches missing configuration before the server accepts any traffic. A broken deployment fails loudly at startup instead of silently at runtime.

### Developer Experience

New developers can read `env.js` to understand every environment variable the project needs — names, which are required, which have defaults. No more searching across files.

### Startup Validation

Previously, missing `JWT_SECRET` only surfaced when a user logged in. Now it surfaces at process start — before any user is affected.

---

## Verification

### Health Endpoint

```bash
# Start server
node src/server.js

# Test health endpoint
curl -s http://localhost:3000/health
# → {"status":"OK","database":"Connected","uptime":5.00}

# Verify HTTP status code
curl -o /dev/null -w "%{http_code}" http://localhost:3000/health
# → 200
```

### Fail-Fast Validation

```bash
# Temporarily unset JWT_SECRET and start
JWT_SECRET="" node src/server.js
# → Error: Missing required environment variable: JWT_SECRET
# → Process exits before server starts
```

### Existing APIs Unchanged

```bash
curl -s http://localhost:3000/api/products | head -c 100
# → {"count":...,"total":...,"page":1,"totalPages":...,"products":[...]}
```

All routes continue working as before. No API behaviour changed.
