# Full-Stack MERN E-Commerce Platform

A production-ready e-commerce RESTful API and web application built with the MERN stack (MongoDB, Express.js, React/Next.js, Node.js). This application delivers end-to-end e-commerce functionality including JWT authentication, role-based access control, catalog management with multi-variant support, transactional order processing, review aggregation, and Razorpay payment integration.

---

## Project Status

| Component | Status | Description |
| :--- | :--- | :--- |
| **Backend API** | ✅ **Complete** | Production-ready, fully hardened REST API with error handling, logging, rate limiting, and transactions. |
| **Frontend UI** | 🚧 **In Progress** | Active client interface development using Next.js and modern UI components. |
| **Overall Project** | 🔄 **Active Development** | Core architecture completed; client integration underway. |

---

## Overview

This project is a scalable, modular MERN e-commerce system designed to handle real-world online storefront operations. The backend is architected following separation of concerns across routes, controllers, models, middleware, and services. 

It provides reliable inventory management, ACID-compliant multi-document transactions for order processing, weighted full-text search, secure payment processing via Razorpay, and enterprise-grade security features including HTTP header defense (Helmet), tiered rate limiting, and NoSQL query sanitization.

---

## Features

### Backend Features

The backend REST API is fully implemented and tested with the following capabilities:

* **Authentication & Authorization**:
  * User registration and authentication using JWT (JSON Web Tokens).
  * Password hashing via `bcryptjs`.
  * Role-based authorization middleware enforcing Administrator (`admin`) permissions for administrative actions.
* **Product Catalog & Management**:
  * Product CRUD operations with automatic SEO-friendly URL slug generation (`pre-save` hook).
  * Support for multi-variant products (color, size, variant-specific pricing, and variant stock tracking).
  * Global stock fallback for non-variant products.
  * Soft-deletion mechanism using product state flags (`isActive`).
* **Search, Filtering & Pagination**:
  * Weighted MongoDB full-text search across `name` (weight 10), `brand` (weight 5), `tags` (weight 3), and `description` (weight 1).
  * Multi-attribute filtering by category, brand, price range (`minPrice`, `maxPrice`), and minimum average rating.
  * Sorting options: price low-to-high, price high-to-low, highest rated, newest, and text search relevance score.
  * Server-side pagination with custom page limits and validation.
* **Cart & Wishlist Systems**:
  * Persistent user carts with live validation of inventory and pricing before checkout.
  * Real-time cart subtotal calculation and quantity update limits.
  * User wishlist management (add, retrieve, and remove items).
* **Order Processing & Inventory Control**:
  * ACID-compliant checkout flow powered by MongoDB transactions (`startSession`).
  * Atomic inventory deduction upon order placement and stock restoration on order cancellation.
  * Order status management (`placed`, `processing`, `cancelled`) and user order history tracking.
* **Review & Rating Aggregation**:
  * Verified purchase requirement enforcing that users can only review products they have bought.
  * One-review-per-variant constraint to prevent duplicate feedback.
  * Real-time product average rating calculation using MongoDB Aggregation pipelines (`$match`, `$group`).
* **Address Management**:
  * User shipping address management (multiple addresses per account).
  * Default shipping address selection logic.
* **Razorpay Payment Integration**:
  * Payment order creation via Razorpay SDK.
  * Server-side cryptographic payment verification using HMAC-SHA256 signatures before order finalization.
* **Security & Hardening**:
  * Security headers via **Helmet** with custom Content Security Policy (CSP) for Razorpay and Cloudinary assets.
  * Strict origin whitelist **CORS** configuration.
  * Tiered rate limiters (**express-rate-limit**) guarding routes: Auth (5 requests / 15m), Payments (10 requests / 1m), Orders (20 requests / 1h), Reviews (5 requests / 1h), Search (100 requests / 1m), Cart (120 requests / 1m), Admin (20 requests / 1h), and Global baseline (100 requests / 15m).
  * Defense against NoSQL Injection via `express-mongo-sanitize`.
* **Reliability, Logging & Performance**:
  * High-performance structured HTTP logging via **Pino** (`pino-http`) with sensitive field redaction (Authorization tokens, cookies).
  * Gzip response payload compression via **compression**.
  * Fail-fast environment configuration module with mandatory variable validation.
  * Microsecond system uptime and database connectivity health check (`GET /health`).
  * Graceful process termination handling `SIGINT` and `SIGTERM` signals with connection teardown timeouts.

---

### Frontend Features

The client application is under active development. Planned frontend modules include:

