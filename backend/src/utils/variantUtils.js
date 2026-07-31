import mongoose from "mongoose";

export const isObjectId = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

export const getRequestedVariantId = ({ variantId, selectedVariant }) =>
  variantId ?? selectedVariant?.variantId ?? selectedVariant?._id;

export const hasVariantAttributes = (selectedVariant) =>
  selectedVariant &&
  (Object.hasOwn(selectedVariant, "color") ||
    Object.hasOwn(selectedVariant, "size"));

export const getVariantByAttributes = (variants, selectedVariant) =>
  variants.find(
    (variant) =>
      variant.color === selectedVariant.color &&
      variant.size === selectedVariant.size,
  );
