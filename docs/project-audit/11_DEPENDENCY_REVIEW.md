# Dependency & Package Security Review

> **Target File:** `backend/package.json`, `backend/package-lock.json`  
> **Audit Date:** July 31, 2026  
> **Scope:** Dependency Hygiene, Major Version Compatibility, Security Advisories, Missing Tooling, and Upgrade Roadmap

---

## Executive Overview

This report provides an in-depth analysis of the Node.js package dependencies declared in `backend/package.json`. It evaluates version compatibility (Express 5 & Mongoose 9 ecosystem), security implications, missing production libraries, and recommended script additions.

---

## 1. Inventory of Current Dependencies

### Dependencies (`dependencies`)

| Package Name | Installed Version Range | Ecosystem Status | Purpose / Role | Audit Finding |
|---|---|---|---|---|
| `bcryptjs` | `^3.0.3` | Up-to-date | Password hashing | Pure JS implementation of bcrypt. Safe and reliable. |
| `cors` | `^2.8.6` | Up-to-date | CORS middleware | Missing restricted origin configuration in `server.js`. |
| `dotenv` | `^17.4.2` | Active | Environment variable loader | Functional. Note: Express 5 natively supports env loaders in newer Node lines. |
| `express` | `^5.2.1` | Next-Gen (v5.x) | Web Framework | Uses Express 5.x. Modern promise-rejection error handling built-in. |
| `jsonwebtoken` | `^9.0.3` | Up-to-date | JWT signing & verification | Core auth token utility. Works as expected. |
| `mongoose` | `^9.7.0` | Next-Gen (v9.x) | MongoDB ODM | Modern Mongoose 9.x. Async operations return native promises. |
| `razorpay` | `^2.9.8` | Up-to-date | Payment Gateway SDK | Initialized at import time in `services/razorpayServices.js`. |

### Development Dependencies (`devDependencies`)

| Package Name | Installed Version Range | Ecosystem Status | Purpose / Role | Audit Finding |
|---|---|---|---|---|
| `nodemon` | `^3.1.14` | Up-to-date | Dev Server Auto-reload | Configured in `npm run dev` script. |

---

## 2. Confirmed Issues & Missing Tooling

### DEP-01: Missing `start` Script in `package.json`

* **Confidence Level:** High
* **Location:** `backend/package.json`
* **Evidence:**
  ```json
  // lines 7-9
  "scripts": {
    "dev":"nodemon src/server.js "
  }
  ```
* **Why It Is a Problem:** Production hosting platforms (Docker, Render, Heroku, AWS Elastic Beanstalk) automatically execute `npm start` by default to launch Node.js applications. Without a `"start"` script, deployments fail unless custom override commands are defined.
* **Impact:** Deployment failures in standard CI/CD and PaaS environments.
* **Recommendation:** Add the standard start script:
  ```json
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
  ```

---

### DEP-02: Absence of Production Security Libraries (`helmet`, `express-rate-limit`)

* **Confidence Level:** High
* **Location:** `backend/package.json`
* **Evidence:** Neither `helmet` nor `express-rate-limit` is included in `dependencies`.
* **Why It Is a Problem:** The application lacks essential HTTP security header generation and API rate limiting capabilities at the dependency level.
* **Impact:** Increased attack surface for XSS, MIME sniffing, clickjacking, and brute-force authentication attacks.
* **Recommendation:** Install security dependencies:
  ```bash
  npm install helmet express-rate-limit
  ```

---

### DEP-03: Missing Automated Testing Framework (`jest`, `supertest`)

* **Confidence Level:** High
* **Location:** `backend/package.json`
* **Evidence:** No testing packages exist under `devDependencies`, and no `"test"` script is defined.
* **Why It Is a Problem:** GitHub Actions CI workflow (`.github/workflows/backend-ci.yml`) skips running automated unit or API integration tests because no test runner exists.
* **Impact:** High risk of regression errors during feature development and refactoring.
* **Recommendation:** Install testing packages and configure test script:
  ```bash
  npm install --save-dev jest supertest
  ```
  ```json
  "scripts": {
    "test": "jest --runInBand --detectOpenHandles"
  }
  ```

---

## 3. Potential Risks & Upgrade Recommendations

### DEP-04: Lack of Code Quality & Linting Tooling (`eslint`, `prettier`)

* **Confidence Level:** High
* **Location:** `backend/package.json`
* **Evidence:** No linter or formatter packages are declared.
* **Why It Is a Risk:** Code style, unused imports, and potential syntax bugs are not caught automatically during development or CI checks.
* **Impact:** Code quality decay over time as multiple developers contribute to the repository.
* **Recommendation:** Install ESLint and Prettier for automated linting in CI:
  ```bash
  npm install --save-dev eslint prettier
  ```

---

## 4. Recommended Dependency Management Roadmap

| Phase | Package Action | Target Package | Recommended Command | Business Justification |
|---|---|---|---|---|
| **Phase 1 (Immediate)** | Add Script | `package.json` | Edit `scripts.start` | Required for production deployment. |
| **Phase 1 (Immediate)** | Install | `helmet` | `npm install helmet` | Protects HTTP response headers. |
| **Phase 1 (Immediate)** | Install | `express-rate-limit` | `npm install express-rate-limit` | Prevents login brute-force attacks. |
| **Phase 2 (V1.2)** | Install Dev Dep | `jest`, `supertest` | `npm install --save-dev jest supertest` | Enables automated API integration testing. |
| **Phase 2 (V1.2)** | Install Dev Dep | `eslint` | `npm install --save-dev eslint` | Enforces code quality rules in CI. |
| **Phase 3 (V2.0)** | Install Dep | `ioredis` | `npm install ioredis` | Enables Redis caching for catalog scaling. |