* **Authentication**: Login, registration, token storage, and session persistence.
* **Product Browsing**: Product grid, text search, filter sidebar, dynamic sorting, and paginated navigation.
* **Product Details**: Multi-image carousel, variant selection (color/size), dynamic pricing updates, and customer review listing.
* **Cart & Wishlist**: Dynamic cart drawer, item quantity modifiers, and save-for-later functionality.
* **Checkout Flow**: Shipping address selection, order summary preview, cash-on-delivery (COD) & Razorpay gateway integration.
* **Admin Dashboard**: Catalog management, product creation form, inventory stock controls, and order status updates.

---

## Tech Stack

### Backend
* **Runtime**: Node.js (ES Modules)
* **Framework**: Express.js (v5)
* **Logging**: Pino HTTP (`pino-http`), Pino Pretty (`pino-pretty`)
* **Utilities**: Compression

### Database
* **Database Engine**: MongoDB
* **ODM**: Mongoose (v9)
* **Features**: ACID Transactions, Compound ESR Indexes, Text Search Indexes, Aggregation Pipelines

### Authentication & Authorization
* **Token Strategy**: JSON Web Tokens (`jsonwebtoken`)
* **Password Hashing**: `bcryptjs`

### Security
* **HTTP Headers**: `helmet`
* **Rate Limiting**: `express-rate-limit`
* **Query Sanitization**: `express-mongo-sanitize`
* **CORS**: `cors`

### Payments
* **Payment Gateway**: Razorpay (`razorpay` Node SDK)
* **Verification**: Node.js `crypto` (HMAC-SHA256)

### Frontend (In Progress)
* **Framework**: Next.js / React
* **Styling**: Modern CSS / UI Components

---

## Project Structure

```
online_store/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection & fail-fast environment validation
│   │   ├── controllers/        # Request handlers & core business logic
│   │   ├── middleware/         # Auth, RBAC, rate limiters, global error handler
│   │   ├── models/             # Mongoose schemas & indexing rules (User, Product, Cart, etc.)
│   │   ├── routes/             # Express API endpoint definitions
│   │   ├── services/           # Reusable domain services (Order finalization, Razorpay)
│   │   ├── utils/              # Custom ApiError class, validators, variant helpers
│   │   └── server.js           # Express app initialization, middleware pipeline & shutdown hooks
│   ├── .env.example            # Template for environment configuration
│   └── package.json            # Node.js dependencies and run scripts
├── frontend/                   # Client application (Next.js - Under Active Development)
├── docs/                       # Project audit and design documentation
└── README.md                   # Repository documentation
```

### Folder Responsibilities

* **`backend/src/config/`**: Centralizes database connections and environment variable parsing with validation checks.
* **`backend/src/controllers/`**: Handles HTTP requests, invokes services/models, and returns standardized JSON responses.
* **`backend/src/middleware/`**: Intercepts requests for authentication checks, admin role enforcement, rate limiting, and centralized error catchers.
* **`backend/src/models/`**: Defines data structures, schema-level validation, default values, pre-hooks, and MongoDB indexes.
* **`backend/src/routes/`**: Maps HTTP methods and endpoint paths to corresponding controller functions and middleware chains.
* **`backend/src/services/`**: Encapsulates multi-step operations like atomic order execution and payment gateway instances.
* **`backend/src/utils/`**: Shared helpers such as standardized error classes, validation assertions, and variant comparison functions.

---

## Backend Architecture

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Middleware Stack                        │
│ (Pino Logger ➔ Cors ➔ Helmet ➔ Compression ➔ Rate Limiters) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Route Matcher                          │
│        (e.g., /api/user, /api/products, /api/orders)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Authentication & RBAC                      │
│            (protect, adminOnly middleware)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                        │
│            (Request Parsing & Response Handling)            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│        Service Layer         ││        Model Layer          │
│(Atomic Order Finalization /  ││  (Mongoose Schemas & DB     │
│  Razorpay HMAC Verification) ││      Indexing Queries)      │
└──────────────┬───────────────┘└──────────────┬──────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        MongoDB                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Implementation

* **Helmet Security Headers**: Configures security-focused HTTP response headers including Content Security Policy (`script-src`, `frame-src`, `img-src` directives allowed for Razorpay and Cloudinary), framing restrictions, and referrer policies.
* **Strict CORS Whitelist**: Restricts request origins to authorized frontend domains (`FRONTEND_URL`, development localhost ports) while permitting headless server calls without origin headers.
* **Authentication & Authorization**: Enforces bearer token verification via `JWT_SECRET`. Restricts administrative routes using the `adminOnly` role check.
* **Password Security**: Hashes user passwords using `bcryptjs` prior to database insertion.
* **Tiered Rate Limiting**: Mitigates brute-force attacks and resource exhaustion with tailored request limits across endpoint classes (Auth, Payments, Orders, Reviews, Admin, Search, Cart, Global).
* **NoSQL Query Sanitization**: Strips `$` and `.` characters from incoming request bodies, queries, and parameters to prevent query injection vulnerabilities.
* **Centralized Error Handling**: Standardizes operational error responses via `ApiError` and suppresses stack traces in production environments (`NODE_ENV=production`).

