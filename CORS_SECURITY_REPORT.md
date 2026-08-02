# CORS Security & Hardening Report

## Executive Summary

This report provides a detailed analysis of Cross-Origin Resource Sharing (CORS) security for the Express 5 e-commerce backend. It explains the risks of default wildcard CORS configurations (`app.use(cors())`), breaks down core web security mechanics (**Origin**, **Preflight Requests**, and **Credentials**), and specifies an enterprise-grade CORS configuration restricted strictly to authorized origins (local development environments and production frontend domains).

---

## 1. Current State vs. Production Security Target

### Current Configuration
```javascript
// Express default CORS setup
app.use(cors());
```

### Risk & Limitations of Current Setup
1. **Unrestricted Origin Access**: Default `cors()` returns `Access-Control-Allow-Origin: *`. Any website or malicious domain on the internet can make cross-origin API calls to your backend from a user's browser.
2. **Incompatibility with Credentials**: Web browsers strictly disallow sending cookies, HTTP authentication, or TLS client certificates when `Access-Control-Allow-Origin` is set to wildcard `*`.
3. **Lack of Environment Control**: Does not differentiate between local development URLs (`http://localhost:5173`) and production deployment domains.

### Production Target Architecture
Restrict cross-origin API access strictly to:
- **Localhost Development**: `http://localhost:5173` (Vite React dev server), `http://localhost:3000` (Local API server).
- **Production Frontend Domain**: Configured dynamically via environment variables (`process.env.FRONTEND_URL`).
- **Server-to-Server / Tools**: Allow requests with no `Origin` header (e.g. Postman, cURL, server-side webhooks).

---

## 2. Deep-Dive: Core CORS Mechanics

### 2.1 What is an Origin?
An **Origin** is defined by the triple of `(Protocol, Host, Port)`:

$$\text{Origin} = \text{Scheme} + \text{Host} + \text{Port}$$

- `http://localhost:5173` and `http://localhost:3000` are **different origins** because their ports differ.
- `http://example.com` and `https://example.com` are **different origins** because their protocols differ.
- `https://api.store.com` and `https://store.com` are **different origins** because their hostnames differ.

The browser enforces the **Same-Origin Policy (SOP)** by default, blocking scripts on one origin from reading data fetched from another origin unless the server explicitly grants permission via CORS headers.

---

### 2.2 Preflight Requests (`OPTIONS`)
When a web browser makes a "non-simple" cross-origin HTTP request, it automatically issues a **Preflight Request** before the actual request.

#### What makes a request "non-simple"?
- HTTP methods other than `GET`, `HEAD`, or `POST`.
- Requests using custom headers (e.g. `Authorization: Bearer <token>`, `X-Requested-With`).
- `Content-Type` headers other than `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain` (e.g. `application/json`).

#### Preflight Sequence Flow
```
Browser                                            Express Backend
   │                                                      │
   │  1. OPTIONS /api/orders (Preflight)                  │
   ├─────────────────────────────────────────────────────►│
   │     Access-Control-Request-Method: POST            │
   │     Access-Control-Request-Headers: authorization    │
   │     Origin: http://localhost:5173                    │
   │                                                      │
   │  2. 200 OK / 204 No Content (Response)               │
   │◄─────────────────────────────────────────────────────┤
   │     Access-Control-Allow-Origin: http://localhost:5173
   │     Access-Control-Allow-Methods: GET,POST,PUT,DELETE
   │     Access-Control-Allow-Headers: Authorization,Content-Type
   │     Access-Control-Max-Age: 86400                    │
   │                                                      │
   │  3. POST /api/orders (Actual Request)                │
   ├─────────────────────────────────────────────────────►│
   │     Authorization: Bearer eyJhbGciOi...              │
   │                                                      │
   │  4. 201 Created (Actual Response)                    │
   │◄─────────────────────────────────────────────────────┤
```

---

### 2.3 Credentials (`Access-Control-Allow-Credentials`)
Credentials include HTTP Cookies, HTTP Authentication headers, and client-side TLS certificates.

- **Rule**: If `credentials: true` is configured in CORS, the backend responds with `Access-Control-Allow-Credentials: true`.
- **Browser Security Invariant**: If a server sends `Access-Control-Allow-Credentials: true`, the browser **WILL REJECT** the response if `Access-Control-Allow-Origin` is `*`. The origin **MUST** be explicitly named (e.g., `http://localhost:5173`).

---

## 3. Recommended Production Implementation Guide

> [!NOTE]
> This section details how to implement secure, environment-aware CORS in Express 5 without breaking existing API routes or authentication flows.

### 3.1 Environment Variable Configuration
Add `FRONTEND_URL` to `.env` and `.env.example`:

```env
# backend/.env
FRONTEND_URL=http://localhost:5173
```

In production (e.g. Render / Railway / AWS):
```env
FRONTEND_URL=https://your-production-domain.com
```

---

### 3.2 Production-Ready Express CORS Setup
Below is the recommended clean CORS configuration pattern for `server.js`:

```javascript
import cors from "cors";

// Define whitelisted origins for Development & Production
const allowedOrigins = [
  "http://localhost:5173", // Local React / Vite dev server
  "http://localhost:3000", // Local backend / alternative client
  process.env.FRONTEND_URL // Production frontend domain
].filter(Boolean); // Filter out undefined values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, cURL, mobile apps, server-to-server webhooks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS Policy Violation: Origin '${origin}' is not allowed.`));
    }
  },
  credentials: true, // Allow cookies & authorization headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
  optionsSuccessStatus: 200 // Legacy browser support (IE11 / older mobile browsers)
};

// Apply CORS middleware immediately after Helmet
app.use(cors(corsOptions));
```

---

## 4. Impact Analysis & Integration Verification

| Component | Operational Impact | Mitigation / Status |
| :--- | :--- | :--- |
| **JWT Authentication** | Headers containing `Authorization: Bearer <token>` require preflight checks. | Explicitly allowed in `allowedHeaders: ['Authorization', ...]`. |
| **Razorpay Checkout** | Razorpay webhooks (server-to-server) send requests without an `Origin` header. | `!origin` handling permits webhook calls to `/api/payment/verify`. |
| **Cloudinary Assets** | Image URLs are fetched by frontend `<img>` elements or canvas renderers. | Whitelisted in Helmet `imgSrc` and CORP `cross-origin`. |
| **Postman / cURL Testing** | Non-browser tools do not attach an `Origin` header. | Allowed via `!origin` check. |
| **Vite / React Dev Server** | Running on `http://localhost:5173`. | Included in default `allowedOrigins` array. |

---

## 5. Security & Maintenance Benefits

1. **Stops Cross-Origin Data Exfiltration**: Prevents malicious third-party websites from executing background API calls to read user carts, user profiles, or order details.
2. **Enables Cookie/Session Security**: Prepares the backend for HttpOnly cookie authentication if needed in future iterations.
3. **Explicit Environment Separation**: Automatically restricts production access to your verified frontend domain while preserving local developer productivity.
