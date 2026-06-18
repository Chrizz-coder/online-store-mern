import Product from "../models/productModel.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });

    if (products.length === 0) {
      return res
        .status(200)
        .json({ message: "No products in catalog", products: [] });
    }
    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.log("Fetch all products ", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching items" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found " });
    }
    return res.status(200).json(product);
  } catch (error) {
    console.error("Error while fetching product", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }
    return res
      .status(500)
      .json({ message: "Server error while fetching the product" });
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
        message:
          "Please fulfill all required fields, including at least one image ",
      });
    }
    if (basePrice <= 0) {
      return res
        .status(400)
        .json({ message: "Base Price cannot be 0 or negative" });
    }
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        if (variant.price === undefined || variant.price < 0) {
          return res
            .status(400)
            .json({ message: "Individual variant must have a valid price" });
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
      .json({ message: "Product created successfully", product: savedProduct });
  } catch (error) {
    console.error("Product creation error", error);
    return res
      .status(500)
      .json({ message: "Server error while creating product" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updates = req.body;

    if (updates.basePrice !== undefined && updates.basePrice <= 0) {
      return res.status(400).json({
        message: "Operation rejected product price should be greater than 0",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ message: "Target product listing not found" });
    }
    product.isActive = false;
    await Product.save();
    return res.status(200).json({
      message: "Product deactivated and hidden from store successfully",
    });
  } catch (error) {
    console.error("Error while deleting the product", error);
    return res
      .status(500)
      .json({ message: "Internal server error while deleting the product" });
  }
};
