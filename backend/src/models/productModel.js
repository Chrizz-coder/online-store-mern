import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [{ type: String }],
    images: [
      {
        type: String,
        required: true,
      },
    ],

    variants: [
      {
        color: String,
        size: String,

        stock: {
          type: Number,

          default: 0,
          min: 0,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    globalStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.pre("save", function () {
  if (!this.isModified("name")) return;
  this.slug = this.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
});

// Unique sparse index: sparse because pre-existing docs may have null slug.
// Enables fast SEO URL lookups and enforces slug uniqueness at DB level.
productSchema.index({ slug: 1 }, { unique: true, sparse: true });

// Compound index following the ESR rule (Equality first).
// Serves: Product.find({ isActive: true }) — uses leftmost prefix.
// Serves: Product.find({ isActive: true, category: x }) — uses both fields.
productSchema.index({ isActive: 1, category: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
