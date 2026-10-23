import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    listing: {
      productName: { type: String, required: true },
      category: { type: String, required: true },
      brand: { type: String, default: "" },
      model: { type: String, default: "" },
      storage: { type: String, default: "" },
      condition: { type: String, required: true },
      price: { type: Number, required: true, min: 1 },
      seller: { type: String, default: "" },
      marketplace: { type: String, default: "" },
      url: { type: String, default: "" },
      description: { type: String, default: "" },
      observations: { type: String, default: "" },
    },

    priceAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    risk: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

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
