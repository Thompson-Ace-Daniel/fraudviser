import mongoose from "mongoose";
import { DATABASE_URL } from "../constants/utils.js";

export async function connectDB() {
  try {
    if (DATABASE_URL) {
      await mongoose.connect(DATABASE_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log("MongoDB connection established");
    } else {
      console.warn(
        "DATABASE_URL is not configured; running without DB connection.",
      );
    }
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}