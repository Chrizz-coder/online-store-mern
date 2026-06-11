import mongoose from 'mongoose';
 
const connectDB = async () =>{
  try{
    await mongoose.connect(process.env.MOGODB_URL);
    console.log("MongoDB connected");
    
  }
  catch(error){
    console.error("Database connection failed");
    process.exit(1);
    
  }
};

export default connectDB;