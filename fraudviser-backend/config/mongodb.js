import mongoose from "mongoose";
import { DATABASE_URL } from "../constants/utils.js";

export async function connectDB() {
  if (!DATABASE_URL) throw new Error("MONGODB_URL is not configured");
  return mongoose.connect(DATABASE_URL, { serverSelectionTimeoutMS: 50000 });
}
