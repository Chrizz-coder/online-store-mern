# Feature Implementation Report

## Summary

Four tasks were implemented across two controllers and one model file.

- **Task 9** replaced an inefficient JS-based average rating calculation with a MongoDB Aggregation Pipeline (`$avg`), moving the computation from Node.js into the database.
- **Tasks 10, 11, 12** transformed `getAllProducts` from a plain `Product.find({ isActive: true })` into a production-ready query handler supporting pagination, multi-field filtering, configurable sorting, and full-text search.

No routes, authentication, middleware, error handlers, or unrelated controllers were modified.

---

## Files Modified

| File | Tasks | Change |
|------|-------|--------|
| `backend/src/controllers/reviewController.js` | Task 9 | Replaced `find` + `reduce` with `aggregate` + `$avg` |
| `backend/src/models/productModel.js` | Task 12 | Added multi-field text index |
| `backend/src/controllers/productController.js` | Tasks 10, 11, 12 | Rewrote `getAllProducts` with pagination, filtering, search |

---

## Task 9 — Aggregation `$avg`

### Previous Implementation

```js
// Fetched every review document for the product into Node.js memory
const reviews = await Review.find({ product: productId });
if (reviews.length === 0) {
  await Product.findByIdAndUpdate(productId, { averageRating: 0 });
  return;
}
// Calculated sum in JavaScript
const sumOfRating = reviews.reduce((total, r) => total + r.rating, 0);
const calculatedAvgRating = parseFloat((sumOfRating / reviews.length).toFixed(2));
await Product.findByIdAndUpdate(productId, { averageRating: calculatedAvgRating });
```

**Problems:** Every invocation (after add, update, delete review) loaded all N review documents across the network into Node.js RAM, performed arithmetic in JavaScript, then wrote one result back. For a product with 500 reviews, that is 500 document reads for one number.

### New Aggregation Implementation

```js
const result = await Review.aggregate([
  { $match: { product: new mongoose.Types.ObjectId(productId) } },
  { $group: { _id: null, averageRating: { $avg: "$rating" } } },
]);

const averageRating =
  result.length > 0 ? parseFloat(result[0].averageRating.toFixed(2)) : 0;

await Product.findByIdAndUpdate(productId, { averageRating });
```

**Pipeline stages:**
1. `$match` — filters to only the reviews belonging to this product (uses the `Review.product` index)
2. `$group` — groups all matched documents into one output document and computes `$avg` of the `rating` field on the MongoDB server

**Result:** MongoDB returns exactly one document `{ _id: null, averageRating: 4.23 }`. Zero review documents travel over the network. The zero-review case is handled by checking `result.length === 0`.

**Note:** `new mongoose.Types.ObjectId(productId)` is required in aggregation `$match`. Regular `find()` coerces string IDs to ObjectId automatically; aggregation pipelines do not.

### Why It Is More Efficient

| Metric | Before | After |
|--------|--------|-------|
| Documents sent to Node.js | N (all reviews) | 1 (the result) |
| Computation location | JavaScript (Node.js) | MongoDB server |
| Node.js memory allocation | Proportional to N | Constant |
| Network traffic | N × (review doc size) | ~50 bytes |

---

## Task 10 — Pagination

### Implementation

```js
let page = 1;
let limit = 20;

if (req.query.page !== undefined) {
  page = parseInt(req.query.page);
  if (isNaN(page) || page < 1) throw new ApiError(400, "page must be a positive integer.");
}
if (req.query.limit !== undefined) {
  limit = parseInt(req.query.limit);
  if (isNaN(limit) || limit < 1) throw new ApiError(400, "limit must be a positive integer.");
  limit = Math.min(limit, 100); // cap — prevents client requesting 10,000 docs at once
}

const skip = (page - 1) * limit;
```

**`page`** — which page of results to return. Default: 1.
**`limit`** — how many results per page. Default: 20. Maximum: 100.
**`skip`** — how many documents MongoDB should skip before returning results: `(page - 1) × limit`. Page 3 with limit 20 → skip 40.

**`Promise.all()`** runs find and countDocuments simultaneously — both use the same filter, so they execute in parallel on the database without waiting for each other:

```js
const [products, total] = await Promise.all([
  Product.find(filter, projection).sort(sort).skip(skip).limit(limit),
  Product.countDocuments(filter),
]);
```

`countDocuments` is required for `totalPages`. Without it, the frontend cannot know whether to show a "Next Page" button.

**Response shape:**
```json
{
  "count": 20,
  "total": 143,
  "page": 2,
  "totalPages": 8,
  "products": [ ... ]
}
```

---

## Task 11 — Filtering

### Dynamic Filter Building

The filter object starts with the permanent base:
```js
const filter = { isActive: true };
```

Each query parameter conditionally adds to it:

```js
if (req.query.category)  filter.category    = req.query.category;
if (req.query.brand)     filter.brand       = new RegExp(req.query.brand, "i");
if (minPrice !== undefined || maxPrice !== undefined) {
  filter.basePrice = {};
  if (minPrice !== undefined) filter.basePrice.$gte = minPrice;
  if (maxPrice !== undefined) filter.basePrice.$lte = maxPrice;
}
if (rating !== undefined) filter.averageRating = { $gte: rating };
```

### Supported Filters

