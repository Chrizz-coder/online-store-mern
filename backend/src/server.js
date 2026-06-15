import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/authRoutes.js";
const app = express();
app.use("/api/auth", router);
dotenv.config();

connectDB();
const port = process.env.PORT;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server started, running on port ${port}`);
});
