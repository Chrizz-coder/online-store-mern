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
    trim: true, // Optional field, no required flag needed
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
    default: "India", // Set your preferred store default country
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

userSchema.pre("save", function (next) {
  if (this.isModified("addresses")) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault === true);
    
    // If more than one address is accidentally flagged true, keep only the latest one
    if (defaultAddresses.length > 1) {
      let foundFirstDefault = false;
      this.addresses.forEach(addr => {
        if (addr.isDefault) {
          if (!foundFirstDefault) {
            foundFirstDefault = true; // Keep the first default card true
          } else {
            addr.isDefault = false;  // Demote any extra default flags back to false
          }
        }
      });
    }
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