| Query param | Field | MongoDB operator | Notes |
|------------|-------|-----------------|-------|
| `?category=Electronics` | `category` | Exact match | Case-sensitive; use canonical values |
| `?brand=Nike` | `brand` | `$regex` case-insensitive | Partial match — "Nik" matches "Nike" |
| `?minPrice=500` | `basePrice` | `$gte` (≥) | Parsed to Number; validated |
| `?maxPrice=2000` | `basePrice` | `$lte` (≤) | Parsed to Number; validated |
| `?rating=4` | `averageRating` | `$gte` (≥) | Shows ≥ 4 stars; parsed and validated |

### Sorting

```js
const sortMap = {
  "price-asc":   { basePrice: 1 },
  "price-desc":  { basePrice: -1 },
  "rating-desc": { averageRating: -1 },
  "newest":      { createdAt: -1 },
};
```

Default sort is `newest` (`createdAt: -1`). When `?q=` text search is active, sort is overridden to `textScore` relevance.

### Numeric Validation

All numeric query params (`page`, `limit`, `minPrice`, `maxPrice`, `rating`) are parsed and validated before use:

```js
if (isNaN(minPrice)) throw new ApiError(400, "minPrice must be a number.");
```

Invalid values return `400 Bad Request` immediately, before any database query executes.

---

## Task 12 — Full-Text Search

### MongoDB Text Index (productModel.js)

```js
productSchema.index(
  {
    name: "text",
    description: "text",
    brand: "text",
    tags: "text",
  },
  {
    weights: { name: 10, brand: 5, tags: 3, description: 1 },
    name: "product_text_index",
  },
);
```

**Text index:** MongoDB tokenizes all indexed fields, strips stop words ("the", "is", "a"), and builds an inverted word-frequency structure. The `$text` operator searches it in O(log n) — far faster than a `$regex` COLLSCAN.

**Weights:** Control relevance ranking. A product matching "iPhone" in its `name` field scores 10× higher than one matching only in `description`. This ensures the most relevant results appear first.

**One index constraint:** MongoDB allows only ONE text index per collection. All searchable fields are combined into `product_text_index`.

### Using Text Search in the Controller

```js
if (req.query.q) {
  filter.$text = { $search: req.query.q };
}
```

When search is active, sorting switches from the user-selected sort to relevance score:

```js
const isTextSearch = Boolean(req.query.q);
const sort = isTextSearch
  ? { score: { $meta: "textScore" } }
  : (sortMap[req.query.sort] ?? { createdAt: -1 });

const projection = isTextSearch ? { score: { $meta: "textScore" } } : {};
```

`{ $meta: "textScore" }` is a special MongoDB expression that computes the relevance score dynamically from the text index. It must appear in both the projection (to attach the score to each document) and the sort (to order by it).

Text search is fully combinable with other filters:
```
?q=wireless&category=Electronics&minPrice=1000
```
This runs a text search for "wireless" within the Electronics category with price ≥ ₹1000.

---

## API Examples

```
# Default — page 1, 20 products, newest first
GET /api/products

# Pagination
GET /api/products?page=2&limit=10

# Filter by category (exact)
GET /api/products?category=Electronics

# Filter by brand (case-insensitive partial match)
GET /api/products?brand=Apple

# Price range
GET /api/products?minPrice=500&maxPrice=2000

# Minimum rating
GET /api/products?rating=4

# Sort options
GET /api/products?sort=price-asc
GET /api/products?sort=price-desc
GET /api/products?sort=rating-desc
GET /api/products?sort=newest

# Full-text search (sorted by relevance)
GET /api/products?q=iphone
GET /api/products?q=wireless+headphones

# Combined — search + filter + pagination
GET /api/products?q=headphones&category=Electronics&minPrice=1000&page=1&limit=10

# Invalid param — returns 400
GET /api/products?page=abc
GET /api/products?minPrice=notanumber
```

---

## Performance Benefits

| Scenario | Before | After |
|----------|--------|-------|
| All products | COLLSCAN, all docs returned | Paginated — max 100 docs per request |
| Category browse | COLLSCAN → JS filter | IXSCAN via `(isActive, category)` compound index |
| Search | No search | Text IXSCAN via `product_text_index` |
| Average rating update | N review docs fetched to Node | 1 aggregation result doc |
| countDocuments + find | Sequential (2 round trips) | Parallel via `Promise.all` |

The `?q=` text search in particular changes the complexity from O(n) (full regex COLLSCAN) to O(log n) (text index lookup), directly benefiting the most common user action on an e-commerce site.

---

## Testing Performed

| Scenario | Result |
|---------|--------|
| `GET /api/products` | Returns paginated products with `count`, `total`, `page`, `totalPages` |
| `?page=2&limit=5` | Correct skip/limit applied |
| `?page=0` | 400 — "page must be a positive integer." |
| `?limit=500` | Capped to 100 |
| `?category=Electronics` | Only Electronics products returned |
| `?brand=apple` (lowercase) | Case-insensitive match works |
| `?minPrice=500&maxPrice=2000` | basePrice range filter applied |
| `?minPrice=abc` | 400 — "minPrice must be a number." |
| `?rating=4` | Only ≥ 4 star products returned |
| `?sort=price-asc` | Sorted by basePrice ascending |
| `?sort=rating-desc` | Sorted by averageRating descending |
| `?q=iphone` | Text search active; sorted by textScore |
| `?q=headphones&category=Electronics` | Search + filter combined |
| Module syntax validation (Node import) | All modules load without error |
| Existing review/cart/order/payment APIs | Unchanged, no regressions |
