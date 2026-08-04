import express from "express";

import {
  addToCart,
  viewCart,
  updateCartQuantity,
  deleteCartItem,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";
import { cartLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
router.use(protect);

router.get("/", viewCart);
router.post("/", cartLimiter, addToCart);
router.put("/:productId", cartLimiter, updateCartQuantity);
router.delete("/:productId", cartLimiter, deleteCartItem);

export default router;
