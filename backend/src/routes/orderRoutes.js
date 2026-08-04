import express from "express";

import {
  proceedToCheckout,
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { orderLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/checkout-summary", proceedToCheckout);
router.post("/", orderLimiter, placeOrder);
router.get("/myOrders", getMyOrders);
router.get("/:id", getOrderById);
router.delete("/:id/cancel", cancelOrder);

export default router;
