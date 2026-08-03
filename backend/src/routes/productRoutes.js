import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductVariantFields,
  updateProduct,
} from "../controllers/productController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { searchLimiter, adminLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.get("/", searchLimiter, getAllProducts);
router.get("/:id", searchLimiter, getProductById);

router.post("/", protect, adminOnly, adminLimiter, createProduct);
router.put("/:id", protect, adminOnly, adminLimiter, updateProduct);
router.patch(
  "/:productId/variants/:variantId",
  protect,
  adminOnly,
  adminLimiter,
  updateProductVariantFields,
);
router.delete("/:id", protect, adminOnly, adminLimiter, deleteProduct);
export default router;
