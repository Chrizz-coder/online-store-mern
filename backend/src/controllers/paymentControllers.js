import crypto from "crypto";
import razorpayInstance from "../services/razorpayServices.js";
import Cart from "../models/cartModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import { validateAndCalculateCart } from "./orderController.js";
import { executeOrderFinalization } from "../services/orderService.js";
import ApiError from "../utils/ApiError.js";
import { requireString, requireObjectId } from "../utils/validators.js";

export const createPaymentOrder = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Your cart is empty.");
    }

    const { totalAmount } = validateAndCalculateCart(cart);
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    return res.status(200).json({ order: razorpayOrder });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
    } = req.body;

    requireString(razorpay_order_id, "Razorpay order ID");
    requireString(razorpay_payment_id, "Razorpay payment ID");
    requireString(razorpay_signature, "Razorpay signature");
    requireObjectId(addressId, "Address ID");

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(500, "Payment configuration error.");
    }

    if (!addressId) {
      throw new ApiError(400, "Shipping address is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new ApiError(400, "Invalid address identifier format.");
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(400, "Missing payment details.");
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new ApiError(400, "Payment signature verification failed.");
    }

    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Your cart is empty.");
    }

    const selectedAddress = user.addresses.id(addressId);
    if (!selectedAddress) {
      throw new ApiError(404, "Address not found.");
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
        landmark: selectedAddress.landmark ?? "",
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country ?? "India",
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
    session.endSession();

    return res
      .status(200)
      .json({ message: "Payment verified successfully.", orderId: order._id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
