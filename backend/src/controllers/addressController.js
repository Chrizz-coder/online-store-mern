import User from "../models/userModel.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import { requireString } from "../utils/validators.js";

// Validates primitive types for all address text fields.
// Runs before the presence checks so objects/arrays are rejected early.
const requireAddressTypes = (body) => {
  requireString(body.fullName, "Full name");
  requireString(body.phone, "Phone");
  requireString(body.houseBuilding, "House/building");
  requireString(body.streetArea, "Street/area");
  requireString(body.landmark, "Landmark");
  requireString(body.city, "City");
  requireString(body.state, "State");
  requireString(body.country, "Country");
  requireString(body.pincode, "Pincode");
  requireString(body.addressType, "Address type");
};

const validateAddressFields = (body) => {
  const { fullName, phone, houseBuilding, streetArea, city, state, pincode } =
    body;
  if (
    !fullName ||
    !phone ||
    !houseBuilding ||
    !streetArea ||
    !city ||
    !state ||
    !pincode
  ) {
    return "Please provide all required address fields.";
  }
  return null;
};

export const addAddress = async (req, res, next) => {
  try {
    requireAddressTypes(req.body);
    const errorMessage = validateAddressFields(req.body);
    if (errorMessage) {
      throw new ApiError(400, errorMessage);
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");

    const isFirstAddress = user.addresses.length === 0;

    const newAddress = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      houseBuilding: req.body.houseBuilding,
      streetArea: req.body.streetArea,
      landmark: req.body.landmark ?? "",
      city: req.body.city,
      state: req.body.state,
      country: req.body.country ?? "India",
      pincode: req.body.pincode,
      addressType: req.body.addressType ?? "Home",
      isDefault: isFirstAddress,
    };

    user.addresses.push(newAddress);
    await user.save();
    const address = user.addresses[user.addresses.length - 1];

    return res.status(201).json({
      message: "Address added successfully.",
      address,
      count: user.addresses.length,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");

    return res.status(200).json({
      count: user.addresses.length,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddresses = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new ApiError(400, "Invalid address identifier format.");
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");

    const addressToUpdate = user.addresses.id(addressId);
    if (!addressToUpdate) {
      throw new ApiError(404, "Address not found.");
    }

    requireAddressTypes(req.body);

    addressToUpdate.fullName = req.body.fullName ?? addressToUpdate.fullName;
    addressToUpdate.phone = req.body.phone ?? addressToUpdate.phone;
    addressToUpdate.houseBuilding =
      req.body.houseBuilding ?? addressToUpdate.houseBuilding;
    addressToUpdate.streetArea =
      req.body.streetArea ?? addressToUpdate.streetArea;
    addressToUpdate.landmark = req.body.landmark ?? addressToUpdate.landmark;
    addressToUpdate.city = req.body.city ?? addressToUpdate.city;
    addressToUpdate.state = req.body.state ?? addressToUpdate.state;
    addressToUpdate.country = req.body.country ?? addressToUpdate.country;
    addressToUpdate.pincode = req.body.pincode ?? addressToUpdate.pincode;
    addressToUpdate.addressType =
      req.body.addressType ?? addressToUpdate.addressType;

    await user.save();
    return res.status(200).json({
      message: "Address updated successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new ApiError(400, "Invalid address identifier format.");
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");

    const targetAddress = user.addresses.id(addressId);
    if (!targetAddress) {
      throw new ApiError(404, "Address not found.");
    }

    const wasDefault = targetAddress.isDefault;

    user.addresses.pull({ _id: addressId });

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return res.status(200).json({
      message: "Address deleted successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

export const defaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new ApiError(400, "Invalid address identifier format.");
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found.");

    const targetAddress = user.addresses.id(addressId);
    if (!targetAddress) {
      throw new ApiError(404, "Address not found.");
    }

    user.addresses.forEach((address) => {
      address.isDefault = false;
    });

    targetAddress.isDefault = true;
    await user.save();

    return res.status(200).json({
      message: "Default address updated successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};
