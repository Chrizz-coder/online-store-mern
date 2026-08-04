# 01 — NoSQL Injection Implementation

## Validation Strategy

Two layers of protection were implemented, both required for complete defense:

**Layer 1 — `express-mongo-sanitize` (Global Middleware)**
Strips any key starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params` before any route handler runs. This prevents `{ "$ne": null }` operator objects from reaching Mongoose at all.

**Layer 2 — Primitive Type Validators (Per-Controller)**
`express-mongo-sanitize` strips operator *keys* but leaves the surrounding object structure. A field like `{ "email": {} }` would still pass a truthy check. Type guards reject any value that is present but not the expected primitive type (string, number, integer) before any MongoDB query executes.

**Design decision — null-safe validators:** All helpers allow `undefined` and `null` through. This means existing `if (!field)` presence checks keep their original error messages unchanged. The type guards only fire when a value IS provided but is the wrong type — the exact case of an injection payload.

---

## Files Created

### `backend/src/utils/validators.js`

Reusable primitive type validation helpers used by all controllers.

| Helper | Rejects | Allows |
|--------|---------|--------|
| `requireString(value, field)` | objects, arrays, numbers, booleans | strings, undefined, null |
| `requireNumber(value, field)` | objects, arrays, strings, booleans | numbers, undefined, null |
| `requireInteger(value, field)` | objects, arrays, strings, floats | integers, undefined, null |
| `requireObjectId(value, field)` | objects, arrays, numbers | strings (format validated by existing code), undefined, null |
| `requireBoolean(value, field)` | objects, arrays, strings, numbers | booleans, undefined, null |

---

## Middleware Added

### `server.js` — `app.use(mongoSanitize())`

Mounted after `express.json()` (body must be parsed first) and before all route registrations.

---

## Files Modified

| File | Priority | What was added |
|------|----------|---------------|
| `server.js` | Layer 1 | `mongoSanitize()` global middleware |
| `authController.js` | Critical | `requireString` on `email`, `password`, `name` in both `registerUser` and `loginUser` |
| `productController.js` | High | `requireString`/`requireNumber` on all catalogue fields in `createProduct`; conditional field checks in `updateProduct` |
| `reviewController.js` | High | `requireObjectId` on `productId`, `requireInteger` on `rating`, `requireString` on `comment` in `addReview`; `requireInteger`/`requireString` in `updateReview` |
| `cartController.js` | Medium | `requireObjectId` on `productId`, `requireInteger` on `quantity`, `requireString` on `color`/`size` in all three mutation functions |
| `orderController.js` | Medium | `requireObjectId` on `addressId` in `placeOrder` |
| `addressController.js` | Medium | `requireAddressTypes()` helper calling `requireString` on all 10 address fields, used in both `addAddress` and `updateAddresses` |
| `paymentControllers.js` | Medium | `requireString` on all three Razorpay fields, `requireObjectId` on `addressId` in `verifyPayment` |
| `wishlistController.js` | Low | `requireObjectId` on `productId` and optional `variantId` in `addToWishlist` and `removeFromWishlist` |

---

## Controllers Protected — Detail

### `authController.js`
- **`registerUser`**: `requireString(name)` → `requireString(email)` → `requireString(password)` → existing presence check
- **`loginUser`**: `requireString(email)` → `requireString(password)` → existing presence check

### `productController.js`
- **`createProduct`**: All required catalogue fields type-checked before existing validation
- **`updateProduct`**: Each field in `req.body` checked only when present (`if updates.field !== undefined`) to allow partial updates

### `reviewController.js`
- **`addReview`**: `productId`, `variantId` (optional) as ObjectId strings; `rating` as integer; `comment` as string — all before existing checks
- **`updateReview`**: `rating` as integer, `comment` as string

### `cartController.js`
- **`addToCart`**: `productId` as ObjectId, `qty` as integer, `color`/`size` as strings — before existing `Number.isInteger(qty)` check
- **`updateCartQuantity`**: `quantity` as integer, `color`/`size` as strings
- **`deleteCartItem`**: `color`/`size` as strings

### `orderController.js`
- **`placeOrder`**: `addressId` as ObjectId string before the existing `ObjectId.isValid()` check
- **`proceedToCheckout`**: No `req.body` fields are used in MongoDB queries — this function only reads `req.user.id` (from JWT) and the stored cart. No changes needed.

### `addressController.js`
- **`addAddress`**: `requireAddressTypes(req.body)` runs before `validateAddressFields(req.body)` — existing presence check unchanged
- **`updateAddresses`**: Same `requireAddressTypes` call before the field assignment block — null-safe so absent fields (partial updates) pass through

### `paymentControllers.js`
- **`verifyPayment`**: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` as strings; `addressId` as ObjectId — all before existing checks. Non-string values passed to `crypto.createHmac` crash Node in some versions; this prevents that.
- **`createPaymentOrder`**: Takes no body fields for querying — only reads the cart from the authenticated user. No changes needed.

### `wishlistController.js`
- **`addToWishlist`**: `requireObjectId(productId)` before the existing `isObjectId(productId)` call. `isObjectId` already includes `typeof === "string"`, so this is defense-in-depth with a clearer error message.
- **`removeFromWishlist`**: Same pattern.

---

## Existing Validation Preserved

All of the following were kept exactly as-is, with new guards added BEFORE them:

- `if (!name || !email || !password)` in `authController`
- `!Number.isInteger(qty) || qty <= 0` in `cartController`
- `!Number.isInteger(quantity) || quantity < 0` in `cartController`
- `!Number.isInteger(rating) || rating < 1 || rating > 5` in `reviewController`
- `!["COD", "Razorpay"].includes(paymentMethod)` in `orderController`
- `!mongoose.Types.ObjectId.isValid(...)` in `orderController`, `addressController`, `reviewController`
- `isObjectId()` in `wishlistController`, `reviewController`
- `validateAddressFields()` in `addressController`

---

## Remaining Limitations

| Area | Limitation | Reason not addressed |
|------|-----------|----------------------|
| `updateProduct` — `tags`, `images`, `variants` arrays | Not validated as arrays of correct type | Complex nested structures; business logic validates them implicitly via Mongoose schema types and existing checks |
| `selectedVariant` object shape in cart/review | Not validated as a plain object (only its string fields are checked) | `typeof obj === "object"` check would be redundant — individual field type checks already cover the injection surface |
| `proceedToCheckout` body | No validation | Function takes no req.body fields into DB queries; `req.user.id` is from JWT (trusted) |
| `createPaymentOrder` body | No validation | Function takes no req.body fields |
| Query parameter injection (`req.query`) | Covered by `mongoSanitize()` globally | No additional per-route validation needed |

---

## Future Improvements

- Replace manual `requireString` calls with a Zod or Joi schema per endpoint — single source of truth for both type and shape validation
- Add `express-validator` for length limits on string fields (e.g., comment max 1000 chars) to prevent storage abuse
- When Redis store is added for rate limiting, also consider schema-level TTL indexes to auto-expire stale injection attempts in logs
