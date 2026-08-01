# Security Audit & Risk Assessment

> **Target Workspace:** E-Commerce Monorepo Backend (`backend/src`)  
> **Audit Date:** July 31, 2026  
> **Security Standards Baseline:** OWASP API Security Top 10 (2023), OWASP ASVS v4.0

---

## Executive Overview

This security review presents an audit of the backend authentication, authorization, data validation, cryptographic routines, and infrastructure headers. All findings are classified into **Confirmed Issues**, **Potential Risks**, or **Future Improvements**, backed by confidence levels and technical evidence from the source code.

---

## 1. Confirmed Issues

### SEC-01: Permissive CORS Policy Allows Arbitrary Cross-Origin Requests

* **Confidence Level:** High
* **Location:** `backend/src/server.js`
* **Evidence:**
  ```javascript
  // line 16
  app.use(cors());
  ```
* **Why It Is a Problem:** Calling `cors()` with default configuration sets `Access-Control-Allow-Origin: *`. This allows any malicious website running in a victim user's browser to make cross-origin HTTP requests to this backend API. If credentials or cookies are used in future revisions, cross-origin attacks can read or manipulate user data.
* **Impact:** Cross-Origin Data Leakage, CSRF risks on browsers supporting credentialed requests.
* **Recommendation:** Restrict allowed origins to trusted domain names loaded from environment variables:
  ```javascript
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"];
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  ```

---

### SEC-02: Missing Security HTTP Headers (No Helmet Integration)

