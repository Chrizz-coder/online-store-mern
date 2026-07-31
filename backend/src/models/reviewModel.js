import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    selectedVariant: {
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      color: String,
      size: String,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index(
  {
    user: 1,
    product: 1,
    "selectedVariant.variantId": 1,
    "selectedVariant.color": 1,
    "selectedVariant.size": 1,
  },
  { unique: true },
);

const Review = mongoose.model("Review", reviewSchema);

Review.syncIndexes().catch((err) => {
  console.error("Error syncing Review indexes:", err);
});

export default Review;
