import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        throw new ApiError(401, "User no longer exists.");
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error instanceof ApiError) return next(error);
      return next(new ApiError(401, "Not authorized. Token validation failed."));
    }
  }

  if (!token) {
    return next(new ApiError(401, "Not authorized. No token provided."));
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return next(new ApiError(403, "Access denied. Admins only."));
};
