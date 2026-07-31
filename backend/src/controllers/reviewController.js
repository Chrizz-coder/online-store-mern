import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";
import {
  isObjectId,
  getRequestedVariantId,
  hasVariantAttributes,
  getVariantByAttributes,
} from "../utils/variantUtils.js";

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

export const addReview = async (req, res) => {
  try {
    const { productId, variantId, selectedVariant, rating, comment } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({
        message: "Product ID, rating, and comment are required.",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5.",
      });
    }

    let product = await Product.findById(productId);
    let matchedVariant = product?.variants.id(productId);

    if (!product) {
      product = await Product.findOne({ "variants._id": productId });
      matchedVariant = product?.variants.id(productId);
    }

    if (!product || !product.isActive) {
      return res.status(404).json({
        message: "Product not found or currently unavailable.",
      });
    }

    const requestedVariantId = getRequestedVariantId({
      variantId,
      selectedVariant,
    });

    if (requestedVariantId) {
      if (!isObjectId(requestedVariantId)) {
        return res.status(400).json({
          message: "Invalid variant identifier format.",
        });
      }

      const requestedVariant = product.variants.id(requestedVariantId);

      if (!requestedVariant) {
        return res.status(400).json({
          message: "Selected variant does not belong to this product.",
        });
      }

      matchedVariant = requestedVariant;
    } else if (!matchedVariant && hasVariantAttributes(selectedVariant)) {
      matchedVariant = getVariantByAttributes(product.variants, selectedVariant);

      if (!matchedVariant) {
        return res.status(400).json({
          message: "Selected variant does not belong to this product.",
        });
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
      return res.status(403).json({
        message:
          "Access denied. You can only review products you have purchased.",
      });
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
      return res.status(409).json({
        message: "You have already reviewed this product variant.",
      });
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
    console.error("Add Review Error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this product variant.",
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product identifier format.",
      });
    }
    return res.status(500).json({ message: "Server error adding review." });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format." });
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
    console.error("Get Reviews Error:", error);
    return res.status(500).json({ message: "Server error fetching reviews." });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res
        .status(400)
        .json({ message: "Invalid review identifier format." });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5, and comment is required.",
      });
    }

    const targetReview = await Review.findById(reviewId);
    if (!targetReview) {
      return res.status(404).json({ message: "Review not found." });
    }

    if (targetReview.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Forbidden. You can only edit your own reviews.",
      });
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
    console.error("Update Review Error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ message: "Invalid identifier format." });
    }
    return res.status(500).json({ message: "Server error updating review." });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const targetReview = await Review.findById(reviewId);
    if (!targetReview) {
      return res.status(404).json({ message: "Review not found." });
    }

    if (targetReview.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Forbidden. You can only delete your own reviews.",
      });
    }

    const productId = targetReview.product;
    await targetReview.deleteOne();
    await updateProductAvgRating(productId);

    return res
      .status(200)
      .json({ message: "Review deleted successfully. Ratings recalculated." });
  } catch (error) {
    console.error("Delete Review Error:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ message: "Invalid identifier format." });
    }
    return res.status(500).json({ message: "Server error deleting review." });
  }
};
