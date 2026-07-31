import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // A product can have multiple purchasable variants.  Keep the selected
    // variant with the wishlist item so the same product in different
    // configurations is not treated as a duplicate.
    selectedVariant: {
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      color: String,
      size: String,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const wishlistSchema = new mongoose.Schema({
  user:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true,
      index:true,
      unique:true
  },
  items:[wishlistItemSchema]
},{
  timestamps:true
})
const Wishlist = mongoose.model("Wishlist",wishlistSchema)

export default Wishlist;
