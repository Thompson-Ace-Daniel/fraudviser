import mongoose from "mongoose";

const authAttemptSchema = new mongoose.Schema({
  bucketKey: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

export default mongoose.model("AuthAttempt", authAttemptSchema);
