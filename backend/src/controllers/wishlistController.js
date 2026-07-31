import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";
import {
  isObjectId,
  getRequestedVariantId,
  hasVariantAttributes,
  getVariantByAttributes,
} from "../utils/variantUtils.js";

export const addToWishlist = async (req, res) => {
  try {
    const { productId, variantId, selectedVariant } = req.body;
    if (!productId) {
      return res
        .status(400)
        .json({ message: "Product identifier is required." });
    }

    if (!isObjectId(productId)) {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format." });
    }

    // Clients may send either the parent product id with a variant id, or a
    // variant's embedded id directly. Supporting both makes the API work with
    // existing product cards that use the variant id as their identifier.
    let product = await Product.findById(productId);
    let matchedVariant = product?.variants.id(productId);

    if (!product) {
      product = await Product.findOne({ "variants._id": productId });
      matchedVariant = product?.variants.id(productId);
    }

    if (!product || !product.isActive) {
      return res
        .status(404)
        .json({ message: "Product not found or currently unavailable." });
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId) {
      if (!isObjectId(requestedVariantId)) {
        return res
          .status(400)
          .json({ message: "Invalid variant identifier format." });
      }

      const requestedVariant = product.variants.id(requestedVariantId);
      if (!requestedVariant) {
        return res
          .status(400)
          .json({ message: "Selected variant does not belong to this product." });
      }
      matchedVariant = requestedVariant;
    } else if (!matchedVariant && hasVariantAttributes(selectedVariant)) {
      matchedVariant = getVariantByAttributes(product.variants, selectedVariant);
      if (!matchedVariant) {
        return res
          .status(400)
          .json({ message: "Selected variant does not belong to this product." });
      }
    }

    // A selected variant is optional for backwards compatibility with
    // product-level wishlist requests.
    const variantToStore = matchedVariant
      ? {
          variantId: matchedVariant._id,
          color: matchedVariant.color,
          size: matchedVariant.size,
        }
      : undefined;

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, items: [] });
    }

    const isAlreadyFavorite = wishlist.items.some(
      (item) =>
        item.product.toString() === product._id.toString() &&
        (item.selectedVariant?.variantId?.toString() ?? null) ===
          (variantToStore?.variantId?.toString() ?? null),
    );

    if (isAlreadyFavorite) {
      return res
        .status(409)
        .json({ message: "Product is already in your wishlist." });
    }

    wishlist.items.push({ product: product._id, selectedVariant: variantToStore });
    await wishlist.save();

    return res
      .status(200)
      .json({ message: "Product added to wishlist successfully.", wishlist });
  } catch (error) {
    console.error("Add to Wishlist Error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format." });
    }
    return res
      .status(500)
      .json({ message: "Server error adding to wishlist." });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id }).populate(
      "items.product",
      "name images basePrice salePrice globalStock variants isActive",
    );

    if (!wishlist) {
      return res.status(200).json({ items: [] });
    }

    return res.status(200).json({
      count: wishlist.items.length,
      wishlist,
    });
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    return res.status(500).json({ message: "Server error fetching wishlist." });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { productId, variantId, selectedVariant } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product identifier is required.",
      });
    }

    if (!isObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product identifier format.",
      });
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId && !isObjectId(requestedVariantId)) {
      return res.status(400).json({
        message: "Invalid variant identifier format.",
      });
    }

    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({
        message: "Wishlist not found.",
      });
    }

    const originalLength = wishlist.items.length;

    wishlist.items = wishlist.items.filter((item) => {
      // Different product → keep it
      if (item.product.toString() !== productId) {
        return true;
      }

      // Remove whole product (non-variant item)
      if (!requestedVariantId) {
        return false;
      }

      // Remove only matching variant
      return (
        item.selectedVariant?.variantId?.toString() !== requestedVariantId
      );
    });

    if (wishlist.items.length === originalLength) {
      return res.status(404).json({
        message: "Item not found in wishlist.",
      });
    }

    await wishlist.save();

    return res.status(200).json({
      message: "Item removed from wishlist successfully.",
      wishlist,
    });
  } catch (error) {
    console.error("Remove Wishlist Error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid identifier format.",
      });
    }

    return res.status(500).json({
      message: "Server error removing from wishlist.",
    });
  }
};