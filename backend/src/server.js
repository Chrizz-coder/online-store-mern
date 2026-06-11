import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
const app = express();
dotenv.config();

connectDB();
const port = process.env.PORT;

app.get('/',(req,res)=>{
  res.send("Hello World");
})

app.listen(port,()=>{
  console.log(`Server started, running on port ${port}`);
})

