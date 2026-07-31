import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  houseBuilding: {
    type: String,
    required: true,
    trim: true,
  },
  streetArea: {
    type: String,
    required: true,
    trim: true,
  },
  landmark: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    default: "India",
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  addressType: {
    type: String,
    enum: ["Home", "Office", "Hostel", "Other"],
    default: "Home",
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addresses: [addressSchema],
  },
  {
    timestamps: true,
  },
);
const User = mongoose.model("User", userSchema);

export default User;
