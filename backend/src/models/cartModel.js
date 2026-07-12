import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    selectedVariant: {
      color: String,
      size: String,
    },
    priceAtTimeOfAdding: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
    cartSubtotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.pre("save", function (next) {
  if (this.items.length === 0) {
    this.cartSubtotal = 0;
    return next();
  }

  this.cartSubtotal = this.items.reduce((total, item) => {
    return total + item.priceAtTimeOfAdding * item.quantity;
  }, 0);
  this.cartSubtotal = parseFloat(this.cartSubtotal.toFixed(2));
  next();
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
