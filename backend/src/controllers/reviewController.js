import mongoose from "mongoose";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";

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
    const { productId, rating, comment } = req.body;
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        message: "Product ID, rating number, and comments are mandatory.",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating parameters must be an integer score between 1 and 5.",
      });
    }

    const productExists = await Product.findById(productId);
    if (!productExists || !productExists.isActive) {
      return res.status(404).json({
        message: "Product not found or unavailable.",
      });
    }

    const purchasedOrder = await Order.findOne({
      user: req.user.id,
      "items.product": productId,
    });

    if (!purchasedOrder) {
      return res.status(403).json({
        message:
          "Access denied. You can only review products you have officially purchased.",
      });
    }

    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
    });
    if (existingReview) {
      return res.status(400).json({
        message: "Operation rejected. You have already reviewed this product.",
      });
    }
    const newReview = new Review({
      user: req.user.id,
      product: productId,
      rating,
      comment,
    });
    await newReview.save();
    await updateProductAvgRating(productId);
    return res
      .status(201)
      .json({ message: "Review posted successfully.", review: newReview });
  } catch (error) {
    console.error("Add Review Error:", error);
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Malformed product identifier values detected." });
    }
    return res
      .status(500)
      .json({ message: "Server error executing review creations." });
  }
};
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Malformed product identifier parameters." });
    }
    const reviews = await Review.find({ product: productId })
      .populate("user", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: reviews.length, reviews });
  } catch (error) {
    console.error("Get Reviews Error:", error);
    return res
      .status(500)
      .json({ message: "Server error pulling product reviews layout logs." });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({
        message: "Rating parameters must be an integer score between 1 and 5.",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Malformed product identifier parameters." });
    }
    const targetReview = await Review.findById(reviewId);
    if (!targetReview) {
      return res
        .status(404)
        .json({ message: "Target review documentation records not found." });
    }
    if (targetReview.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Forbidden. You cannot manipulate someone else's review text.",
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
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Malformed identifier format provided." });
    }
    return res
      .status(500)
      .json({ message: "Server error processing review modification loops." });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const targetReview = await Review.findById(reviewId);
    if (!targetReview) {
      return res
        .status(404)
        .json({ message: "Target review documentation records not found." });
    }
    if (targetReview.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Forbidden. You cannot manipulate someone else's review text.",
      });
    }

    const cachedProductId = targetReview.product;
    await targetReview.deleteOne();

    await updateProductAvgRating(cachedProductId);
    return res
      .status(200)
      .json({ message: "Review removed cleanly. Averages recalculated." });
  } catch (error) {
    console.error("Delete Review Error:", error);
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Malformed structural identifier format parsed." });
    }
    return res
      .status(500)
      .json({ message: "Server error executing review data purges." });
  }
};
