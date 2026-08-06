// Single source of truth for all environment variables.
// Import this module instead of accessing process.env directly.
// Required variables throw at startup if missing — fail-fast pattern.

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const optional = (name, defaultValue = undefined) =>
  process.env[name] ?? defaultValue;

const env = {
  // Server
  NODE_ENV:     optional("NODE_ENV", "development"),
  PORT:         optional("PORT", "5000"),
  FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:5173"),

  // Database — preserves legacy fallback names from db.js
  MONGODB_URI:
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MOGODB_URL,

  // Auth
  JWT_SECRET: required("JWT_SECRET"),

  // Razorpay — optional at startup; runtime guard in paymentControllers
  RAZORPAY_KEY_ID:     optional("RAZORPAY_KEY_ID"),
  RAZORPAY_KEY_SECRET: optional("RAZORPAY_KEY_SECRET"),

  // Cloudinary — optional; not yet used via process.env directly
  CLOUDINARY_CLOUD_NAME: optional("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY:    optional("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: optional("CLOUDINARY_API_SECRET"),
};

// Validate MongoDB URI separately (uses fallback logic above)
if (!env.MONGODB_URI) {
  throw new Error(
    "Missing required environment variable: MONGODB_URI (or MONGODB_URL)",
  );
}

export default env;
