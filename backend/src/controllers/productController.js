import mongoose from "mongoose";
import Product from "../models/productModel.js";
import ApiError from "../utils/ApiError.js";
import { requireString, requireNumber } from "../utils/validators.js";

export const getAllProducts = async (req, res, next) => {
  try {
    // --- Pagination ---
    let page = 1;
    let limit = 20;

    if (req.query.page !== undefined) {
      page = parseInt(req.query.page);
      if (isNaN(page) || page < 1) {
        throw new ApiError(400, "page must be a positive integer.");
      }
    }

    if (req.query.limit !== undefined) {
      limit = parseInt(req.query.limit);
      if (isNaN(limit) || limit < 1) {
        throw new ApiError(400, "limit must be a positive integer.");
      }
      limit = Math.min(limit, 100);
    }

    const skip = (page - 1) * limit;

    // --- Numeric filter validation ---
    let minPrice, maxPrice, rating;

    if (req.query.minPrice !== undefined) {
      minPrice = Number(req.query.minPrice);
      if (isNaN(minPrice)) throw new ApiError(400, "minPrice must be a number.");
    }
    if (req.query.maxPrice !== undefined) {
      maxPrice = Number(req.query.maxPrice);
      if (isNaN(maxPrice)) throw new ApiError(400, "maxPrice must be a number.");
    }
    if (req.query.rating !== undefined) {
      rating = Number(req.query.rating);
      if (isNaN(rating)) throw new ApiError(400, "rating must be a number.");
    }

    // --- Build filter ---
    const filter = { isActive: true };

    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.brand) {
      filter.brand = new RegExp(req.query.brand, "i");
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.basePrice = {};
      if (minPrice !== undefined) filter.basePrice.$gte = minPrice;
      if (maxPrice !== undefined) filter.basePrice.$lte = maxPrice;
    }
    if (rating !== undefined) {
      filter.averageRating = { $gte: rating };
    }

    // --- Sort ---
    const sortMap = {
      "price-asc":   { basePrice: 1 },
      "price-desc":  { basePrice: -1 },
      "rating-desc": { averageRating: -1 },
      "newest":      { createdAt: -1 },
    };

    // Text search: sort by relevance score; otherwise use ?sort or default newest.
    const isTextSearch = Boolean(req.query.q);
    const sort = isTextSearch
      ? { score: { $meta: "textScore" } }
      : (sortMap[req.query.sort] ?? { createdAt: -1 });

    const projection = isTextSearch ? { score: { $meta: "textScore" } } : {};

    // --- Parallel execution ---
    const [products, total] = await Promise.all([
      Product.find(filter, projection).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      count: products.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
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

    requireString(name, "Name");
    requireString(description, "Description");
    requireNumber(basePrice, "Base price");
    requireNumber(salePrice, "Sale price");
    requireString(category, "Category");
    requireString(subCategory, "Sub-category");
    requireString(brand, "Brand");

    if (
      !name ||
      !description ||
      !basePrice ||
      !category ||
      !brand ||
      !images ||
      images.length === 0
    ) {
      throw new ApiError(
        400,
        "Name, description, basePrice, category, brand, and at least one image are required.",
      );
    }

    if (basePrice <= 0) {
      throw new ApiError(400, "Base price must be greater than 0.");
    }

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        if (variant.price === undefined || variant.price < 0) {
          throw new ApiError(400, "Each variant must have a valid price.");
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
    return res
      .status(201)
      .json({ message: "Product created successfully.", product: savedProduct });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updates = req.body;

    if (updates.name !== undefined) requireString(updates.name, "Name");
    if (updates.description !== undefined) requireString(updates.description, "Description");
    if (updates.basePrice !== undefined) requireNumber(updates.basePrice, "Base price");
    if (updates.salePrice !== undefined) requireNumber(updates.salePrice, "Sale price");
    if (updates.category !== undefined) requireString(updates.category, "Category");
    if (updates.brand !== undefined) requireString(updates.brand, "Brand");

    if (updates.basePrice !== undefined && updates.basePrice <= 0) {
      throw new ApiError(400, "Base price must be greater than 0.");
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedProduct) {
      throw new ApiError(404, "Product not found.");
    }

    return res
      .status(200)
      .json({ message: "Product updated successfully.", product: updatedProduct });
  } catch (error) {
    next(error);
  }
};

export const updateProductVariantFields = async (req, res, next) => {
  try {
    const { productId, variantId } = req.params;
    const { price, stock } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(variantId)
    ) {
      throw new ApiError(
        400,
        "Invalid product or variant identifier format.",
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    const targetVariant = product.variants.id(variantId);
    if (!targetVariant) {
      throw new ApiError(404, "Variant not found.");
    }

    if (price !== undefined) {
      if (Number(price) < 0) {
        throw new ApiError(400, "Variant price must be 0 or greater.");
      }
      targetVariant.price = price;
    }

    if (stock !== undefined) {
      if (Number(stock) < 0) {
        throw new ApiError(400, "Variant stock must be 0 or greater.");
      }
      targetVariant.stock = stock;
    }

    await product.save();
    return res
      .status(200)
      .json({ message: "Variant updated successfully.", product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    product.isActive = false;
    await product.save();

    return res
      .status(200)
      .json({ message: "Product deactivated successfully." });
  } catch (error) {
    next(error);
  }
};
