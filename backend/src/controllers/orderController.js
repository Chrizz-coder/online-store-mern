import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import { executeOrderFinalization } from "../services/orderService.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

export const validateAndCalculateCart = (cart) => {
  let totalAmount = 0;
  const orderItemsSnapshot = [];

  for (let item of cart.items) {
    const product = item.product;

    if (!product || !product.isActive) {
      throw new ApiError(
        400,
        "Checkout aborted. An item in your cart is no longer available.",
      );
    }

    let freshLivePrice = product.salePrice || product.basePrice;
    const color = item.selectedVariant?.color;
    const size = item.selectedVariant?.size;

    if (product.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );

      if (!matchedVariant) {
        throw new ApiError(
          400,
          `Selected variant is unavailable for product: ${product.name}`,
        );
      }

      if (matchedVariant.stock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock. Only ${matchedVariant.stock} units available for ${product.name}.`,
        );
      }

      freshLivePrice = matchedVariant.price || freshLivePrice;
    } else {
      if (product.globalStock < item.quantity) {
        throw new ApiError(
          400,
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

export const proceedToCheckout = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Your cart is empty.");
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
    next(error);
  }
};

export const placeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { addressId, paymentMethod } = req.body;

    if (!paymentMethod || !["COD", "Razorpay"].includes(paymentMethod)) {
      throw new ApiError(
        400,
        "Invalid payment method. Choose COD or Razorpay.",
      );
    }

    if (!addressId) {
      throw new ApiError(400, "Shipping address is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new ApiError(400, "Invalid address identifier format.");
    }

    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      throw new ApiError(404, "Address not found.");
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Your cart is empty.");
    }

    const { totalAmount, itemsSnapshot } = validateAndCalculateCart(cart);

    const savedOrder = await executeOrderFinalization({
      user,
      itemsSnapshot,
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
      session,
    });

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
    next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid order identifier format.");
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    if (order.user.toString() !== req.user.id) {
      throw new ApiError(
        403,
        "Access denied. This order does not belong to you.",
      );
    }

    return res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid order identifier format.");
    }

    const order = await Order.findById(id).session(session);
    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    if (order.user.toString() !== req.user.id) {
      throw new ApiError(
        403,
        "Access denied. This order does not belong to you.",
      );
    }

    if (order.orderStatus === "cancelled") {
      throw new ApiError(400, "Order is already cancelled.");
    }

    const allowedStatuses = ["placed", "processing"];
    if (!allowedStatuses.includes(order.orderStatus)) {
      throw new ApiError(
        400,
        `Orders with status "${order.orderStatus}" cannot be cancelled.`,
      );
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
    next(error);
  }
};
