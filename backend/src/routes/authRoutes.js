import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);

router.post("/login", authLimiter, loginUser);

router.get("/profile", protect, (req, res) => {
  res.status(200).json(req.user);
});

export default router;