---

## API Highlights

Below is a high-level summary of the major API endpoint modules provided by the backend:

| Module | Base Path | Core Operations |
| :--- | :--- | :--- |
| **Health** | `GET /health` | System status, database connection state, and uptime metrics. |
| **Authentication** | `/api/user` | User registration (`/register`), login (`/login`), and profile fetch (`/profile`). |
| **Address** | `/api/user/address` | Add, retrieve, update, delete shipping addresses, and set default address. |
| **Products** | `/api/products` | Browse catalog (`GET /`), product details (`GET /:id`), admin CRUD (`POST`, `PUT`, `DELETE`), and variant stock updates (`PATCH /:productId/variants/:variantId`). |
| **Cart** | `/api/cart` | View user cart (`GET /`), add items (`POST /`), update quantity (`PUT /:productId`), and remove items (`DELETE /:productId`). |
| **Orders** | `/api/orders` | Generate checkout summary (`POST /checkout-summary`), place order (`POST /`), list order history (`GET /myOrders`), order details (`GET /:id`), and cancel order (`DELETE /:id/cancel`). |
| **Reviews** | `/api/review` | Retrieve product reviews (`GET /:productId`), add verified review (`POST /`), edit review (`PUT /:reviewId`), and delete review (`DELETE /:reviewId`). |
| **Wishlist** | `/api/wishlist` | Fetch wishlist (`GET /`), add product (`POST /`), and remove product (`DELETE /`). |
| **Payments** | `/api/payment` | Create Razorpay order (`POST /create-order`) and verify payment signature (`POST /verify`). |

---

## Installation & Setup

Follow these steps to set up the project locally.

### Prerequisites

* Node.js (v18.x or later recommended)
* npm (v9.x or later)
* MongoDB database instance (Local instance or MongoDB Atlas cluster)

### 1. Clone the Repository

```bash
git clone https://github.com/<username>/online_store.git
cd online_store
```

### 2. Setup & Install Backend

```bash
cd backend
npm install
```

### 3. Setup & Install Frontend

```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`:

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env` and fill in your actual configuration values (refer to the Environment Variables section below).

### 5. Run the Application

#### Start Backend in Development Mode

```bash
# Inside backend/ directory
npm run dev
```

The backend server will start on the configured port (default `5000` or `3000`).

#### Start Frontend Development Server

```bash
# Inside frontend/ directory
npm run dev
```

---

## Environment Variables

Configure the following variables in `backend/.env`. Do NOT commit secrets or real credentials to source control.

```env
# Server Configuration
PORT=
NODE_ENV=
FRONTEND_URL=

# Database
MONGODB_URI=

# Authentication
JWT_SECRET=

# Razorpay Credentials
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Cloudinary Storage Credentials (Optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Development Workflow

* **Branching Strategy**: Standard feature-branch workflow. Main development takes place on feature branches before merging into `main`.
* **Parallel Workstreams**: Backend API services are fully operational and hosted independently. Frontend client interface development is progressing in a dedicated workspace directory (`frontend/`).

---

## Roadmap

- [ ] Complete Next.js frontend pages (Home, Catalog, Details, Cart, Checkout, Profile).
- [ ] Implement responsive UI components for mobile and desktop viewports.
- [ ] Integrate interactive Admin Dashboard interface.
- [ ] Implement End-to-End (E2E) testing suite for core user journeys.
- [ ] Set up automated CI/CD pipeline using GitHub Actions.
- [ ] Deploy production build to cloud hosting environment.

---

## Screenshots

> *Screenshots will be added as frontend interface components are finalized.*

| Home Page | Product Catalog |
| :---: | :---: |
| *[ Placeholder: Home Page ]* | *[ Placeholder: Product Listing ]* |

| Product Details | Cart & Checkout |
| :---: | :---: |
| *[ Placeholder: Product Details ]* | *[ Placeholder: Cart & Checkout ]* |

| User Orders | Admin Dashboard |
| :---: | :---: |
| *[ Placeholder: User Orders ]* | *[ Placeholder: Admin Dashboard ]* |

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature-name`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature-name`).
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

**Developer & Maintainer**  
* GitHub: [@your-github-handle](https://github.com/)  
* Email: `your-email@example.com`
