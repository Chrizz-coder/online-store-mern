import express from "express";

import {
  proceedToCheckout,
  placeOrder,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/checkout-summary", proceedToCheckout);
router.post("/", placeOrder);

export const router;
