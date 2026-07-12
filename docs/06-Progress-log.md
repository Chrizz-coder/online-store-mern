Date: 2026-06-12

Completed:

- Learned MongoDB collections, documents, schemas, and models
- Understood ObjectId and ref relationships
- Created User model with authentication-related fields
- Designed Product model with categories, brand, pricing, stock, images, and variants
- Added validation rules such as required fields, unique fields, min values, defaults, and timestamps
- Learned how product variants can handle different sizes and colors

Status:
Backend foundation is taking shape. Next step is designing the Cart model and understanding nested ObjectId references in practical ecommerce workflows.

## 2026-06-16

### Completed

- Set up Express backend server.
- Configured MongoDB Atlas cluster and connected it using Mongoose.
- Configured environment variables using `.env`.
- Learned MongoDB hierarchy:
  - Project
  - Cluster
  - Database
  - Collection
  - Document

- Created Mongoose models:
  - User
  - Product
  - Cart
  - Order

- Designed Version 1 scope of the e-commerce project.
- Implemented authentication routes:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/profile`

- Learned and implemented route mounting using:
  - `app.use("/api/auth", authRoutes)`

- Implemented user registration:
  - Input validation
  - Duplicate email check
  - Password hashing using bcrypt
  - User creation
  - JWT generation

- Implemented user login:
  - Email lookup
  - Password comparison using bcrypt
  - JWT generation

- Refactored JWT creation into reusable utility:
  - `generateToken()`

- Switched from default exports to named exports in controllers.
- Learned Git milestone workflow for backend development.

### Key Concepts Learned

- Express Router
- Route Mounting
- Controllers vs Routes
- Mongoose Models and Schemas
- Password Hashing (`bcryptjs`)
- JWT Authentication
- Environment Variables
- `async` / `await`
- `process.exit(1)`
- ES Modules (`import` / `export`)
- Named Export vs Default Export
- DRY Principle (Don't Repeat Yourself)

### Problems Faced

- Understanding route mounting.
- Confusion between default and named exports.
- JWT generation and scope issues.
- Understanding MongoDB Atlas structure.
- Authentication vs Authorization.

### Solutions

- Separated routes and controllers.
- Extracted JWT generation into `generateToken()`.
- Standardized on ES Modules.
- Adopted one-project, one-cluster Atlas structure.
- Clarified that role checks are only needed for admin routes.

### Git Milestones

Completed commits:

- `Setup Express server and MongoDB Atlas connection`
- `Create Mongoose schemas for ecommerce entities`
- `Setup authentication routes and API endpoints`
- `Implement user registration and login with JWT`

### Current Backend Status

```text
✓ Express Server
✓ MongoDB Connection
✓ User Model
✓ Product Model
✓ Cart Model
✓ Order Model
✓ Register API
✓ Login API
✓ JWT Generation
✓ Token Utility
```

### Next Session Goal

- Create `authMiddleware.js`
- Verify JWT from Authorization header
- Attach decoded user to `req.user`
- Implement protected `/profile` route
- Begin Product CRUD APIs

## 2026-06-17

### Completed

- Reviewed and refined User schema design.
- Discussed authentication vs authorization architecture.
- Implemented JWT-based registration flow.
- Implemented JWT-based login flow.
- Refactored token generation into reusable utility:
  - `generateToken.js`

- Learned and applied named exports in controllers.
- Built authentication middleware:
  - Token extraction
  - JWT verification
  - User lookup
  - Password exclusion using `.select("-password")`

- Built authorization middleware:
  - `adminOnly`

- Protected profile route using middleware chain:
  - `protect`
  - controller/route handler

- Tested authentication flow through Postman.
- Created Product Controller:
  - `getAllProducts()`
  - `getProductById()`

- Created Product Routes.
- Learned route parameters:
  - `/products/:id`

- Identified and fixed Router creation mistake:
  - `express.productRoutes()` → `express.Router()`

### Key Concepts Learned

- Authentication vs Authorization
- JWT Payload Design
- Middleware Chaining
- Request Lifecycle
- Express Router
- Route Mounting
- Named Exports vs Default Exports
- DRY Principle
- Mongoose Queries:
  - `find()`
  - `findById()`

- Request Headers
- Authorization Header:
  - `Bearer <token>`

- Route Parameters (`req.params`)
- Protected Routes

### Problems Faced

- Understanding when role checks are required.
- Understanding route mounting.
- Token scope issues inside controllers.
- Understanding middleware execution flow.
- Confusion around named exports and imports.
- Router initialization mistake.

### Solutions

- Role checks only on admin-protected operations.
- JWT verification centralized in middleware.
- Reusable token generation utility created.
- Authentication and authorization separated into different middleware.
- Standardized on named exports for controllers.
- Corrected Express Router setup.

### Git Milestones

Commit completed:

- Implement user registration and login with JWT
- Implement authentication middleware and protected routes
- Implement product listing and detail APIs

### Current Backend Status

```text
✓ MongoDB Connection
✓ User Model
✓ Product Model
✓ Cart Model
✓ Order Model

