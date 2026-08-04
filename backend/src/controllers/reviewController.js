import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";
import ApiError from "../utils/ApiError.js";
import {
  isObjectId,
  getRequestedVariantId,
  hasVariantAttributes,
  getVariantByAttributes,
} from "../utils/variantUtils.js";
import { requireString, requireInteger, requireObjectId } from "../utils/validators.js";

const updateProductAvgRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  if (reviews.length === 0) {
    await Product.findByIdAndUpdate(productId, { averageRating: 0 });
    return;
  }
  const sumOfRating = reviews.reduce((total, r) => total + r.rating, 0);
  const calculatedAvgRating = parseFloat(
    (sumOfRating / reviews.length).toFixed(2),
  );
  await Product.findByIdAndUpdate(productId, {
    averageRating: calculatedAvgRating,
  });
};

export const addReview = async (req, res, next) => {
  try {
    const { productId, variantId, selectedVariant, rating, comment } = req.body;

    requireObjectId(productId, "Product ID");
    requireInteger(rating, "Rating");
    requireString(comment, "Comment");
    if (variantId !== undefined) requireObjectId(variantId, "Variant ID");

    if (!productId || !rating || !comment) {
      throw new ApiError(400, "Product ID, rating, and comment are required.");
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ApiError(
        400,
        "Rating must be an integer between 1 and 5.",
      );
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

    const purchasedOrder = await Order.findOne({
      user: req.user.id,
      items: {
        $elemMatch: {
          product: product._id,
          ...(matchedVariant && {
            $or: [
              { "selectedVariant.variantId": matchedVariant._id },
              {
                ...(matchedVariant.color && {
                  "selectedVariant.color": matchedVariant.color,
                }),
                ...(matchedVariant.size && {
                  "selectedVariant.size": matchedVariant.size,
                }),
              },
            ],
          }),
        },
      },
    });

    if (!purchasedOrder) {
      throw new ApiError(
        403,
        "Access denied. You can only review products you have purchased.",
      );
    }

    const existingReview = await Review.findOne({
      user: req.user.id,
      product: product._id,
      ...(matchedVariant
        ? {
            $or: [
              { "selectedVariant.variantId": matchedVariant._id },
              {
                ...(matchedVariant.color && {
                  "selectedVariant.color": matchedVariant.color,
                }),
                ...(matchedVariant.size && {
                  "selectedVariant.size": matchedVariant.size,
                }),
              },
            ],
          }
        : { selectedVariant: { $exists: false } }),
    });

    if (existingReview) {
      throw new ApiError(
        409,
        "You have already reviewed this product variant.",
      );
    }

    const newReview = new Review({
      user: req.user.id,
      product: product._id,
      selectedVariant: matchedVariant
        ? {
            variantId: matchedVariant._id,
            color: matchedVariant.color,
            size: matchedVariant.size,
          }
        : undefined,
      rating,
      comment,
    });

    await newReview.save();
    await updateProductAvgRating(product._id);

    return res
      .status(201)
      .json({ message: "Review posted successfully.", review: newReview });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ApiError(400, "Invalid product identifier format.");
    }

    let targetProductId = productId;
    const productExists = await Product.findById(productId);
    if (!productExists) {
      const parentProduct = await Product.findOne({
        "variants._id": productId,
      });
      if (parentProduct) {
        targetProductId = parentProduct._id;
      }
    }

    const reviews = await Review.find({ product: targetProductId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: reviews.length, reviews });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    requireInteger(rating, "Rating");
    requireString(comment, "Comment");

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new ApiError(400, "Invalid review identifier format.");
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      throw new ApiError(
        400,
        "Rating must be an integer between 1 and 5, and comment is required.",
      );
    }

    const targetReview = await Review.findById(reviewId);
    if (!targetReview) {
      throw new ApiError(404, "Review not found.");
    }

    if (targetReview.user.toString() !== req.user.id) {
      throw new ApiError(
        403,
        "Forbidden. You can only edit your own reviews.",
      );
    }

    targetReview.rating = rating;
    targetReview.comment = comment;
    await targetReview.save();
    await updateProductAvgRating(targetReview.product);

    return res.status(200).json({
      message: "Review updated successfully.",
      review: targetReview,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const targetReview = await Review.findById(reviewId);
    if (!targetReview) {
      throw new ApiError(404, "Review not found.");
    }

    if (targetReview.user.toString() !== req.user.id) {
      throw new ApiError(
        403,
        "Forbidden. You can only delete your own reviews.",
      );
    }

    const productId = targetReview.product;
    await targetReview.deleteOne();
    await updateProductAvgRating(productId);

    return res
      .status(200)
      .json({ message: "Review deleted successfully. Ratings recalculated." });
  } catch (error) {
    next(error);
  }
};
