# Online Store

## Project Overview

This repository contains a simple online store application. The backend API has been implemented, tested locally, and is considered complete for the initial MVP. We are now moving development focus to the frontend.

## Current Status

- **Backend:** Completed ✅
- **Frontend:** In progress — initial scaffolding and UI implementation planned

## Completed Backend (summary)

- REST API built with Express and Mongoose
- Features: user authentication, product listing, cart management, order creation
- Database: MongoDB (connection in `backend/src/config/db.js`)

### Run the backend locally

Open a terminal and run:

```bash
cd backend
npm install
# start with node or nodemon if installed globally
node src/server.js
# or with nodemon
nodemon src/server.js
```

Note: there is no `start` script in `backend/package.json`; use the commands above or add a script if desired.

## API Highlights

- `POST /api/auth/login` — user login and JWT
- `POST /api/auth/register` — create user
- `GET /api/products` — list products
- `GET /api/products/:id` — product details
- `POST /api/cart` — add item to cart
- `GET /api/orders` — list user orders

## Moving to the Frontend

Next steps focus on building a React (or preferred) frontend that consumes the backend APIs. Goals:

- Scaffold the frontend project and tooling
- Implement core pages: Home, Products, Product Detail, Cart, Checkout
- Connect UI to backend APIs and handle auth flows

## Frontend To-Do (short)

1. Scaffold frontend project and install dependencies
2. Implement main pages and routing
3. Integrate with backend API endpoints
4. Add responsive design and basic tests

## Contributing

If you'd like to help, start by working on the frontend tasks above and open a pull request when ready.

---

Updated: backend completed; frontend development started.
