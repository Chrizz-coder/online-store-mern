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

* Set up Express backend server.
* Configured MongoDB Atlas cluster and connected it using Mongoose.
* Configured environment variables using `.env`.
* Learned MongoDB hierarchy:

  * Project
  * Cluster
  * Database
  * Collection
  * Document
* Created Mongoose models:

  * User
  * Product
  * Cart
  * Order
* Designed Version 1 scope of the e-commerce project.
* Implemented authentication routes:

  * `POST /api/auth/register`
  * `POST /api/auth/login`
  * `GET /api/auth/profile`
* Learned and implemented route mounting using:

  * `app.use("/api/auth", authRoutes)`
* Implemented user registration:

  * Input validation
  * Duplicate email check
  * Password hashing using bcrypt
  * User creation
  * JWT generation
* Implemented user login:

  * Email lookup
  * Password comparison using bcrypt
  * JWT generation
* Refactored JWT creation into reusable utility:

  * `generateToken()`
* Switched from default exports to named exports in controllers.
* Learned Git milestone workflow for backend development.

### Key Concepts Learned

* Express Router
* Route Mounting
* Controllers vs Routes
* Mongoose Models and Schemas
* Password Hashing (`bcryptjs`)
* JWT Authentication
* Environment Variables
* `async` / `await`
* `process.exit(1)`
* ES Modules (`import` / `export`)
* Named Export vs Default Export
* DRY Principle (Don't Repeat Yourself)

### Problems Faced

* Understanding route mounting.
* Confusion between default and named exports.
* JWT generation and scope issues.
* Understanding MongoDB Atlas structure.
* Authentication vs Authorization.

### Solutions

* Separated routes and controllers.
* Extracted JWT generation into `generateToken()`.
* Standardized on ES Modules.
* Adopted one-project, one-cluster Atlas structure.
* Clarified that role checks are only needed for admin routes.

### Git Milestones

Completed commits:

* `Setup Express server and MongoDB Atlas connection`
* `Create Mongoose schemas for ecommerce entities`
* `Setup authentication routes and API endpoints`
* `Implement user registration and login with JWT`

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

* Create `authMiddleware.js`
* Verify JWT from Authorization header
* Attach decoded user to `req.user`
* Implement protected `/profile` route
* Begin Product CRUD APIs

## 2026-06-17

### Completed

* Reviewed and refined User schema design.
* Discussed authentication vs authorization architecture.
* Implemented JWT-based registration flow.
* Implemented JWT-based login flow.
* Refactored token generation into reusable utility:

  * `generateToken.js`
* Learned and applied named exports in controllers.
* Built authentication middleware:

  * Token extraction
  * JWT verification
  * User lookup
  * Password exclusion using `.select("-password")`
* Built authorization middleware:

  * `adminOnly`
* Protected profile route using middleware chain:

  * `protect`
  * controller/route handler
* Tested authentication flow through Postman.
* Created Product Controller:

  * `getAllProducts()`
  * `getProductById()`
* Created Product Routes.
* Learned route parameters:

  * `/products/:id`
* Identified and fixed Router creation mistake:

  * `express.productRoutes()` → `express.Router()`

### Key Concepts Learned

* Authentication vs Authorization
* JWT Payload Design
* Middleware Chaining
* Request Lifecycle
* Express Router
* Route Mounting
* Named Exports vs Default Exports
* DRY Principle
* Mongoose Queries:

  * `find()`
  * `findById()`
* Request Headers
* Authorization Header:

  * `Bearer <token>`
* Route Parameters (`req.params`)
* Protected Routes

### Problems Faced

* Understanding when role checks are required.
* Understanding route mounting.
* Token scope issues inside controllers.
* Understanding middleware execution flow.
* Confusion around named exports and imports.
* Router initialization mistake.

### Solutions

* Role checks only on admin-protected operations.
* JWT verification centralized in middleware.
* Reusable token generation utility created.
* Authentication and authorization separated into different middleware.
* Standardized on named exports for controllers.
* Corrected Express Router setup.

### Git Milestones

Commit completed:

* Implement user registration and login with JWT
* Implement authentication middleware and protected routes
* Implement product listing and detail APIs

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

* Implement `createProduct()`
* Protect product creation using:

  * `protect`
  * `adminOnly`
* Create product validation flow
* Test admin product creation in Postman
* Begin Product CRUD completion
