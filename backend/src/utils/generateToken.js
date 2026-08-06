import jwt from "jsonwebtoken";
import env from "../config/env.js";

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, env.JWT_SECRET, {
    expiresIn: "2d",
  });
};

export default generateToken;
