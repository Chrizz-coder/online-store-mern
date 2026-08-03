import rateLimit from "express-rate-limit";

// Single point for swapping the storage backend.
// Replace `undefined` with a RedisStore instance (rate-limit-redis + Upstash)
// to enable distributed rate limiting — no other file needs to change.
const store = undefined; // MemoryStore — fine for single-process deployments

const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
  });
};

// Shared options inherited by every limiter.
// standardHeaders: RFC 6585 RateLimit-* headers; legacyHeaders: disabled.
const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  ...(store ? { store } : {}),
};

// Global baseline — catches floods and indiscriminate API abuse.
export const globalLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  message: "Too many requests from this IP. Please try again after 15 minutes.",
});

// Strict auth limit to resist brute-force and credential-stuffing attacks.
// 5 attempts / 15 min mirrors industry-standard lockout policies.
export const authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many login attempts. Your access has been temporarily locked. Please try again after 15 minutes.",
    });
  },
});

// Payment endpoints carry direct financial risk — dedicated limit prevents
// payment spam and Razorpay order enumeration attacks.
export const paymentLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
});

// Prevents order-flooding attacks that could exhaust inventory.
export const orderLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
});

// Limits coordinated fake-review and rating-manipulation campaigns.
export const reviewLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
});

// Generous limit for public product browsing; still blocks aggressive scrapers.
export const searchLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
});

// Cart writes fire rapidly (debounced quantity updates, bulk edits).
// Higher limit avoids false positives while still catching cart-stuffing bots.
export const cartLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1 minute
  limit: 120,
});

// Admin mutations are inherently low-frequency; guards against a compromised
// admin token being used to bulk-modify the product catalogue.
export const adminLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
});
