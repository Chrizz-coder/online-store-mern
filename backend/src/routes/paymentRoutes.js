import express from "express"

import { createPaymentOrder,verifyPayment } from "../controllers/paymentControllers.js"

import { protect } from "../middleware/authMiddleware.js"

const router = express.Router();
router.use(protect);

router.post("/create-order",createPaymentOrder)
router.post("/verify",verifyPayment)

export default router;