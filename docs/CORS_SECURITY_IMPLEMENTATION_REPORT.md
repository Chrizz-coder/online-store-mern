# CORS Security Implementation Report

## Summary

The default, unconfigured CORS middleware (`app.use(cors())`) was replaced with a strict, production-ready, environment-aware CORS configuration. 

The previous default setup allowed any origin (`Access-Control-Allow-Origin: *`) to make cross-origin requests to the backend API. While convenient during initial bootstrapping, wildcard CORS in a production e-commerce application creates severe security vulnerabilities:
- **Cross-Site Exploitation**: Malicious websites visited by logged-in users could make cross-origin API calls on their behalf.
- **Credential Exposure**: Default wildcard CORS cannot safely support authenticated requests with credentials or custom headers like `Authorization: Bearer <token>`.
- **Lack of Origin Isolation**: Any third-party domain could read sensitive API responses.

The new implementation restricts browser access exclusively to explicitly trusted frontend origins while retaining full compatibility with non-browser API clients (Postman, cURL), internal server-to-server requests, and third-party webhooks (Razorpay).

---

## Files Modified

- `backend/src/server.js`: Replaced permissive `app.use(cors())` with dynamic `corsOptions` and dynamic origin validation callback.
- `backend/.env.example`: Added `FRONTEND_URL` environment variable definition.
- `backend/.env`: Configured `FRONTEND_URL` for local development.

---

## Environment Variables

### `FRONTEND_URL`
- **Purpose**: Specifies the primary production frontend domain (e.g., `https://yourdomain.com` or `http://localhost:5173` in local testing).
- **Behavior**: Evaluated dynamically at runtime within the CORS origin whitelist array (`allowedOrigins`). If undefined in an environment, it is automatically filtered out using `.filter(Boolean)` without breaking the array logic or throwing errors.

---

## Middleware Order

### Before Implementation
```text
1. helmet()
2. cors()  <-- Permissive wildcard (Access-Control-Allow-Origin: *)
3. express.json()
4. Routes (/api/user, /api/products, /api/cart, etc.)
5. notFound (404 Handler)
6. errorHandler (Global Error Handler)
```

### After Implementation
```text
1. helmet()  <-- Sets security headers (CSP, HSTS, X-Frame-Options, etc.)
2. cors(corsOptions)  <-- Enforces strict origin whitelist & preflight options
3. express.json()  <-- Parses JSON request bodies for allowed requests
4. Routes (/api/user, /api/products, /api/cart, etc.)
5. notFound (404 Handler)
6. errorHandler (Global Error Handler)
```

*Note: Placing CORS directly after Helmet ensures that preflight `OPTIONS` requests are handled and validated before reaching body parsers or route handlers.*

---

## Allowed Origins

The `allowedOrigins` array dynamically combines static local development domains with environment-driven production domains:

1. `http://localhost:5173`: Default development URL for Vite + React frontend applications.
2. `http://localhost:3000`: Standard local development port / alternate frontend server.
3. `process.env.FRONTEND_URL`: Dynamic production domain configured via host environment variables (e.g., Vercel, Netlify, AWS).
4. **Server-to-Server / Requests without Origin Header**:
   - Requests originating from non-browser clients (such as backend-to-backend calls, cURL CLI commands, Postman, and Razorpay webhook notifications) do **not** send an `Origin` HTTP header (`origin === undefined`).
   - The origin callback explicitly permits `!origin` requests, ensuring API tools and payment callbacks remain fully operational.

---

## CORS Configuration

```javascript
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### Explanation of Configuration Parameters:

- **`origin`**: A function that checks the incoming `req.headers.origin` against `allowedOrigins`. If matched or if `!origin`, it invokes `callback(null, true)`. Otherwise, it rejects the connection with `new Error("Not allowed by CORS")`.
- **`credentials`**: Set to `true`. Instructs the browser that cross-origin requests are allowed to pass credentials (cookies, HTTP authentication, or TLS client certificates).
- **`methods`**: Explicitly enumerates allowed HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`) to prevent unauthorized HTTP method execution.
- **`allowedHeaders`**: Restricts accepted client headers to `Content-Type` and `Authorization` (required for JWT tokens).
- **`optionsSuccessStatus`**: Set to `200` (instead of 240/204) to support legacy browsers and devices during `OPTIONS` preflight checks.

---

## Authentication Compatibility

- **JWT / `Authorization` Header**: Frontend applications send JWT authentication tokens via the HTTP header `Authorization: Bearer <token>`. Browsers issue a preflight `OPTIONS` request prior to sending custom authorization headers.
- The CORS configuration explicitly lists `Authorization` under `allowedHeaders` and allows `OPTIONS` in `methods`, ensuring that preflight requests pass cleanly and authenticated API routes work seamlessly.

---

## Razorpay Compatibility

- **Razorpay Webhooks & Server Integration**: Webhook events dispatched from Razorpay servers directly to `/api/payment/webhook` do not include a browser `Origin` header (`req.headers.origin` is `undefined`).
- Because the origin validator includes `if (!origin || ...)`, Razorpay payment notifications and verification requests pass through without triggering CORS rejection.

---

## Development vs Production

- **Local Development**: Works out of the box with `http://localhost:5173` and `http://localhost:3000`. Developers can test locally without editing environment configs.
- **Production Environment**: Simply set `FRONTEND_URL=https://your-production-frontend.com` in host settings (Vercel, Render, AWS, Docker). The backend automatically accepts traffic from the production domain while rejecting unauthorized browser domains.

---

## Security Benefits

1. **Restricted Browser Access**: Only approved origins can read API responses in browser contexts.
2. **Reduced Attack Surface**: Disallows arbitrary HTTP methods and unapproved headers.
3. **Safer Authorization Handling**: Configures strict preflight policies for `Authorization` headers.
4. **Environment Awareness**: Decouples configuration from hardcoded strings using runtime environment variables.
5. **Cookie Readiness**: `credentials: true` establishes a foundation for HTTP-only cookie authentication if migrated in the future.
6. **Protection Against Malicious Cross-Domain Scripts**: Prevents unauthorized third-party sites from interacting with user sessions via cross-site requests.

---

## Testing

### 1. Browser Verification
Open DevTools Network tab on an allowed frontend origin (`http://localhost:5173`):
- Inspect response headers for `/api/products`:
  - `Access-Control-Allow-Origin: http://localhost:5173`
  - `Access-Control-Allow-Credentials: true`

### 2. cURL CLI Verification
Execute cURL request with trusted origin:
```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:3000/api/products
```
*Expected Output*: Returns HTTP `200 OK` with `Access-Control-Allow-Origin: http://localhost:5173`.

Execute cURL request with untrusted origin:
```bash
curl -i -H "Origin: http://malicious-site.com" http://localhost:3000/api/products
```
*Expected Output*: The server returns a CORS error or omits `Access-Control-Allow-Origin`, causing the browser to block the response.

Execute cURL request without Origin header (simulating Postman / Server-to-server / Webhooks):
```bash
curl -i http://localhost:3000/api/products
```
*Expected Output*: Returns HTTP `200 OK` normally.

---

## Final Result

The CORS configuration has been hardened to production standards. All existing business logic, routes, controllers, authentication middleware, Cloudinary media utilities, and Razorpay payment flows remain 100% intact and functional.
