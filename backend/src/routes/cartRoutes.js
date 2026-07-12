import express from "express";

import {
  addToCart,
  viewCart,
  updateCartQuantity,
  deleteCartItem,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

router.get("/", viewCart);
router.post("/", addToCart);
router.put("/:productId", updateCartQuantity);
router.delete("/:productId", deleteCartItem);
