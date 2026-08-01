import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";
import ApiError from "../utils/ApiError.js";
import {
  isObjectId,
  getRequestedVariantId,
  hasVariantAttributes,
  getVariantByAttributes,
} from "../utils/variantUtils.js";

export const addToWishlist = async (req, res, next) => {
  try {
    const { productId, variantId, selectedVariant } = req.body;
    if (!productId) {
      throw new ApiError(400, "Product identifier is required.");
    }

    if (!isObjectId(productId)) {
      throw new ApiError(400, "Invalid product identifier format.");
    }

    let product = await Product.findById(productId);
    let matchedVariant = product?.variants.id(productId);

    if (!product) {
      product = await Product.findOne({ "variants._id": productId });
      matchedVariant = product?.variants.id(productId);
    }

    if (!product || !product.isActive) {
      throw new ApiError(
        404,
        "Product not found or currently unavailable.",
      );
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId) {
      if (!isObjectId(requestedVariantId)) {
        throw new ApiError(400, "Invalid variant identifier format.");
      }

      const requestedVariant = product.variants.id(requestedVariantId);
      if (!requestedVariant) {
        throw new ApiError(
          400,
          "Selected variant does not belong to this product.",
        );
      }
      matchedVariant = requestedVariant;
    } else if (!matchedVariant && hasVariantAttributes(selectedVariant)) {
      matchedVariant = getVariantByAttributes(product.variants, selectedVariant);
      if (!matchedVariant) {
        throw new ApiError(
          400,
          "Selected variant does not belong to this product.",
        );
      }
    }

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
      throw new ApiError(409, "Product is already in your wishlist.");
    }

    wishlist.items.push({ product: product._id, selectedVariant: variantToStore });
    await wishlist.save();

    return res
      .status(200)
      .json({ message: "Product added to wishlist successfully.", wishlist });
  } catch (error) {
    next(error);
  }
};

export const getWishlist = async (req, res, next) => {
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
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId, variantId, selectedVariant } = req.body;

    if (!productId) {
      throw new ApiError(400, "Product identifier is required.");
    }

    if (!isObjectId(productId)) {
      throw new ApiError(400, "Invalid product identifier format.");
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId && !isObjectId(requestedVariantId)) {
      throw new ApiError(400, "Invalid variant identifier format.");
    }

    const wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      throw new ApiError(404, "Wishlist not found.");
    }

    const originalLength = wishlist.items.length;

    wishlist.items = wishlist.items.filter((item) => {
      if (item.product.toString() !== productId) {
        return true;
      }

      if (!requestedVariantId) {
        return false;
      }

      return (
        item.selectedVariant?.variantId?.toString() !== requestedVariantId
      );
    });

    if (wishlist.items.length === originalLength) {
      throw new ApiError(404, "Item not found in wishlist.");
    }

    await wishlist.save();

    return res.status(200).json({
      message: "Item removed from wishlist successfully.",
      wishlist,
    });
  } catch (error) {
    next(error);
  }
};