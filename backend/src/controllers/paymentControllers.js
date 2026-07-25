import crypto from "crypto";

import razorpayInstance from "../services/razorpayServices.js";

import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

import { validateAndCalculateCart } from "./orderController.js";
import { executeOrderFinalization } from "../services/orderService.js";
export const createPaymentOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const { totalAmount } = validateAndCalculateCart(cart);
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);
    return res.status(200).json({
      success: true,
      order: razorpayOrder,
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    return res.status(500).json({ message: "Could not create payment order" });
  }
};

export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
    } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      await session.abortTransaction();
      return res
        .status(500)
        .json({ message: "Razorpay secret key is missing" });
    }

    if (!addressId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Shipping address is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Invalid address identifier format" });
    }

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Missing payment details" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid Signature" });
    }

    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: "User profile not found" });
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cart is empty" });
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Address not found" });
    }

    const { totalAmount, itemsSnapshot } = validateAndCalculateCart(cart);

    const order = await executeOrderFinalization({
      user,
      itemsSnapshot,
      shippingAddress: {
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        houseBuilding: selectedAddress.houseBuilding,
        streetArea: selectedAddress.streetArea,
        landmark: selectedAddress.landmark,
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country,
        pincode: selectedAddress.pincode,
      },
      totalAmount,
      paymentMethod: "Razorpay",
      paymentStatus: "paid",
      razorpayDetails: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
      session,
    });

    await session.commitTransaction();
    return res.status(200).json({ success: true, orderId: order._id });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
