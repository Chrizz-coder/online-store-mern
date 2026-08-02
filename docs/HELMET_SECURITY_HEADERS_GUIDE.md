# TASK 4: Production Security Architecture — Helmet & HTTP Security Headers Guide

## Executive Summary
This guide provides an in-depth breakdown of **Helmet.js**, HTTP security response headers, web vulnerability mitigation strategies, and project integration steps for your MERN e-commerce backend.

---

## 1. What is Helmet.js & Why is Default Express Vulnerable?

By default, Express applications output minimal security headers and explicitly advertise their underlying server technology in the HTTP response:

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
```

### The Risk of `X-Powered-By`
Disclosing `X-Powered-By: Express` allows malicious actors running automated vulnerability scanners (such as Shodan, Nmap, or ZAP) to identify that your backend runs on Node.js + Express. If a specific Express version has a known CVE (Common Vulnerability and Exposure), attackers can target your server directly.

### What is Helmet.js?
**Helmet** is a top-tier security middleware for Node.js Express applications. It acts as a collection of 15 smaller security-focused middleware functions that set HTTP response headers to defend against common web attacks such as **Clickjacking**, **Cross-Site Scripting (XSS)**, **MIME-sniffing**, and **Man-in-the-Middle (MitM) downgrade attacks**.

---

## 2. Deep Dive: Key Security Headers & Header Analysis

| HTTP Header | Set By Helmet Sub-Middleware | Primary Defense Target |
| :--- | :--- | :--- |
| `Content-Security-Policy` | `helmet.contentSecurityPolicy()` | Cross-Site Scripting (XSS) & Data Injection |
| `X-Frame-Options` | `helmet.xframe()` | Clickjacking Attacks |
| `Strict-Transport-Security` | `helmet.hsts()` | SSL Stripping & Man-in-the-Middle (MitM) |
| `X-Content-Type-Options` | `helmet.noSniff()` | MIME-Type Sniffing Attacks |
| `Referrer-Policy` | `helmet.referrerPolicy()` | Information Leakage in Referrer Header |
| `X-Powered-By` (Removed) | `helmet.hidePoweredBy()` | Server Fingerprinting & Reconnaissance |
| `Cross-Origin-Resource-Policy`| `helmet.crossOriginResourcePolicy()`| Cross-Origin Data Leaks |

---

### 2.1 Content-Security-Policy (CSP)
- **Header Value Example**: `default-src 'self'; script-src 'self' https://checkout.razorpay.com; img-src 'self' data: https://res.cloudinary.com;`
- **What it does**: CSP defines an approved list of trusted content sources (scripts, stylesheets, images, fonts, frames, web sockets) that the browser is allowed to execute or load.
- **Why it matters for E-Commerce**: If an attacker manages to inject a malicious `<script src="https://hacker.com/stealer.js">` into a product review or input field, CSP forces the user's browser to block execution because `hacker.com` is not in the whitelist.

---

### 2.2 X-Frame-Options (Clickjacking Protection)
- **Header Value**: `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN`
- **What it does**: Dictates whether a browser is permitted to render your web page inside an `<iframe>`, `<frame>`, `<embed>`, or `<object>`.
- **Attack Scenario (Clickjacking)**: An attacker creates a transparent `<iframe>` of your store's Checkout page over a fake "Win a Free iPhone" button on a malicious site. When the user clicks "Claim iPhone", they are unwittingly clicking your transparent "Pay Now" button.
- **Helmet Defense**: Setting `SAMEORIGIN` guarantees that only pages on your domain can frame your site. Setting `DENY` prevents framing completely.

---

### 2.3 Strict-Transport-Security (HSTS)
- **Header Value**: `Strict-Transport-Security: max-age=15552000; includeSubDomains; preload`
- **What it does**: Instructs web browsers to communicate with your domain **exclusively over encrypted HTTPS connections** for a specified duration (`max-age` in seconds).
- **Attack Scenario (SSL Stripping)**: A user connects to public Wi-Fi and types `http://yourstore.com`. An attacker intercepts the HTTP request and prevents the redirect to `https://`, serving an unencrypted fake page to steal credentials.
- **Helmet Defense**: With HSTS enabled, the user's browser automatically upgrades all `http://` requests to `https://` client-side before sending any data across the network.

