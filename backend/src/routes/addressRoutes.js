import express from "express";

import {
  addAddress,
  getAddresses,
  updateAddresses,
  deleteAddress,
  defaultAddress,
} from "../controllers/addressController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router;
router.use(protect);

router.post("/", getAddresses);
router.get("/", getAddresses);
router.put("/:addressId", updateAddresses);
router.delete("/:addressId", deleteAddress);
router.patch("/:addressId/default", defaultAddress);

export default router;
