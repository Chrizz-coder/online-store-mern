import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";
import mongoose from "mongoose";

const isObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const getRequestedVariantId = ({ variantId, selectedVariant }) =>
  variantId ?? selectedVariant?.variantId ?? selectedVariant?._id;

const hasVariantAttributes = (selectedVariant) =>
  selectedVariant &&
  (Object.hasOwn(selectedVariant, "color") ||
    Object.hasOwn(selectedVariant, "size"));

const getVariantByAttributes = (variants, selectedVariant) =>
  variants.find(
    (variant) =>
      variant.color === selectedVariant.color &&
      variant.size === selectedVariant.size,
  );

export const addToWishlist = async (req, res) => {
  try {
    const { productId, variantId, selectedVariant } = req.body;
    if (!productId) {
      return res
        .status(400)
        .json({ message: "Product identifier parameter is required." });
    }

    if (!isObjectId(productId)) {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format provided." });
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
        .json({ message: "Product not found or is currently unavailable." });
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId) {
      if (!isObjectId(requestedVariantId)) {
        return res
          .status(400)
          .json({ message: "Invalid variant identifier format provided." });
      }

      const requestedVariant = product.variants.id(requestedVariantId);
      if (!requestedVariant) {
        return res
          .status(400)
          .json({ message: "The specified variant does not belong to this product." });
      }
      matchedVariant = requestedVariant;
    } else if (!matchedVariant && hasVariantAttributes(selectedVariant)) {
      matchedVariant = getVariantByAttributes(product.variants, selectedVariant);
      if (!matchedVariant) {
        return res
          .status(400)
          .json({ message: "The specified variant does not belong to this product." });
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
        .status(400)
        .json({ message: "Product is already present inside your wishlist." });
    }

    wishlist.items.push({ product: product._id, selectedVariant: variantToStore });
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
    const { productId, variantId, selectedVariant } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product identifier parameter is required.",
      });
    }

    if (!isObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product identifier format provided.",
      });
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId && !isObjectId(requestedVariantId)) {
      return res.status(400).json({
        message: "Invalid variant identifier format provided.",
      });
    }

    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({
        message: "Wishlist records empty.",
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
        item.selectedVariant?.variantId?.toString() !==
        requestedVariantId
      );
    });

    if (wishlist.items.length === originalLength) {
      return res.status(404).json({
        message: "Target item was not found inside your wishlist.",
      });
    }

    await wishlist.save();

    return res.status(200).json({
      message: "Item removed from wishlist successfully.",
      wishlist,
    });
  } catch (error) {
    console.error("Remove Wishlist Error:", error);

    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res.status(400).json({
        message: "Invalid identifier format provided.",
      });
    }

    return res.status(500).json({
      message: "Server error executing wishlist removal.",
    });
  }
};