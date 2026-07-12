import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, selectedVariant } = req.body;
    const qty = quantity ?? 1;

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: "quantity is invalid" });
    }
    const color = selectedVariant?.color;
    const size = selectedVariant?.size;

    const currentProduct = await Product.findById(productId);
    if (!currentProduct || !currentProduct.isActive) {
      return res
        .status(404)
        .json({ message: "Product not found product ,unavailable." });
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
    let finalItemPrice = currentProduct.salePrice || currentProduct.basePrice;

    if (currentProduct.variants && currentProduct.variants.length > 0) {
      const matchedVariant = currentProduct.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );

      if (!matchedVariant) {
        return res
          .status(400)
          .json({ message: "The specified variant does not exits." });
      }
      finalItemPrice = matchedVariant.price || finalItemPrice;

      if (matchedVariant.stock < existingQtyInCart + qty) {
        return res
          .status(400)
          .json({ message: "Cannot add more units, insufficient stock " });
      }
    } else {
      if (currentProduct.globalStock < existingQtyInCart + qty) {
        return res
          .status(400)
          .json({ message: "Cannot add more units, insufficient stock " });
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
      message: "Item added to your shopping cart successfully.",
      cart,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);

    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format provided." });
    }

    return res
      .status(500)
      .json({ message: "Server error processing your add-to-cart request." });
  }
};

export const viewCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product",
    );
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
      return res.status(200).json(cart);
    }
    let cartDataChanged = false;

    let verifiedItemsList = [];
    for (let item of cart.items) {
      const currentProduct = item.product;
      if (!currentProduct || !currentProduct.isActive) {
        cartDataChanged = true;

        continue;
      }
      let freshLivePrice = currentProduct.salePrice || currentProduct.basePrice;
      let freshLiveStock = currentProduct.globalStock;
      const color = item.selectedVariant?.color;
      const size = item.selectedVariant?.size;

      if (currentProduct.variants && currentProduct.variants.length > 0) {
        const matchedVariant = currentProduct.variants.find(
          (v) => (!color || v.color === color) && (!size || v.size === size),
        );

        if (matchedVariant) {
          freshLivePrice = matchedVariant.price || freshLivePrice;
          freshLiveStock = matchedVariant.stock;
        } else {
          cartDataChanged = true;
          continue;
        }
      }

      if (item.priceAtTimeOfAdding !== freshLivePrice) {
        item.priceAtTimeOfAdding = freshLivePrice;
        cartDataChanged = true;
      }

      if (freshLiveStock === 0) {
        cartDataChanged = true;
      } else if (freshLiveStock < item.quantity) {
        item.quantity = freshLiveStock;
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
    console.error("Fetch Cart Sync Error:", error);
    return res
      .status(500)
      .json({ message: "Server error pulling synchronized cart listings." });
  }
};

export const updateCartQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, selectedVariant } = req.body;
    const color = selectedVariant?.color;
    const size = selectedVariant?.size;

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be a valid positive integer." });
    }
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Shopping cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.selectedVariant?.color === color &&
        item.selectedVariant?.size === size,
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ message: " Target item not founded in your cart." });
    }
    const currentProduct = await Product.findById(productId);
    if (!currentProduct || !currentProduct.isActive) {
      return res.status(404).json({
        message: "Product is currently unavailable on store shelves.",
      });
    }
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return res
        .status(200)
        .json({ message: "Item removed from the cart successfully", cart });
    }

    if (currentProduct.variants && currentProduct.variants.length > 0) {
      const matchedVariant = currentProduct.variants.find(
        (v) => (!color || v.color === color) && (!size || v.size === size),
      );
      if (!matchedVariant) {
        return res
          .status(400)
          .json({ message: "Selected variant profile is unavailable." });
      }
      if (matchedVariant.stock < quantity) {
        return res.status(400).json({
          message: ` Cannot increase quantity. Only ${matchedVariant.stock} units are left in the warehouse`,
        });
      }
    } else {
      if (currentProduct.globalStock < quantity) {
        return res.status(400).json({
          message: ` Cannot increase quantity. Only ${currentProduct.globalStock} units are left in the warehouse`,
        });
      }
    }

    cart.items[itemIndex].quantity = quantity;

    await cart.save();
    return res
      .status(200)
      .json({ message: " Cart quantity updated successfully", cart });
  } catch (error) {
    console.error("Updating cart quantity error:", error);
    return res
      .status(500)
      .json({ message: " Server error updating cart values" });
  }
};

export const deleteCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { selectedVariant } = req.body;
    const { color } = selectedVariant?.color;
    const { size } = selectedVariant?.size;

    const cart = await Cart.findOne({ user: user.req.id });
    if (!cart) {
      return res.status(404).json({ message: "Shopping cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => {
      item.product.toString() === productId &&
        item.selectedVariant?.color === color &&
        item.selectedVariant?.size === size;
    });

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Target item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    await cart.save();
    return res
      .status(200)
      .json({ message: "Item removed from the cart successfully", cart });
  } catch (error) {
    console.error("Remove cart item error", error);
    if (error.name === "CastError" || error.kind === "ObjectId") {
      return res
        .status(400)
        .json({ message: "Invalid product identifier format." });
    }

    return res
      .status(500)
      .json({ message: "Server error executing item row removal." });
  }
};
