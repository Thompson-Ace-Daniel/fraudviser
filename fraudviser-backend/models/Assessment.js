import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accountRole: { type: String, enum: ["buyer", "seller"], default: "buyer", required: true },
    status: { type: String, enum: ["completed", "ai_unavailable", "ai_invalid"], default: "completed", required: true, index: true },
    schemaVersion: { type: String, default: "1.0" },
    listing: {
      productName: { type: String, required: true },
      category: { type: String, required: true },
      productType: { type: String, enum: ["goods", "service"], default: "goods" },
      brand: { type: String, default: "" },
      model: { type: String, default: "" },
      storage: { type: String, default: "" },
      condition: { type: String, enum: ["new", "used", "refurbished", "open_box", "near_expiry", "service", "unspecified"], required: true },
      price: { type: Number, default: null, min: 1 },
      seller: { type: String, default: "" },
      marketplace: { type: String, default: "" },
      url: { type: String, default: "" },
      description: { type: String, default: "" },
      observations: { type: String, default: "" },
    },

    marketEvidence: { type: mongoose.Schema.Types.Mixed, default: null },
    // Keep report flexible so both the compact current response and saved older reports load.
    report: { type: mongoose.Schema.Types.Mixed, default: null },
    assessmentError: { type: String, default: "" },

    aiAssessment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Assessment", assessmentSchema);
