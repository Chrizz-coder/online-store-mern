import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MOGODB_URL;

  if (!mongoUri) {
    console.error(
      "MongoDB Connection Error: No database URI provided. Set MONGODB_URI in environment variables.",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
