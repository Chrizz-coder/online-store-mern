import express from "express";

import {
  createPaymentOrder,
  verifyPayment,
} from "../controllers/paymentControllers.js";

import { protect } from "../middleware/authMiddleware.js";
import { paymentLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
router.use(protect);

router.post("/create-order", paymentLimiter, createPaymentOrder);
router.post("/verify", paymentLimiter, verifyPayment);

export default router;
