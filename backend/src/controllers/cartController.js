import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import ApiError from "../utils/ApiError.js";
import { requireObjectId, requireInteger, requireString } from "../utils/validators.js";

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, selectedVariant } = req.body;
    const qty = quantity ?? 1;

    requireObjectId(productId, "Product ID");
    requireInteger(qty, "Quantity");

    const color = selectedVariant?.color;
    const size = selectedVariant?.size;

    requireString(color, "Color");
    requireString(size, "Size");

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ApiError(400, "Quantity must be a positive integer.");
    }

    const color = selectedVariant?.color;
    const size = selectedVariant?.size;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, "Product not found or unavailable.");
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.selectedVariant?.color === color &&
        item.selectedVariant?.size === size,
    );

    const existingQtyInCart = existingItem ? existingItem.quantity : 0;
    let finalItemPrice = product.salePrice || product.basePrice;

    if (product.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );

      if (!matchedVariant) {
        throw new ApiError(400, "Selected variant not found.");
      }

      finalItemPrice = matchedVariant.price || finalItemPrice;

      if (matchedVariant.stock < existingQtyInCart + qty) {
        throw new ApiError(400, "Insufficient stock for requested quantity.");
      }
    } else {
      if (product.globalStock < existingQtyInCart + qty) {
        throw new ApiError(400, "Insufficient stock for requested quantity.");
      }
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.selectedVariant?.color === color &&
        item.selectedVariant?.size === size,
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += qty;
      cart.items[existingItemIndex].priceAtTimeOfAdding = finalItemPrice;
    } else {
      cart.items.push({
        product: productId,
        quantity: qty,
        selectedVariant: { color, size },
        priceAtTimeOfAdding: finalItemPrice,
      });
    }

    await cart.save();
    return res.status(200).json({
      message: "Item added to cart successfully.",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

export const viewCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
      return res.status(200).json(cart);
    }

    let cartDataChanged = false;
    let verifiedItemsList = [];

    for (let item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        cartDataChanged = true;
        continue;
      }

      let freshPrice = product.salePrice || product.basePrice;
      let freshStock = product.globalStock;
      const color = item.selectedVariant?.color;
      const size = item.selectedVariant?.size;

      if (product.variants && product.variants.length > 0) {
        const matchedVariant = product.variants.find(
          (v) => (!color || v.color === color) && (!size || v.size === size),
        );

        if (matchedVariant) {
          freshPrice = matchedVariant.price || freshPrice;
          freshStock = matchedVariant.stock;
        } else {
          cartDataChanged = true;
          continue;
        }
      }

      if (item.priceAtTimeOfAdding !== freshPrice) {
        item.priceAtTimeOfAdding = freshPrice;
        cartDataChanged = true;
      }

      if (freshStock === 0) {
        cartDataChanged = true;
      } else if (freshStock < item.quantity) {
        item.quantity = freshStock;
        cartDataChanged = true;
      }

      verifiedItemsList.push(item);
    }

    if (cartDataChanged) {
      cart.items = verifiedItemsList;
      await cart.save();
    }

    return res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

export const updateCartQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, selectedVariant } = req.body;
    const color = selectedVariant?.color;
    const size = selectedVariant?.size;

    requireInteger(quantity, "Quantity");
    requireString(color, "Color");
    requireString(size, "Size");

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ApiError(400, "Quantity must be a valid non-negative integer.");
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      throw new ApiError(404, "Cart not found.");
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.selectedVariant?.color === color &&
        item.selectedVariant?.size === size,
    );

    if (itemIndex === -1) {
      throw new ApiError(404, "Item not found in cart.");
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, "Product not found or unavailable.");
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return res.status(200).json({ message: "Item removed from cart.", cart });
    }

    if (product.variants && product.variants.length > 0) {
      const matchedVariant = product.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );
      if (!matchedVariant) {
        throw new ApiError(400, "Selected variant not found.");
      }
      if (matchedVariant.stock < quantity) {
        throw new ApiError(
          400,
          `Only ${matchedVariant.stock} units available in stock.`,
        );
      }
    } else {
      if (product.globalStock < quantity) {
        throw new ApiError(
          400,
          `Only ${product.globalStock} units available in stock.`,
        );
      }
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return res.status(200).json({ message: "Cart quantity updated.", cart });
  } catch (error) {
    next(error);
  }
};

export const deleteCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { selectedVariant } = req.body;
    const color = selectedVariant?.color;
    const size = selectedVariant?.size;

    requireString(color, "Color");
    requireString(size, "Size");

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      throw new ApiError(404, "Cart not found.");
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.selectedVariant?.color === color &&
        item.selectedVariant?.size === size,
    );

    if (itemIndex === -1) {
      throw new ApiError(404, "Item not found in cart.");
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    return res.status(200).json({ message: "Item removed from cart.", cart });
  } catch (error) {
    next(error);
  }
};
