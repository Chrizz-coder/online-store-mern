import express from "express";
import {
  addReview,
  getProductReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";

import { protect } from "../middleware/authMiddleware.js";
import { reviewLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
router.get("/:productId", getProductReviews);

router.use(protect);

router.post("/", reviewLimiter, addReview);
router.put("/:reviewId", updateReview);
router.delete("/:reviewId", deleteReview);

export default router;
