import express from "express";

const router = express.Router();

router.post("/register",(req,res)=>{
  console.log("Register for new user");
  res.status(200).json({message:"Registered"})
})

router.post("/login",(req,res)=>{
  console.log("login of the existing user");
  res.status(200).json({message:"login"})

})

router.get("/profile",(req,res)=>{
  console.log("Profile is here");
  res.status(200).json({message:"Profile"})

})

export default router;