import mongoose from "mongoose";

const assessmentReportSchema = new mongoose.Schema({
  listingSummary: { type: String, required: true },
  priceAssessment: { type: String, enum: ["consistent_with_evidence", "above_evidence", "below_evidence", "cannot_assess"], required: true },
  priceExplanation: { type: String, required: true },
  evidenceCoverage: { type: String, required: true },
  qualitativeConclusion: { type: String, enum: ["no_specific_warning_observed", "some_signals_need_review", "substantial_signals_need_review", "cannot_assess"], required: true },
  riskExplanation: { type: String, required: true },
  supportedFindings: [{ message: { type: String, required: true }, evidenceRefs: [{ type: String }] }],
  safetyRecommendations: [{ type: String }],
  questionsForSeller: [{ type: String }],
  verificationActions: [{ type: String }],
  missingInformation: [{ type: String }],
  limitations: [{ type: String }],
  overallConclusion: { type: String, required: true },
  suggestedNextSteps: [{ type: String }],
  priceValidation: {
    status: { type: String, enum: ["complete", "provisional", "unavailable"], required: true },
    currency: { type: String, enum: ["NGN"], required: true },
    askingPrice: { type: Number, required: true },
    meanMarketPrice: { type: Number, default: null },
    differenceAmount: { type: Number, default: null },
    percentageDifference: { type: Number, default: null },
    validIndependentSourceCount: { type: Number, required: true },
    requiredSourceCount: { type: Number, required: true },
    sources: [{ type: mongoose.Schema.Types.Mixed }],
    conditionRanges: [{ type: mongoose.Schema.Types.Mixed }],
    excludedSources: [{ type: mongoose.Schema.Types.Mixed }],
    sourceAttempts: [{ type: mongoose.Schema.Types.Mixed }],
    calculatedAt: { type: Date, default: null },
  },
  generatedAt: { type: Date, required: true },
}, { _id: false, strict: true });

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
      price: { type: Number, required: true, min: 1 },
      seller: { type: String, default: "" },
      marketplace: { type: String, default: "" },
      url: { type: String, default: "" },
      description: { type: String, default: "" },
      observations: { type: String, default: "" },
    },

    marketEvidence: { type: mongoose.Schema.Types.Mixed, default: null },
    report: { type: assessmentReportSchema, default: null },
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
