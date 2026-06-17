import express from "express";
import {
  getAllProducts,
  getProductById,
} from "../controllers/productController.js";

const productRoutes = express.Router();

productRoutes.get("/", getAllProducts);
productRoutes.get("/:id", getProductById);

export default productRoutes;
