import express from "express";
import {  registerUser,loginUser} from "../controllers/authController.js";
const router = express.Router();

router.post("/register", registerUser);

router.post("/login",loginUser);

router.get("/profile",(req,res)=>{
  console.log("Profile is here");
  res.status(200).json({message:"Profile"})

})

export default router;