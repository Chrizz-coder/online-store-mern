import mongoose from "mongoose";
import Product from "../models/productModel.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });

    if (products.length === 0) {
      return res.status(200).json({ message: "No products in catalog.", products: [] });
    }

    return res.status(200).json({ count: products.length, products });
  } catch (error) {
    console.error("Get All Products Error:", error);
    return res.status(500).json({ message: "Server error fetching products." });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid product identifier format." });
    }
    return res.status(500).json({ message: "Server error fetching product." });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      basePrice,
      salePrice,
      category,
      subCategory,
      brand,
      tags,
      images,
      variants,
      globalStock,
    } = req.body;

    if (
      !name ||
      !description ||
      !basePrice ||
      !category ||
      !brand ||
      !images ||
      images.length === 0
    ) {
      return res.status(400).json({
        message: "Name, description, basePrice, category, brand, and at least one image are required.",
      });
    }

    if (basePrice <= 0) {
      return res.status(400).json({ message: "Base price must be greater than 0." });
    }

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        if (variant.price === undefined || variant.price < 0) {
          return res.status(400).json({ message: "Each variant must have a valid price." });
        }
      }
    }

    const newProduct = new Product({
      name,
      description,
      basePrice,
      salePrice,
      category,
      subCategory,
      brand,
      tags: tags || [],
      images,
      variants: variants || [],
      globalStock: globalStock || 0,
      isActive: true,
      averageRating: 0,
    });

    const savedProduct = await newProduct.save();
    return res.status(201).json({ message: "Product created successfully.", product: savedProduct });
  } catch (error) {
    console.error("Create Product Error:", error);
    return res.status(500).json({ message: "Server error creating product." });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const updates = req.body;

    if (updates.basePrice !== undefined && updates.basePrice <= 0) {
      return res.status(400).json({ message: "Base price must be greater than 0." });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.status(200).json({ message: "Product updated successfully.", product: updatedProduct });
  } catch (error) {
    console.error("Update Product Error:", error);
    return res.status(500).json({ message: "Server error updating product." });
  }
};

export const updateProductVariantFields = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { price, stock } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(variantId)
    ) {
      return res.status(400).json({ message: "Invalid product or variant identifier format." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const targetVariant = product.variants.id(variantId);
    if (!targetVariant) {
      return res.status(404).json({ message: "Variant not found." });
    }

    if (price !== undefined) {
      if (Number(price) < 0) {
        return res.status(400).json({ message: "Variant price must be 0 or greater." });
      }
      targetVariant.price = price;
    }

    if (stock !== undefined) {
      if (Number(stock) < 0) {
        return res.status(400).json({ message: "Variant stock must be 0 or greater." });
      }
      targetVariant.stock = stock;
    }

    await product.save();
    return res.status(200).json({ message: "Variant updated successfully.", product });
  } catch (error) {
    console.error("Update Variant Error:", error);
    return res.status(500).json({ message: "Server error updating variant." });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    product.isActive = false;
    await product.save();

    return res.status(200).json({ message: "Product deactivated successfully." });
  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({ message: "Server error deactivating product." });
  }
};
