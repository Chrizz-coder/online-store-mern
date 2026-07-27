import jwt from "jsonwebtoken";

const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured!");
  }
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "2d",
  });
};

export default generateToken;
