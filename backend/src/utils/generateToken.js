import jwt from "jsonwebtoken";

const generateToken = (userId,role) =>{

  return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2d" },
    );
  };

export default generateToken;