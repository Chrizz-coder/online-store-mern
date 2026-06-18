import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/productController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import Product from "../models/productModel.js";

const productRoutes = express.Router();

productRoutes.get("/", getAllProducts);
productRoutes.get("/:id", getProductById);


productRoutes.post("/",protect,adminOnly, createProduct);
productRoutes.put("/:id",protect,adminOnly,updateProduct);
productRoutes.delete("/:id",protect,adminOnly,deleteProduct);
export default productRoutes;
