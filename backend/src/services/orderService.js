import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Cart from "../models/cartModel.js";

export const executeOrderFinalization = async ({
  user,
  itemsSnapshot,
  shippingAddress,
  totalAmount,
  paymentMethod,
  paymentStatus,
  razorpayDetails = {},
  session,
}) => {
  const newOrder = new Order({
    user: user._id,
    items: itemsSnapshot,
    shippingAddress,
    totalAmount,
    paymentMethod,
    paymentStatus,
    orderStatus: "placed",
    ...razorpayDetails,
  });

  const savedOrder = await newOrder.save({ session });

  for (let item of itemsSnapshot) {
    const color = item.selectedVariant?.color;
    const size = item.selectedVariant?.size;

    if (color || size) {
      await Product.updateOne(
        { _id: item.product, "variants.color": color, "variants.size": size },
        { $inc: { "variants.$.stock": -item.quantity } },
        { session },
      );
    } else {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { globalStock: -item.quantity } },
        { session },
      );
    }
  }

  // 3. Clear the Cart
  await Cart.findOneAndUpdate(
    { user: user._id },
    { $set: { items: [], cartSubtotal: 0 } },
    { session },
  );

  return savedOrder;
};
