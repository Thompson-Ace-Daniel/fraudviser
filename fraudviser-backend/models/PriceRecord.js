import mongoose from "mongoose";

const priceRecordSchema = new mongoose.Schema({
  productKey: { type: String, required: true, index: true },
  productName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  brand: { type: String, trim: true, default: "" },
  model: { type: String, required: true, trim: true },
  storage: { type: String, trim: true, default: "" },
  condition: { type: String, enum: ["new", "used", "refurbished"], required: true },
  price: { type: Number, required: true, min: 1 },
  source: { type: String, required: true, trim: true },
  sourceType: { type: String, enum: ["live", "cached", "imported", "demo"], required: true },
  observedAt: { type: Date, default: null },
  retrievedAt: { type: Date, default: Date.now },
  location: { type: String, default: "Nigeria" },
  referenceId: { type: String, default: "" },
}, { timestamps: true });

priceRecordSchema.index({ productKey: 1, condition: 1 });
priceRecordSchema.index({ source: 1, referenceId: 1 }, { unique: true, sparse: true });
export default mongoose.model("PriceRecord", priceRecordSchema);

