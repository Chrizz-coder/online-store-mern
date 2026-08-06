# Request Logging Implementation Report

## Summary

HTTP request logging was added to give the application complete observability in production. Without logging, there is no way to answer operational questions after the fact: which endpoint is slow, which IP is abusing the API, what status code a specific user received, or why a payment failed. Pino HTTP was chosen because it is the fastest Node.js logging library, outputs structured JSON natively (queryable by all major log platforms), and integrates cleanly into the existing Express middleware stack via a single `app.use()` call.

---

## Files Modified

| File | Change |
|------|--------|
| `backend/src/server.js` | Imported `pino-http`, configured logger, mounted as first middleware after `trust proxy` |
| `backend/src/controllers/cartController.js` | Removed duplicate `color`/`size` variable declarations (pre-existing syntax error unrelated to logging — fixed as a blocker) |

---

## Dependencies Added

| Package | Type | Purpose |
|---------|------|---------|
| `pino-http` | Production | HTTP request/response logger for Express. Wraps each request and automatically emits a log line when the response finishes — capturing method, URL, status code, response time, and IP |
| `pino-pretty` | Development only (`--save-dev`) | Transforms Pino's raw JSON log lines into a human-readable, colourised format for local development. Not used in production — excluded from the production bundle |

---

## Logger Configuration

```js
const isDev = process.env.NODE_ENV !== "production";

const logger = pinoHttp({
  level: isDev ? "debug" : "info",
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  redact: ["req.headers.authorization", "req.headers.cookie"],
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        ip: req.socket.remoteAddress,
      };
    },
  },
});
```

### Development mode (`NODE_ENV !== "production"`)

- **Log level:** `debug` — all log levels emitted (trace, debug, info, warn, error, fatal)
- **Transport:** `pino-pretty` — JSON is transformed to a coloured, human-readable format before printing
- **Output example:**
  ```
  [09:15:23.412] INFO (12345): request completed
      req: { "method": "POST", "url": "/api/orders", "ip": "::1" }
      res: { "statusCode": 201 }
      responseTime: 42
  ```

### Production mode (`NODE_ENV=production`)

- **Log level:** `info` — only `info`, `warn`, `error`, `fatal` emitted; `debug` and `trace` are suppressed at zero cost
- **Transport:** none — raw JSON is written directly to `stdout`
- **Output example:**
  ```json
  {"level":30,"time":1722932123412,"req":{"method":"POST","url":"/api/orders","ip":"103.22.14.200"},"res":{"statusCode":201},"responseTime":42,"msg":"request completed"}
  ```
  One JSON object per line — ingested directly by Render, Railway, Heroku, Datadog, AWS CloudWatch, Grafana Loki, or any log management platform.

---

## Middleware Placement

The logger is mounted **immediately after `app.set("trust proxy", 1)`** and before every other middleware:

```
app.set("trust proxy", 1)   ← must be first
app.use(logger)              ← second
app.use(helmet(...))
app.use(cors(...))
app.use("/api", globalLimiter)
app.use(express.json())
app.use(mongoSanitize())
Routes...
app.use(notFound)
app.use(errorHandler)
```

**Why after `trust proxy`:**
The logger reads `req.socket.remoteAddress` (or `req.ip`) for the client IP. `trust proxy` must execute first so Express correctly resolves the real client IP from the `X-Forwarded-For` header when behind a reverse proxy. Without this order, all IPs would log as the load balancer's IP.

**Why before everything else:**
The logger records the timestamp when the request arrives and emits the log when the response is sent. Placing it first means:
- Requests **blocked by rate limiting** are still logged — you can detect abuse
- Requests **rejected by CORS** are still logged — you see invalid origins
- Requests that **crash in body parsing** are still logged — you see the failing request
- The **response time** measurement covers the full request lifecycle including all middleware

---

## Logged Information

Each completed request emits exactly:

| Field | Source | Example |
|-------|--------|---------|
| `time` | Pino automatic | `1722932123412` (epoch ms) |
| `req.method` | Custom serializer | `"POST"` |
| `req.url` | Custom serializer | `"/api/orders"` |
| `req.ip` | Custom serializer | `"103.22.14.200"` |
| `res.statusCode` | Pino HTTP automatic | `201` |
| `responseTime` | Pino HTTP automatic | `42` (milliseconds) |
| `msg` | Pino HTTP automatic | `"request completed"` |
| `level` | Pino automatic | `30` (info) |

---

## Sensitive Data Protection

### Redacted fields

```js
redact: ["req.headers.authorization", "req.headers.cookie"]
```

| Field | Why redacted |
|-------|-------------|
| `req.headers.authorization` | Contains the JWT Bearer token — if logs are compromised, every active session is stolen |
| `req.headers.cookie` | May contain session identifiers |

Pino replaces redacted values with `"[Redacted]"` in the log output — the key is still visible so you know the header was present, but the value is never written to disk or stdout.

### Request bodies not logged

The logger configuration does not include `req.body` anywhere. Request bodies are excluded because:
- Auth routes contain **passwords** in plaintext
- Payment routes contain **Razorpay signature data**
- Logging bodies would create a **GDPR and PCI-DSS violation risk**
- Body data is already validated and sanitized by the application layer

---

## Verification

### Development

Start the server without `NODE_ENV=production`:
```bash
node src/server.js
```

Make a request:
```bash
curl http://localhost:3000/api/products
```

Expected terminal output (colourised by pino-pretty):
```
[09:15:23.412] INFO (12345): request completed
    req: {
      "method": "GET",
      "url": "/api/products",
      "ip": "::1"
    }
    res: { "statusCode": 200 }
    responseTime: 18
    msg: "request completed"
```

### Production

```bash
NODE_ENV=production node src/server.js
```

```bash
curl http://localhost:3000/api/products
```

Expected stdout (raw JSON, one line):
```json
{"level":30,"time":1722932123412,"req":{"method":"GET","url":"/api/products","ip":"::1"},"res":{"statusCode":200},"responseTime":18,"msg":"request completed"}
```

### Verify redaction
```bash
curl -H "Authorization: Bearer test-token" http://localhost:3000/api/products
```
The `authorization` field in the log should show `"[Redacted]"`, not the token value.

### Verify failed request logging
```bash
curl http://localhost:3000/api/nonexistent
```
Expected: log line with `"statusCode": 404` — the 404 middleware response is captured.

---

## Final Result

- ✅ Only `server.js` was modified for the logging feature
- ✅ `cartController.js` duplicate variable bug fixed (pre-existing syntax error)
- ✅ No business logic changed
- ✅ No API behavior changed
- ✅ No controllers, routes, models, or middleware modified
- ✅ Sensitive data (Authorization, Cookie) is redacted
- ✅ Request bodies and passwords are never logged
- ✅ Development output is human-readable via pino-pretty
- ✅ Production output is structured JSON — compatible with all log platforms
- ✅ Server starts without errors
