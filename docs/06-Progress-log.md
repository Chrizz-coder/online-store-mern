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
