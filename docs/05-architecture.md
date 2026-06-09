# Architecture

## Homepage Product Loading

User Opens Homepage

↓

React Frontend Loads

↓

React Requests Product Data

↓

Express Backend Receives Request

↓

Express Queries MongoDB

↓

MongoDB Returns Product Data

↓

Express Sends Response

↓

React Renders Product Cards

---

## User Login

User Enters Email And Password

↓

React Sends Credentials

↓

Express Validates Credentials

↓

MongoDB Finds User

↓

Password Verification

↓

JWT Generated

↓

JWT Returned To React

↓

JWT Stored In Local Storage

---

## Add To Cart

User Clicks Add To Cart

↓

React Sends Product ID

↓

Express Verifies User

↓

Express Updates Cart

↓

MongoDB Stores Cart Changes

↓

Success Response Returned

↓

React Updates Cart UI

---

## Product Detail Page

User Opens Product Page

↓

React Reads Product ID From URL

↓

React Requests Product Details

↓

Express Queries MongoDB

↓

MongoDB Returns Product

↓

Express Sends Response

↓

React Displays Product Information

---

## System Overview

Customer
↓
React Frontend
↓
HTTP Requests
↓
Express Backend
↓
Business Logic
↓
MongoDB Database

Admin
↓
Admin Dashboard
↓
Express Backend
↓
MongoDB Database
