import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import { executeOrderFinalization } from "../services/orderService.js";
import mongoose from "mongoose";

export const validateAndCalculateCart = (cart) => {
  let totalAmount = 0;
  const orderItemsSnapshot = [];

  for (let item of cart.items) {
    const product = item.product;

    if (!product || !product.isActive) {
      throw new Error("Checkout aborted. An item in your cart is no longer available.");
    }

    let freshLivePrice = product.salePrice || product.basePrice;
    const color = item.selectedVariant?.color;
    const size = item.selectedVariant?.size;

    if (product.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );

      if (!matchedVariant) {
        throw new Error(
          `Selected variant is unavailable for product: ${product.name}`,
        );
      }

      if (matchedVariant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock. Only ${matchedVariant.stock} units available for ${product.name}.`,
        );
      }

      freshLivePrice = matchedVariant.price || freshLivePrice;
    } else {
      if (product.globalStock < item.quantity) {
        throw new Error(
          `Insufficient stock. Only ${product.globalStock} units available for ${product.name}.`,
        );
      }
    }

    totalAmount += freshLivePrice * item.quantity;

    orderItemsSnapshot.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0] || "",
      quantity: item.quantity,
      purchasePrice: freshLivePrice,
      selectedVariant: { color, size },
    });
  }

  return {
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    itemsSnapshot: orderItemsSnapshot,
  };
};

export const proceedToCheckout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    const { totalAmount, itemsSnapshot } = validateAndCalculateCart(cart);

    return res.status(200).json({
      message: "Checkout summary generated successfully.",
      summary: {
        items: itemsSnapshot,
        totalItemsCount: itemsSnapshot.length,
        totalAmount,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Checkout error." });
  }
};

export const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { addressId, paymentMethod } = req.body;

    if (!paymentMethod || !["COD", "Razorpay"].includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid payment method. Choose COD or Razorpay." });
    }

    if (!addressId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Shipping address is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid address identifier format." });
    }

    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found." });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Address not found." });
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Your cart is empty." });
    }

    const { totalAmount, itemsSnapshot } = validateAndCalculateCart(cart);

    const newOrder = new Order({
      user: req.user.id,
      items: itemsSnapshot,
      shippingAddress: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        houseBuilding: selectedAddress.houseBuilding,
        streetArea: selectedAddress.streetArea,
        landmark: selectedAddress.landmark ?? "",
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country ?? "India",
        pincode: selectedAddress.pincode,
      },
      totalAmount,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "placed",
    });

    const savedOrder = await newOrder.save({ session });

    for (let item of savedOrder.items) {
      const color = item.selectedVariant?.color;
      const size = item.selectedVariant?.size;

      if (color || size) {
        await Product.updateOne(
          { _id: item.product, "variants.size": size, "variants.color": color },
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

    cart.items = [];
    cart.cartSubtotal = 0;
    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Order placed successfully.",
      orderId: savedOrder._id,
      orderStatus: savedOrder.orderStatus,
      paymentStatus: savedOrder.paymentStatus,
      totalAmount: savedOrder.totalAmount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Place Order Error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid identifier format." });
    }
    return res.status(500).json({ message: "Server error placing order." });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    return res.status(500).json({ message: "Server error fetching orders." });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order identifier format." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. This order does not belong to you." });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get Order By ID Error:", error);
    return res.status(500).json({ message: "Server error fetching order." });
  }
};

export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid order identifier format." });
    }

    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.user.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: "Access denied. This order does not belong to you." });
    }

    if (order.orderStatus === "cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Order is already cancelled." });
    }

    const allowedStatuses = ["placed", "processing"];
    if (!allowedStatuses.includes(order.orderStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Orders with status "${order.orderStatus}" cannot be cancelled.`,
      });
    }

    for (let item of order.items) {
      const color = item.selectedVariant?.color;
      const size = item.selectedVariant?.size;

      if (color || size) {
        await Product.updateOne(
          { _id: item.product, "variants.size": size, "variants.color": color },
          { $inc: { "variants.$.stock": item.quantity } },
          { session },
        );
      } else {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { globalStock: item.quantity } },
          { session },
        );
      }
    }

    order.orderStatus = "cancelled";
    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Order cancelled successfully. Stock has been restored.",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Cancel Order Error:", error);
    return res.status(500).json({ message: "Server error cancelling order." });
  }
};