✓ Register API
✓ Login API
✓ JWT Utility
✓ Auth Middleware
✓ Admin Middleware
✓ Protected Profile Route

✓ Get All Products API
✓ Get Product By ID API

❌ Create Product API
❌ Update Product API
❌ Delete Product API

❌ Cart APIs
❌ Order APIs

❌ Frontend Integration
```

### Current Project Completion

```text
Backend Foundation        ██████████ 100%
Authentication            ██████████ 100%
Authorization             ██████████ 100%
Product APIs              ████░░░░░░ 40%
Cart APIs                 ░░░░░░░░░░ 0%
Order APIs                ░░░░░░░░░░ 0%
Frontend Integration      ░░░░░░░░░░ 0%
```

### Next Session Goal

- Implement `createProduct()`
- Protect product creation using:
  - `protect`
  - `adminOnly`

- Create product validation flow
- Test admin product creation in Postman
- Begin Product CRUD completion

## 2026-06-18

### Completed

#### Authentication Module

- Refactored authentication controllers using named exports.
- Implemented reusable JWT utility (`generateToken.js`).
- Implemented user registration flow:
  - Input validation
  - Duplicate email detection
  - Password hashing with bcrypt
  - User creation
  - JWT generation

- Implemented user login flow:
  - Email lookup
  - Password verification
  - JWT generation

- Implemented authentication middleware:
  - Authorization header extraction
  - JWT verification
  - User lookup
  - Password exclusion using `.select("-password")`

- Implemented authorization middleware:
  - `adminOnly`

- Protected profile route.

---

#### Product Module

- Implemented:
  - `GET /api/products`
  - `GET /api/products/:id`

- Added slug generation middleware:

```javascript
productSchema.pre("save", ...)
```

- Learned automatic slug creation from product names.
- Implemented:
  - `POST /api/products`

- Implemented:
  - `PUT /api/products/:id`

- Implemented:
  - `DELETE /api/products/:id`

- Adopted Soft Delete architecture:

```javascript
isActive = false;
```

instead of permanently deleting products.

---

### Key Concepts Learned

#### Backend Architecture

```text
Route
 ↓
Middleware
 ↓
Controller
 ↓
Model
 ↓
MongoDB
```

#### Authentication

- JWT
- Token Verification
- Authorization Header
- Protected Routes

#### Authorization

- Role-based access control
- Admin-only routes

#### Mongoose

- Schema Design
- Validation
- Middleware (`pre("save")`)
- `find()`
- `findById()`
- `findByIdAndUpdate()`

#### Express

- Route Mounting
- Express Router
- Middleware Chaining
- Route Parameters

#### Software Engineering

- DRY Principle
- Named Exports
- Soft Delete Pattern

---

### Bugs Found and Fixed

- Missing `return` after sending responses.
- JWT token scope issue.
- Incorrect status codes.
- Assignment (`=`) instead of comparison (`===`).
- Router initialization mistake.
- Product route middleware ordering issue.
- Missing `await product.save()` during soft delete.
- Incorrect variable reference (`updateProduct` vs `updatedProduct`).

---

### Git Milestones

Recommended commits completed today:

```bash
git commit -m "Implement authentication and authorization system"

git commit -m "Implement product listing and detail APIs"

git commit -m "Implement product CRUD APIs with admin authorization"
```

---

### Current Backend Status

```text
✓ Express Setup
✓ MongoDB Connection
✓ Environment Variables

✓ User Model
✓ Product Model
✓ Cart Model
✓ Order Model

✓ Register API
✓ Login API
✓ JWT Utility

✓ Auth Middleware
✓ Admin Middleware

✓ Protected Profile Route

✓ Create Product
✓ Get All Products
✓ Get Product By ID
✓ Update Product
✓ Soft Delete Product

❌ Cart APIs
❌ Order APIs
❌ Wishlist APIs
❌ Frontend Integration
❌ Stripe Payment Integration
```

---

### Current Project Completion

```text
Backend Foundation        ██████████ 100%
Authentication            ██████████ 100%
Authorization             ██████████ 100%
Product Module            ██████████ 100%
Cart Module               ░░░░░░░░░░   0%
Order Module              ░░░░░░░░░░   0%
Frontend Integration      ░░░░░░░░░░   0%
Payments                  ░░░░░░░░░░   0%
```

---

### Next Session Goal

Implement Cart Module:

1. `POST /api/cart`
   - Add product to cart

2. `GET /api/cart`
   - View current cart

3. `PUT /api/cart/:productId`
   - Update quantity

4. `DELETE /api/cart/:productId`
   - Remove product

Learn:

```text
User ↔ Cart ↔ Product relationships
```

This is the first feature where multiple collections interact together.
