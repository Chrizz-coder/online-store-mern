import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import addressRoute from "./routes/addressRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js"
import cors from "cors";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/user", userRoutes);
app.use("/api/user/address", addressRoute);
app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment",paymentRoutes)

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
