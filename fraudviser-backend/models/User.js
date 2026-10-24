import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  passwordHash: { type: String, required: true, select: false },
  passwordSalt: { type: String, required: true, select: false },
  role: { type: String, enum: ["buyer", "seller"], default: "buyer", required: true },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
