import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
const userRoutes = express.userRoutes();

userRoutes.post("/register", registerUser);

userRoutes.post("/login", loginUser);

userRoutes.get("/profile", protect, (req, res) => {
  res.status(200).json(req.user);
});

export default userRoutes;
