# Server Infrastructure Implementation Report

## Summary

Two production-readiness improvements were added to `server.js`:

1. **HTTP Response Compression** using the `compression` package — reduces JSON response sizes by up to 80%, improving API speed, Lighthouse scores, and reducing cloud egress costs.
2. **Graceful Shutdown** — handles `SIGTERM` and `SIGINT` signals by draining in-flight requests, closing the MongoDB connection cleanly, and exiting with code 0. Prevents data corruption during deployments and restarts.

No controllers, routes, models, middleware, or business logic were modified.

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/server.js` | Added `compression` middleware; stored server instance; added graceful shutdown handlers |

---

## Dependencies Added

| Package | Type | Purpose |
|---------|------|---------|
| `compression` | Production | Express middleware that compresses HTTP responses using Gzip/Brotli based on the client's `Accept-Encoding` header |

No development dependencies were added.

---

## Compression

### Middleware Code

```js
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter(req, res) {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);
```

### Middleware Placement

Compression is registered **after CORS and before the rate limiter**. This position ensures:
- CORS headers are already set before the response is transformed
- Every route response (including rate-limit rejection responses) passes through compression
- The route handler writes uncompressed data; compression intercepts and compresses it transparently

### Configuration

| Option | Value | Reason |
|--------|-------|--------|
| `threshold` | `1024` bytes | Responses smaller than 1 KB are not compressed — the overhead of compressing tiny responses exceeds the saving |
| `level` | `6` | Balanced compression level — level 1 is fastest with worst ratio, level 9 is best ratio but too slow for real-time APIs. Level 6 is the optimal production middle ground |
| `filter` | Custom | Allows any route to opt out by sending the `x-no-compression` request header. Falls back to the default `compression.filter` (which already skips images, videos, and pre-compressed content) |

### Expected Performance Improvements

| Endpoint | Uncompressed | Compressed (Gzip) | Saving |
|----------|-------------|-------------------|--------|
| `GET /api/products` (20 items) | ~28 KB | ~5 KB | ~82% |
| `GET /api/orders` | ~12 KB | ~3 KB | ~75% |
| `GET /api/cart` | ~4 KB | ~1.2 KB | ~70% |

### Expected Response Headers

When a client sends `Accept-Encoding: gzip` (all modern browsers and HTTP clients do):
```
Content-Encoding: gzip
Vary: Accept-Encoding
```

When the response is below the 1 KB threshold or the client doesn't support compression:
```
(no Content-Encoding header — uncompressed response)
```

---

## Graceful Shutdown

### Why It Is Needed

The backend uses MongoDB transactions in the order placement flow (`placeOrder` uses `mongoose.startSession()` and `session.startTransaction()`). Without graceful shutdown, when a deployment platform sends `SIGTERM` mid-transaction:

1. Node exits immediately
2. The transaction is neither committed nor rolled back
3. MongoDB auto-aborts after its timeout — but side effects that already ran (cart clearing, stock decrement) may not be reversed
4. Result: data inconsistency

Graceful shutdown stops accepting new requests and waits for the in-flight transaction to complete before exiting.

### Signal Handling

| Signal | Sender | Meaning |
|--------|--------|---------|
| `SIGTERM` | Render, Railway, Heroku, Docker on deployment restart | "Please shut down gracefully" — the standard polite shutdown signal sent by all cloud platforms |
| `SIGINT` | Ctrl+C in the terminal | Developer interrupting the local server |

### Shutdown Code

```js
const server = app.listen(port, () => {
  console.log(`Server started, running on port ${port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received — starting graceful shutdown`);

  const timeout = setTimeout(() => {
    console.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000).unref();

  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      clearTimeout(timeout);
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
```

### Shutdown Sequence — Step by Step

```
1. SIGTERM / SIGINT received
   → shutdown() is called
   → Log message printed

2. 10-second force-exit timer starts
   → .unref() ensures the timer doesn't prevent natural exit

3. server.close() called
   → Node stops accepting new TCP connections
   → In-flight requests (already accepted) continue to completion

4. server.close() callback fires — all existing connections drained
   → mongoose.connection.close() called
   → All pending Mongoose operations complete
   → MongoDB connection pool released cleanly

5. clearTimeout(timeout) — cancel the force-exit timer

6. process.exit(0) — clean exit
```

**Force-exit fallback:** If step 4 hangs (e.g., a long-running request or stuck DB operation), the 10-second timer fires `process.exit(1)`. Cloud platforms typically send `SIGKILL` after ~30 seconds anyway — this fallback exits cleanly before that.

### Key Detail: Storing the Server Reference

```js
// Before (no reference stored)
app.listen(port, () => { ... });

// After (reference stored — required for server.close())
const server = app.listen(port, () => { ... });
```

`app.listen()` returns an `http.Server` instance. Without storing it, you cannot call `server.close()`.

---

## Middleware Order

Final middleware execution order in `server.js`:

```
1.  app.set("trust proxy", 1)   — correct IP resolution behind proxies
2.  app.use(logger)             — pino-http, captures all requests
3.  app.use(helmet(...))        — security headers
4.  app.use(cors(...))          — CORS origin whitelist
5.  app.use(compression(...))   — Gzip response compression ← NEW
6.  app.use("/api", globalLimiter) — rate limiting
7.  app.use(express.json())     — body parsing
8.  app.use(mongoSanitize())    — NoSQL injection protection
9.  Routes                      — business logic
10. app.use(notFound)           — 404 handler
11. app.use(errorHandler)       — global error handler
```

---

## Verification

### Verify Compression

Start the server and make a request with gzip support declared:

```bash
curl -H "Accept-Encoding: gzip" -I http://localhost:3000/api/products
```

Expected response headers:
```
HTTP/1.1 200 OK
Content-Encoding: gzip
Vary: Accept-Encoding
```

Verify opt-out works:
```bash
curl -H "x-no-compression: true" -I http://localhost:3000/api/products
# Content-Encoding header should be absent
```

### Verify Graceful Shutdown

Start the server:
```bash
node src/server.js
# Server started, running on port 3000
# MongoDB connected successfully
```

Press **Ctrl+C**:
```
^CSIGINT received — starting graceful shutdown
MongoDB connection closed
# Process exits cleanly (exit code 0)
```

Simulate a deployment restart:
```bash
kill -SIGTERM <pid>
# SIGTERM received — starting graceful shutdown
# MongoDB connection closed
```

---

## Final Result

- ✅ Only `server.js` was modified
- ✅ No business logic changed
- ✅ No API behavior changed
- ✅ No controllers, routes, models, or middleware modified
- ✅ Compression active — JSON responses compressed for all clients supporting `Accept-Encoding: gzip`
- ✅ Graceful shutdown handles `SIGTERM` and `SIGINT`
- ✅ MongoDB connection closes cleanly on shutdown
- ✅ 10-second force-exit fallback prevents hung shutdowns
- ✅ Server starts without errors
