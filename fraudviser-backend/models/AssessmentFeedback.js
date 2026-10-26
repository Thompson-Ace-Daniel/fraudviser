import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true, index: true },
  category: { type: String, enum: ["pricing", "source_match", "analysis", "missing_information", "other"], required: true },
  message: { type: String, required: true, trim: true, minlength: 8, maxlength: 2000 },
  status: { type: String, enum: ["new", "reviewed", "resolved"], default: "new", required: true },
}, { timestamps: true });

feedbackSchema.index({ assessmentId: 1, userId: 1, createdAt: -1 });
export default mongoose.model("AssessmentFeedback", feedbackSchema);
