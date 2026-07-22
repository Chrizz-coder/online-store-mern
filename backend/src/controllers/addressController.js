import User from "../models/userModel.js";
import mongoose from "mongoose";

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

export const addAddress = async (req, res) => {
  try {
    const errorMessage = validateAddressFields(req.body);
    if (errorMessage) {
      return res.status(400).json({ message: errorMessage });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isFirstAddress = user.addresses.length === 0;

    const newAddress = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      houseBuilding: req.body.houseBuilding,
      streetArea: req.body.streetArea,
      landmark: req.body.landmark || "",
      city: req.body.city,
      state: req.body.state,
      country: req.body.country || "India",
      pincode: req.body.pincode,
      addressType: req.body.addressType || "Home",
      isDefault: isFirstAddress ? true : false, // Enforce rule dynamically
    };

    user.addresses.push(newAddress);
    await user.save();
    return res.status(201).json({ message: "Addresses added successfully." });
  } catch (error) {
    console.error("Add Address Error:", error);
    return res
      .status(500)
      .json({ message: "Server error executing address additions." });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      count: user.addresses.length,
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Get Addresses Error:", error);
    return res
      .status(500)
      .json({ message: "Server error pulling address profiles." });
  }
};

export const updateAddresses = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res
        .status(400)
        .json({ message: "Invalid address tracking identifier format." });
    }

    const errorMessage = validateAddressFields(req.body);
    if (errorMessage) return res.status(400).json({ message: errorMessage });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const addressToUpdate = user.addresses.id(addressId);
    if (!addressToUpdate) {
      return res
        .status(404)
        .json({ message: "Target address record not found." });
    }

    addressToUpdate.fullName = req.body.fullName;
    addressToUpdate.phone = req.body.phone;
    addressToUpdate.houseBuilding = req.body.houseBuilding;
    addressToUpdate.streetArea = req.body.streetArea;
    addressToUpdate.landmark = req.body.landmark || "";
    addressToUpdate.city = req.body.city;
    addressToUpdate.state = req.body.state;
    addressToUpdate.country = req.body.country || "India";
    addressToUpdate.pincode = req.body.pincode;
    addressToUpdate.addressType =
      req.body.addressType || addressToUpdate.addressType;

    await user.save();
    return res.status(200).json({
      message: "Address updated successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Update Address Error:", error);
    return res
      .status(500)
      .json({ message: "Server error modifying address fields." });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res
        .status(400)
        .json({ message: "Invalid address tracking identifier format." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const targetAddress = user.addresses.id(addressId);
    if (!targetAddress) {
      return res
        .status(404)
        .json({ message: "Target address record not found in profile." });
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
    console.error("Delete Address Error:", error);
    return res
      .status(500)
      .json({ message: "Server error removing address records." });
  }
};

export const defaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res
        .status(400)
        .json({ message: "Invalid address tracking identifier format." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    const targetAddress = user.addresses.id(addressId);
    if (!targetAddress) {
      return res
        .status(404)
        .json({ message: "Target address record not found in profile." });
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
    console.error("Set Default Address Error:", error);
    return res
      .status(500)
      .json({ message: "Server error adjusting primary default assignments." });
  }
};
