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
import Product from "../models/productModel.js";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", getProductById);

router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.patch(
  "/:productId/variants/:variantId",
  protect,
  adminOnly,
  updateProductVariantFields,
);
router.delete("/:id", protect, adminOnly, deleteProduct);
export default router;
