import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req,res) =>{
  try {
    const {name,email,password} = req.body;

    if(!name || !email || !password){
      return res.status(400).json({message:"Please enter all required field"});
    }

    const userExists = await User.findOne({email});
    if(userExists){
      return res.status(409).json({message:"User already exists with the same email"});
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);

    const newUser = new User({
      name,
      email,
      password:hashedPassword
    });

    await newUser.save();

    if(!process.env.JWT_SECRET){
      throw new Error("JWT_SECRET not configured!");
      
    }
    
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role},
      process.env.JWT_SECRET,
      { expiresIn:'2d'}
    
    );
  
    return res.status(201).json({
      message:"User registered successfully",
      token,
      user:{
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.log("Registration error ",error);
    return res.status(500).json({ message:"Server error, please try again."})
    
  }
}

