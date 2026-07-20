import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res
        .status(400)
        .json({ message: "Product identifier parameter is required." });
    }
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res
        .status(404)
        .json({ message: "Product not found or is currently unavailable." });
    }
    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, items: [] });
    }

    const isAlreadyFavorite = Wishlist.items.some(
      (item) => item.product.toString() === productId,
    );

    if (isAlreadyFavorite) {
      return res
        .status(400)
        .json({ message: "Product is already present inside your wishlist." });
    }

    wishlist.items.push({ product: productId });
    await wishlist.save();
    return res
      .status(200)
      .json({ message: "Product added to wishlist successfully.", wishlist });
  } catch (error) {
    console.error("Add to Wishlist Error:", error);
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format provided." });
    }
    return res
      .status(500)
      .json({ message: "Server error executing wishlist additions." });
  }
};

export const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id }).populate(
      "items.product",
      "name images basePrice salePrice globalStock variants isActive",
    );

    if (!wishlist) {
      return res.status(200).json({
        items: [],
      });
    }
    return res.status(200).json({
      count: wishlist.items.length,
      wishlist,
    });
  } catch (error) {
    console.error("Get Wishlist Viewport Error:", error);
    return res
      .status(500)
      .json({ message: "Server error loading your personalized wishlist." });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist records empty." });
    }

    const originalLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId,
    );
    if (wishlist.items.length === originalLength) {
      return res
        .status(404)
        .json({ message: "Target item was not found inside your wishlist." });
    }
    await wishlist.save();
    return res
      .status(200)
      .json({ message: "Item dropped from wishlist successfully.", wishlist });
  } catch (error) {
    console.error("Remove from Wishlist Error:", error);
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format parsed." });
    }
    return res
      .status(500)
      .json({ message: "Server error executing item extraction." });
  }
};
