import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import mongoose from "mongoose";

const validateAndCalculateCart = (cart) => {
  let totalAmount = 0;
  const orderItemsSnapshot = [];

  for (let item of cart.items) {
    const currentProduct = item.product;

    if (!currentProduct || !currentProduct.isActive) {
      throw new Error(
        "Checkout aborted. An item in your cart is no longer available.",
      );
    }

    let freshLivePrice = currentProduct.salePrice || currentProduct.basePrice;
    const color = item.selectedVariant?.color;
    const size = item.selectedVariant?.size;

    if (currentProduct.variants && currentProduct.variants.length > 0) {
      const matchedVariant = currentProduct.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );

      if (!matchedVariant) {
        throw new Error(
          `Selected color/size option is unavailable for product: ${currentProduct.name}`,
        );
      }

      if (matchedVariant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock. Only ${matchedVariant.stock} units are left for ${currentProduct.name}.`,
        );
      }

      freshLivePrice = matchedVariant.price || freshLivePrice;
    } else {
      if (currentProduct.globalStock < item.quantity) {
        throw new Error(
          `Insufficient stock. Only ${currentProduct.globalStock} units available for ${currentProduct.name}.`,
        );
      }
    }

    totalAmount += freshLivePrice * item.quantity;

    orderItemsSnapshot.push({
      product: currentProduct._id,
      name: currentProduct.name,
      image: currentProduct.images?.[0] || "",
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
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );

    if (!cart || cart.items.length === 0) {
      return res
        .status(400)
        .json({ message: "Checkout aborted. Your shopping cart is empty" });
    }

    const { totalAmount, itemsSnapshot } = validateAndCalculateCart(cart);

    return res.status(200).json({
      message: "Checkout summary generated successfully",
      summary: {
        items: itemsSnapshot,
        totalItemsCount: itemsSnapshot.length,
        totalAmount: totalAmount,
      },
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Checkout error" });
  }
};

export const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { shippingAddress, paymentMethod } = req.body;

    if (!paymentMethod || !["COD", "Razorpay"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: "Select a valid payment method[COD or Razorpay]" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is missing" });
    }
    const { fullName, phone, houseBuilding, streetArea, city, state, pincode } =
      shippingAddress;

    if (
      !fullName ||
      !phone ||
      !houseBuilding ||
      !streetArea ||
      !city ||
      !state ||
      !pincode
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all mandatory shipping details" });
    }

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      return res
        .status(400)
        .json({ message: "Checkout aborted. Your shopping cart is empty" });
    }

    const { totalAmount, itemsSnapshot } = validateAndCalculateCart(cart);

    const newOrder = new Order({
      user: req.user.id,
      items: itemsSnapshot,
      shippingAddress: {
        fullName,
        phone,
        address: `${houseBuilding}, ${streetArea}`,
        city,
        state,
        pincode,
      },
      totalAmount: totalAmount,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "placed",
    });

    const saveOrder = await newOrder.save({ session });

    for (let item of saveOrder.items) {
      const color = item.selectedVariant?.color;
      const size = item.selectedVariant?.size;

      if (color || size) {
        await Product.updateOne(
          {
            _id: item.product,
            "variants.size": size,
            "variants.color": color,
          },
          {
            $inc: { "variants.$.stock": -item.quantity },
          },
          { session },
        );
      } else {
        await Product.updateOne(
          {
            _id: item.product,
          },
          {
            $inc: { globalStock: -item.quantity },
          },
          { session },
        );
      }
    }

    cart.items = [];
    cart.cartSubtotal = 0;
    await cart.save({ session });
    await session.commitTransaction();
    await session.endSession();
    return res.status(201).json({
      message: "Order placed successfully. Inventory updated.",

      orderId: saveOrder._id,

      orderStatus: saveOrder.orderStatus,

      paymentStatus: saveOrder.paymentStatus,

      totalAmount: saveOrder.totalAmount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error occurred in placeOrder", error);
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res.status(400).json({
        message:
          "Malformed identifier variables sent during final purchase steps.",
      });
    }
    return res.status(500).json({
      message: "Server error finalizing your order checkout pipeline.",
    });
  }
};
