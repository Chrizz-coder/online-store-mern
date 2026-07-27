import express from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", addToWishlist);
router.get("/", getWishlist);
router.get("/:productId", removeFromWishlist);

export default router;