---

### 2.4 X-Content-Type-Options (MIME Sniffing Defense)
- **Header Value**: `X-Content-Type-Options: nosniff`
- **What it does**: Forces browsers to strictly adhere to the `Content-Type` header sent by the server rather than trying to inspect ("sniff") the payload content.
- **Attack Scenario**: An attacker uploads a file named `avatar.png` containing JavaScript code. Without `nosniff`, internet browsers might inspect the file, detect executable JavaScript, and run it in the context of your application.
- **Helmet Defense**: Setting `nosniff` ensures the browser strictly treats `image/png` as a non-executable image asset.

---

### 2.5 Referrer-Policy
- **Header Value**: `Referrer-Policy: no-referrer` or `strict-origin-when-cross-origin`
- **What it does**: Controls what URI details are sent in the `Referer` request header when navigating away from your store to an external URL (e.g., clicking a social media link or payment gateway redirect).
- **Why it matters**: Prevents sensitive query parameters (e.g., session tokens or password reset keys in URLs) from leaking to third-party analytics or external servers.

---

## 3. How to Implement Helmet in Your Project

> **NOTE**: Per your request, **do not execute installation or code edits yet**. This section documents the exact steps you will follow when implementing this task.

### Step 1: Install Package
```bash
npm install helmet
```

### Step 2: Configure in `backend/src/server.js`

Helmet should be registered **at the top of your middleware stack** in `server.js` (right before CORS and body parsers):

```javascript
import express from "express";
import helmet from "helmet"; // 1. Import Helmet
import cors from "cors";
// ... other imports

const app = express();

// 2. Register Helmet early in the middleware pipeline
app.use(helmet());

// Customizing Helmet for E-Commerce APIs (Razorpay / External CDNs)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        frameSrc: ["'self'", "https://api.razorpay.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors());
app.use(express.json());

// Routes and error handlers...
```

---

## 4. Real-World E-Commerce Vulnerability Matrix

| Attack Type | Attacker Strategy | Without Helmet | With Helmet Implemented |
| :--- | :--- | :--- | :--- |
| **Clickjacking** | Embeds checkout in invisible `<iframe>` | User's payment triggered without knowledge | Browser blocks framing (`X-Frame-Options: SAMEORIGIN`) |
| **XSS Token Theft** | Injects script reading `localStorage.getItem("token")` | Script sends JWT token to attacker server | CSP blocks unauthorized outbound script execution |
| **SSL Stripping** | Intercepts HTTP requests on public Wi-Fi | Credentials sent in plain text over HTTP | HSTS forces HTTPS client-side (`max-age=15552000`) |
| **MIME Execution** | Disguises `.js` script as `.jpg` image upload | Browser sniffs and executes script | Browser respects declared content type (`nosniff`) |
| **Server Recon** | Scans server response for known Node.js exploits | `X-Powered-By: Express` leaks server framework | `X-Powered-By` header completely stripped |

---

## 5. Verification & Testing Checklist

Once Helmet is installed and enabled, you can verify your security headers using the following methods:

### Method 1: Using `curl` Terminal Command
```bash
curl -I http://localhost:3000
```
**Expected Output**:
```http
HTTP/1.1 200 OK
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Download-Options: noopen
X-Content-Type-Options: nosniff
Origin-Agent-Cluster: ?1
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: no-referrer
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'; ...
```
*(Notice `X-Powered-By` is completely missing!)*

### Method 2: Browser Developer Tools
1. Open Chrome / Firefox DevTools (`F12`).
2. Go to the **Network** tab.
3. Click any API request (e.g., `/api/products`).
4. Inspect the **Response Headers** panel to verify all Helmet headers are active.
