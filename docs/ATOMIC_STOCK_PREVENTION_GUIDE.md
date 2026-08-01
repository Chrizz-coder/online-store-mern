# Educational Guide: Preventing Overselling via Atomic Stock Decrement in MongoDB

## 1. The Core Problem: Race Conditions & Non-Atomic Operations

### What is a Race Condition?
A **race condition** occurs when multiple concurrent requests read shared database state, perform application-side checks, and then write back updates based on stale reads.

### The "Check-Then-Update" Flaw
In your current e-commerce order flow:

```
[User A & User B submit orders simultaneously for Item X (Stock = 1)]

   User A (Request 1)                   User B (Request 2)
         │                                    │
 1. Read Product (stock = 1)          1. Read Product (stock = 1)
 2. Check Stock (1 >= 1) ✅            2. Check Stock (1 >= 1) ✅
 3. Deduct Stock (-1)                 3. Deduct Stock (-1)
         │                                    │
         ▼                                    ▼
   Stock becomes 0                      Stock becomes -1  ⚠️ OVERSOLD!
```

#### Why Application Validation (`validateAndCalculateCart`) Fails Under Load
In `orderController.js`, `validateAndCalculateCart` reads product stock from memory:
```javascript
if (matchedVariant.stock < item.quantity) {
  throw new Error(`Insufficient stock...`);
}
```
Between the moment this check runs and the moment `Product.updateOne()` executes, another concurrent request can easily deduct the stock. This gap is known as **Time-of-Check to Time-of-Use (TOC-TOU)**.

#### Why the Current `Product.updateOne` Call Fails
In `orderService.js` (and `orderController.js`):
```javascript
await Product.updateOne(
  { _id: item.product, "variants.color": color, "variants.size": size },
  { $inc: { "variants.$.stock": -item.quantity } },
  { session }
);
```
Notice the query condition: `{ _id: item.product, "variants.color": color, "variants.size": size }`.
This tells MongoDB: *"Find any product with this ID and variant, and subtract quantity from stock."*
MongoDB **does not check if stock is greater than or equal to quantity**. If stock is `1` and quantity is `2`, MongoDB will happily execute `$inc: -2`, setting stock to `-1`.

---

## 2. The Solution: Single Atomic MongoDB Operations

### What is an Atomic Operation?
An **atomic operation** is an all-or-nothing operation executed entirely by the database engine in isolation. No other database operation can inspect or alter the data while an atomic update is taking place.

### The Atomic Stock Decrement Concept

Instead of:
> **App:** Read stock ➔ **App:** Check stock ➔ **App:** Ask DB to decrease stock

We change the flow to:
> **App:** Ask DB to decrease stock **ONLY IF** `stock >= requested_quantity` in one single operation.

```
                  ┌──────────────────────────────────────────────┐
                  │ MongoDB Database Engine                      │
                  │                                              │
                  │  1. Check: Is stock >= quantity?             │
                  │  2. If YES: Decrease stock & return success. │
                  │  3. If NO:  Do NOT update & return 0 matches.│
                  └──────────────────────────────────────────────┘
```

---

## 3. How to Implement Atomic Decrements in Mongoose

### A. Variant Stock Decrement (Using `$elemMatch`)

When products have variants stored in an array (e.g., `variants: [{ color: "Red", size: "M", stock: 5 }]`), we use `$elemMatch` in our query filter to guarantee that the `color`, `size`, AND `stock >= quantity` belong to the **same single element** in the array:

```javascript
const updateResult = await Product.updateOne(
  {
    _id: item.product,
    variants: {
      $elemMatch: {
        color: color,
        size: size,
        stock: { $gte: item.quantity } // 🔒 ATOMIC CONDITION
      }
    }
  },
  {
    $inc: { "variants.$.stock": -item.quantity }
  },
  { session }
);

// Check if MongoDB actually found and updated a matching document
if (updateResult.matchedCount === 0) {
  throw new Error(`Insufficient stock or variant unavailable for product ${item.name}`);
}
```

#### Why `$elemMatch` is Critical
Without `$elemMatch`, a query like `{ "variants.color": "Red", "variants.stock": { $gte: 2 } }` could match a product where element 0 is Red (stock 0) and element 1 is Blue (stock 10). `$elemMatch` enforces that all conditions match on the **exact same variant item**.

---

### B. Global Stock Decrement (Without Variants)

For simple products that use a top-level `globalStock` field:

```javascript
const updateResult = await Product.updateOne(
  {
    _id: item.product,
    globalStock: { $gte: item.quantity } // 🔒 ATOMIC CONDITION
  },
  {
    $inc: { globalStock: -item.quantity }
  },
  { session }
);

if (updateResult.matchedCount === 0) {
  throw new Error(`Insufficient stock for product ${item.name}`);
}
```

---

## 4. How Transactions Guarantee Full Rollbacks

When multiple items are in a cart, what happens if Item 1 succeeds, but Item 2 fails due to insufficient stock?

Because we run the order flow inside a Mongoose transaction session (`session`):

```javascript
try {
  session.startTransaction();

  // Item 1: Stock decremented successfully ✅
  // Item 2: matchedCount === 0 ➔ Throws Error ❌

  await session.commitTransaction();
} catch (error) {
  // 🔄 Automatic Rollback: Item 1's stock is restored automatically by MongoDB!
  await session.abortTransaction();
  session.endSession();
  throw error;
}
```

---

## 5. Summary of Key Architectural Changes

1. **Query Filter Update**: Add `stock: { $gte: quantity }` inside the MongoDB update filter.
2. **Check Result (`matchedCount`)**: Always inspect `matchedCount` returned by `updateOne()`. If `matchedCount === 0`, throw an error.
3. **Transaction Safety**: Allow the transaction catch block to handle aborting and rolling back partial updates.
4. **Eliminate Duplication**: Remove duplicated stock decrement loops between `orderController.js` and `orderService.js`, keeping business logic consolidated inside `orderService.js`.
