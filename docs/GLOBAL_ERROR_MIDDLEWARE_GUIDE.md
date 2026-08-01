# Educational Guide: Implementing Global Error Middleware in Express

## 1. The Core Problem: Scattered Error Handling & Leaky Responses

### Current State of the Codebase
Currently, every controller in `backend/src/controllers/` (such as `authController.js`, `cartController.js`, `orderController.js`, etc.) duplicates `try-catch` logic manually:

```javascript
// Found in almost every controller method:
export const someController = async (req, res) => {
  try {
    // Business logic...
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Server error during operation." });
  }
};
```

### Why This Is Dangerous for Production

1. **Inconsistent Error Payloads**: Different controllers format errors differently (e.g., `{ message: "..." }` vs `{ error: "..." }` vs plain text). Frontends expect a predictable, standardized response format.
2. **Leaking Internal Implementation Details**: If an error is thrown outside a `try-catch` block (or by a third-party library), Express defaults to rendering an **HTML stack trace page**. This reveals internal directory structures, library versions, and database schemas to potential attackers.
3. **Massive Boilerplate Code**: Repeating the same `catch (error) { return res.status(500)... }` in dozens of endpoints clutters controller code and makes maintenance difficult.

---

## 2. Express Middleware Architecture & Error Propagation

### The Middleware Execution Chain
In Express, request handling is a sequential chain of functions:

```
[ Incoming Request ]
         │
         ▼
 1. Body Parser (express.json())
         │
         ▼
 2. Routes (/api/user, /api/products, etc.)
         │
         ├─── (Success) ──► res.json(...)
         │
         └─── (Error / next(err)) 
                     │
                     ▼
             3. 404 Route Not Found Middleware
                     │
                     ▼
             4. Global Error Handling Middleware 🔒 (4-Arity Function)
                     │
                     ▼
          Standardized JSON Response ({ success: false, message: "..." })
```

### How Express Identifies Error Middleware (The 4-Arity Signature)
Express identifies an error-handling middleware **solely by the number of arguments** in its function definition:

```javascript
// Standard Middleware (3 arguments):
app.use((req, res, next) => { ... });

// Error Handling Middleware (EXACTLY 4 arguments):
app.use((err, req, res, next) => { ... });
```
> ⚠️ **Critical Rule**: You MUST include all four parameters `(err, req, res, next)` even if you don't use `next` inside the function body. If you omit `next`, Express will treat it as a normal middleware and skip it when errors occur!

### Express 5 Async Error Handling
Because this project uses **Express 5** (`"express": "^5.2.1"` in `package.json`), any rejected promise or unhandled thrown error inside an `async` route function is **automatically forwarded to `next(err)`**! You no longer need `express-async-handler` wrappers.

---

## 3. Standardized Error Response Format

A professional e-commerce API should return errors in a uniform JSON format across all endpoints:

```json
{
  "success": false,
  "message": "User not found",
  "stack": null
}
```

* In **Development** (`NODE_ENV=development`), `stack` contains the error stack trace to aid debugging.
* In **Production** (`NODE_ENV=production`), `stack` is set to `null` to protect system security.

---

## 4. Blueprint for Implementation (Where & What to Fix)

Do NOT implement these changes yet — use this blueprint to guide your implementation:

### Step A: Create Custom Error Class (`backend/src/utils/ApiError.js`) [NEW]
Creating a custom `ApiError` class allows controllers to throw errors with specific HTTP status codes (e.g. 400 Bad Request, 404 Not Found, 401 Unauthorized):

```javascript
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
```

---

### Step B: Create Global Error Middleware (`backend/src/middleware/errorMiddleware.js`) [NEW]

This file will contain two essential functions:
1. `notFound`: Catches requests to non-existent API endpoints and generates a 404 error.
2. `errorHandler`: The 4-argument central error handler that formats all errors into standardized JSON.

```javascript
// 1. Handle 404 - Not Found
export const notFound = (req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 2. Global Error Handler (4 arguments)
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
```

---

### Step C: Register Middlewares in `backend/src/server.js` [MODIFY]

Register `notFound` and `errorHandler` at the very end of `server.js`, **after all route declarations**:

```javascript
// server.js snippet:

// 1. Routes
app.use("/api/user", userRoutes);
app.use("/api/products", productRoutes);
// ... other routes ...

// 2. 404 Handler (Runs if no route matches)
app.use(notFound);

// 3. Global Error Handler (MUST BE LAST)
app.use(errorHandler);
```

---

### Step D: Clean Up Controllers (`backend/src/controllers/*.js`) [MODIFY]

Instead of writing manual `catch` blocks that handle HTTP responses individually:

#### Old Pattern (Scatter & Duplicate):
```javascript
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
```

#### Refactored Pattern (Clean & Delegated):
```javascript
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error); // Delegate error to global error middleware
  }
};
```

---

## 5. Summary Checklist of Files to Create / Modify

| Action | File Path | Purpose |
| :--- | :--- | :--- |
| **[NEW]** | `backend/src/utils/ApiError.js` | Custom `Error` subclass with status code support |
| **[NEW]** | `backend/src/middleware/errorMiddleware.js` | `notFound` (404) & 4-arity `errorHandler` middleware |
| **[MODIFY]** | `backend/src/server.js` | Import and append error middleware at the bottom of the middleware stack |
| **[MODIFY]** | `backend/src/controllers/*.js` | Delegate caught errors via `next(error)` or throw `ApiError` |
