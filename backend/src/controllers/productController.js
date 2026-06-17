import Product from "../models/productModel.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});

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
