import express from "express";

import {
  proceedToCheckout,
  placeOrder,
  getMyOrders,
  getOrderById,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/checkout-summary", proceedToCheckout);
router.post("/", placeOrder);
router.get("/myOrders", getMyOrders);
router.get("/:id", getOrderById);

export default router;
