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
  orderStatus = "placed",
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
    orderStatus,
    ...razorpayDetails,
  });

  const savedOrder = await newOrder.save({ session });

  for (let item of itemsSnapshot) {
    const color = item.selectedVariant?.color;
    const size = item.selectedVariant?.size;

    if (color || size) {
      const elemMatchQuery = { stock: { $gte: item.quantity } };
      if (color) elemMatchQuery.color = color;
      if (size) elemMatchQuery.size = size;

      const updateResult = await Product.updateOne(
        {
          _id: item.product,
          variants: { $elemMatch: elemMatchQuery },
        },
        { $inc: { "variants.$.stock": -item.quantity } },
        { session },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error(
          `Insufficient stock or variant unavailable for product ${item.name}`,
        );
      }
    } else {
      const updateResult = await Product.updateOne(
        {
          _id: item.product,
          globalStock: { $gte: item.quantity },
        },
        { $inc: { globalStock: -item.quantity } },
        { session },
      );

      if (updateResult.matchedCount === 0) {
        throw new Error(
          `Insufficient stock for product ${item.name}`,
        );
      }
    }
  }

  await Cart.findOneAndUpdate(
    { user: user._id },
    { $set: { items: [], cartSubtotal: 0 } },
    { session },
  );

  return savedOrder;
};
