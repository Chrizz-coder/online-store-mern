import "dotenv/config";
import express from "express";
import helmet from "helmet";
import connectDB from "./config/db.js";
import userRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import addressRoute from "./routes/addressRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cors from "cors";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { globalLimiter } from "./middleware/rateLimitMiddleware.js";
import mongoSanitize from "express-mongo-sanitize";

const app = express();

// Required for express-rate-limit to correctly read the client IP when running
// behind a reverse proxy (Nginx, Render, Railway, Vercel, etc.).
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // No Origin header = Postman, cURL, server-to-server calls, Razorpay webhooks — allow.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use("/api", globalLimiter);
app.use(express.json());
// Strip $ and . keys from req.body/query/params before any route handler.
app.use(mongoSanitize());

app.use("/api/user", userRoutes);
app.use("/api/user/address", addressRoute);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use(notFound);
app.use(errorHandler);

connectDB();
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server started, running on port ${port}`);
});