* **Confidence Level:** High
* **Location:** `backend/src/server.js`, `backend/package.json`
* **Evidence:** `package.json` does not include `helmet`, and `server.js` does not set security HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`).
* **Why It Is a Problem:** Browsers interacting with the API are left vulnerable to MIME-type sniffing, clickjacking, and XSS attacks if API responses are rendered in browser frames.
* **Impact:** Increased vulnerability profile to client-side attacks (XSS, Clickjacking, MIME sniffing).
* **Recommendation:** Install `helmet` (`npm install helmet`) and register it as the first middleware in `server.js`:
  ```javascript
  import helmet from "helmet";
  app.use(helmet());
  ```

---

### SEC-03: Lack of Rate Limiting Exposes Auth Endpoints to Brute-Force & Credential Stuffing

* **Confidence Level:** High
* **Location:** `backend/src/routes/authRoutes.js`, `backend/src/server.js`
* **Evidence:** `express-rate-limit` is missing from `package.json`. Route `/api/user/login` allows unlimited request attempts per IP address.
* **Why It Is a Problem:** An attacker can execute automated dictionary or credential stuffing attacks against `/api/user/login` without being throttled or blocked.
* **Impact:** User account takeover, resource exhaustion, denial of service (DoS) on CPU-heavy bcrypt hashing.
* **Recommendation:** Apply strict rate limiting to authentication routes:
  ```javascript
  import rateLimit from "express-rate-limit";
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 failed requests per IP
    message: { message: "Too many login attempts. Please try again after 15 minutes." }
  });
  router.post("/login", authLimiter, loginUser);
  ```

---

### SEC-04: Weak Password Complexity Rules at Schema Level

* **Confidence Level:** High
* **Location:** `backend/src/models/userModel.js`, `backend/src/controllers/authController.js`
* **Evidence:**
  ```javascript
  // userModel.js lines 78-82
  password: {
    type: String,
    required: true,
    minlength: 6,
  }
  ```
* **Why It Is a Problem:** Accepting passwords with as few as 6 simple characters (e.g. `123456` or `qwerty`) exposes users to dictionary attacks. Neither `userModel.js` nor `authController.js` enforces character complexity requirements (uppercase, numbers, special characters).
* **Impact:** Account compromise via dictionary and weak password cracking attacks.
* **Recommendation:** Enforce a minimum length of 8+ characters and complexity checks using regex or a validation library (`zod` / `validator.js`).

---

### SEC-05: Potential NoSQL Injection Vulnerability in Authentication Routes

* **Confidence Level:** High
* **Location:** `backend/src/controllers/authController.js` (`loginUser`, `registerUser`)
* **Evidence:**
  ```javascript
  // lines 56
  const user = await User.findOne({ email });
  ```
* **Why It Is a Problem:** If `req.body.email` is sent as a JSON object (e.g. `{ "email": { "$ne": null }, "password": "123" }`), Mongoose evaluates `{ email: { "$ne": null } }`, returning the first user in the database without sanitizing the input object.
* **Impact:** Authentication bypass / NoSQL injection allowing unauthorized access to arbitrary accounts.
* **Recommendation:** Ensure inputs are strictly strings before querying MongoDB, or install `express-mongo-sanitize`:
  ```javascript
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Invalid input types." });
  }
  ```

---

## 2. Potential Risks

### SEC-06: JWT Token Invalidation Strategy Missing (Replay & Revocation Risks)

* **Confidence Level:** High
* **Location:** `backend/src/utils/generateToken.js`, `backend/src/middleware/authMiddleware.js`
* **Evidence:** JWTs are issued with a 2-day expiration (`expiresIn: "2d"`). There is no logout endpoint on the server, no token blacklist, and no checking if `passwordChangedAt` predates token issuance.
* **Why It Is a Risk:** If a user logs out on the client, or if an attacker steals a valid JWT, the token remains fully active on the server for 48 hours. Password changes do not invalidate existing tokens.
* **Impact:** Session hijacking, inability to revoke compromised tokens.
* **Recommendation:** Implement short-lived JWT access tokens (15–30 mins) coupled with HTTP-only Refresh Tokens stored in Redis, allowing immediate token revocation.

---

### SEC-07: Mass Assignment Vulnerability in Product Update API

* **Confidence Level:** High
* **Location:** `backend/src/controllers/productController.js` (`updateProduct`)
* **Evidence:**
  ```javascript
  // lines 105-115
  const updates = req.body;
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );
  ```
* **Why It Is a Risk:** `{ $set: updates }` applies the entire `req.body` directly to the database. An admin or compromised admin session can pass internal or unexpected fields directly into the MongoDB document.
* **Impact:** Document field corruption, unexpected property pollution.
* **Recommendation:** Explicitly pick allowed update fields:
  ```javascript
  const allowedFields = ["name", "description", "basePrice", "salePrice", "category", "brand", "tags", "images"];
  const safeUpdates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
  }
  ```

---

## 3. Future Improvements

### SEC-08: Sensitive Information Exposure in Error Logs

* **Confidence Level:** High
* **Location:** `backend/src/middleware/authMiddleware.js`, `backend/src/controllers/*`
* **Evidence:** `console.error("Token validation error:", error)` prints raw exception objects to stdout.
* **Why It Is a Risk:** In production environment log management services (Datadog, AWS CloudWatch), uncaught exceptions logged via `console.error` can expose environment details or authorization headers.
* **Impact:** Sensitive operational data leaking to log aggregation tools.
* **Recommendation:** Integrate a structured logger (Pino or Winston) with automatic sensitive field redacting (`authorization`, `password`, `token`).

---

## Security Audit Summary Matrix

| ID | Vulnerability Title | Category | Severity | Confidence | Affected Module |
|---|---|---|---|---|---|
| **SEC-01** | Permissive CORS Policy (`*`) | API Security | High | High | `server.js` |
| **SEC-02** | Missing Helmet Security Headers | HTTP Security | High | High | `server.js` |
| **SEC-03** | Missing Rate Limiting | Auth Security | High | High | `routes/authRoutes.js` |
| **SEC-04** | Weak Password Schema Validation | Data Security | Medium | High | `models/userModel.js` |
| **SEC-05** | Potential NoSQL Query Injection | Input Security | High | High | `controllers/authController.js` |
| **SEC-06** | Lack of JWT Revocation / Blacklist | Session Security | Medium | High | `utils/generateToken.js` |
| **SEC-07** | Mass Assignment in Product Update | Data Security | Medium | High | `controllers/productController.js` |
| **SEC-08** | Unsanitized `console.error` Logging | Logging Security | Low | High | `middleware/authMiddleware.js` |

