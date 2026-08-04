# Rate Limiter Implementation & Security Specification Report

## Executive Summary

This report outlines the proposed implementation plan for **Task 6: Auth Route Rate Limiting** using `express-rate-limit` on the Express 5 + MongoDB e-commerce backend.

By introducing request throttling specifically tailored to authentication endpoints (`/api/user/login` and `/api/user/register`), the application will block automated brute-force password attacks, credential stuffing, and bot registration spam without impacting legitimate users or general API traffic.

> [!IMPORTANT]  
> **Status**: Design & Specification Phase (Not yet applied to codebase per user request).

---

## 1. Threat Model & Rationale

### Primary Vulnerabilities Addressed
1. **Brute-Force Password Guessing**: Automated scripts repeatedly sending dictionary words or stolen passwords to `/api/user/login`.
2. **Credential Stuffing**: Attackers using leaked username/password lists across multiple sites.
3. **Registration Spam & Resource Exhaustion**: Bots mass-creating spam accounts, causing database bloat and compute overload.

### Protection Policy
- **Target Endpoints**: `POST /api/user/login` and `POST /api/user/register`
- **Threshold**: Maximum **10 attempts** per IP address within a **15-minute sliding window**.
- **Penalty**: Excessive requests are blocked with HTTP `429 Too Many Requests` for 15 minutes (`Retry-After: 900`).

---

## 2. Package Dependency

### Installation Command
```bash
npm install express-rate-limit
```

### Dependency Scope
- `express-rate-limit`: Lightweight, zero-dependency middleware for Express to limit repeated requests to public APIs or endpoints.

---

## 3. Proposed Architecture & Code Implementation

### File 1: `backend/src/middleware/rateLimiter.js` (NEW)

Create a centralized rate limiting middleware module:

```javascript
import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

/**
 * Auth Rate Limiter
 * Restricts login and registration attempts to 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: "draft-7", // Combined RateLimit header format (RFC draft)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count both successful and failed attempts
  handler: (req, res, next, options) => {
    // Throw standard ApiError to integrate seamlessly with global errorHandler
    next(
      new ApiError(
        429,
        "Too many authentication attempts. Please try again after 15 minutes."
      )
    );
  },
});
```

---

### File 2: `backend/src/routes/authRoutes.js` (MODIFY)

Apply `authLimiter` selectively to authentication routes only, preserving unthrottled access to profile queries for logged-in users:

```javascript
import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Apply rate limiting strictly to sensitive authentication endpoints
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

// Protected routes remain unthrottled by authLimiter
router.get("/profile", protect, (req, res) => {
  res.status(200).json(req.user);
});

export default router;
```

---

### File 3: `backend/src/server.js` (MODIFY)

Configure Express proxy trust to ensure client IP detection is accurate when deployed behind reverse proxies (Nginx, Cloudflare, AWS ALB, Render, Vercel):

```javascript
// Trust first proxy header (required for correct req.ip under reverse proxies)
app.set("trust proxy", 1);
```

---

## 4. Integration with Existing Architecture

### Global Error Handler Integration
Instead of sending generic responses, the rate limiter delegates `429` status code handling to the existing `ApiError` class and `errorHandler` middleware.

**Sample HTTP 429 JSON Response**:
```json
{
  "success": false,
  "message": "Too many authentication attempts. Please try again after 15 minutes.",
  "stack": null
}
```

### Response Headers Included
When clients send requests to `/login` or `/register`, the following standard rate-limit headers will be returned:
- `RateLimit-Limit: 10`
- `RateLimit-Remaining: 9`
- `RateLimit-Reset: 900`
- `Retry-After: 900` *(Included on HTTP 429 response)*

---

## 5. Reverse Proxy & Production Scalability Considerations

1. **Proxy IP Detection**: 
   - Without `app.set("trust proxy", 1)`, all incoming requests behind Cloudflare or Nginx would share the proxy server's IP, inadvertently blocking all users at once. Setting `trust proxy` resolves this.
2. **In-Memory vs Redis Store**:
   - For single-instance Node servers, the default memory store of `express-rate-limit` is sufficient.
   - For multi-instance load-balanced production clusters, `rate-limit-redis` can be attached to store rate limit counters in a shared Redis cache.

---


## 6. Verification & Testing Plan

### Step-by-Step Test Procedure
1. **Automated Test / Loop Script**:
   Execute 11 consecutive HTTP POST requests to `http://localhost:3000/api/user/login`:
   ```bash
   for i in {1..11}; do
     curl -i -X POST http://localhost:3000/api/user/login \
          -H "Content-Type: application/json" \
          -d '{"email":"test@example.com","password":"wrongpassword"}'
   done
   ```
2. **Expected Results**:
   - Requests 1 to 10: Processed normally (returns `401 Unauthorized` for bad credentials).
   - Request 11: Fails immediately with `429 Too Many Requests` and includes `Retry-After: 900` header.

---

## 7. Recommended Git Commit Specification

When ready for implementation, the changes should be committed using the following message:

```text
security: protect auth routes with rate limiting
```

---

## Summary Table

| Parameter | Configuration |
| :--- | :--- |
| **Target Routes** | `POST /api/user/login`, `POST /api/user/register` |
| **Window Duration** | 15 Minutes (`900,000 ms`) |
| **Max Requests** | 10 attempts per IP |
| **HTTP Status Code** | `429 Too Many Requests` |
| **Error Handling** | Integrated via `ApiError` & Global `errorHandler` |
| **Header Standard** | IETF RFC Draft-7 (`RateLimit-*`) |
