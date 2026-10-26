import { Router } from "express";
import mongoose from "mongoose";
import { Assessment, PriceRecord, createAnalysis, importPrices, retryAnalysis } from "../services/analysis.js";
import { requireAuth } from "./auth.js";
import crypto from "node:crypto";
import AssessmentFeedback from "../models/AssessmentFeedback.js";
import { requireDatabase } from "../middleware/database.js";
import { enforceAllowedOrigin } from "../middleware/security.js";

export const apiRouter = Router();
apiRouter.use((req, res, next) => req.path === "/market-prices/import" ? next() : requireAuth(req, res, next));
apiRouter.use(enforceAllowedOrigin);
apiRouter.use(requireDatabase);

apiRouter.post("/analysis", async (req, res, next) => {
  try {
    const result = await createAnalysis(req.body || {}, req.user._id, req.user.role);
    res.status(result.status === "completed" ? 201 : 202).json(result);
  } catch (error) { next(error); }
});
apiRouter.get("/analysis", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [items, total] = await Promise.all([Assessment.find({ userId: req.user._id }).select("-userId").sort({ createdAt: -1 }).limit(limit).lean(), Assessment.countDocuments({ userId: req.user._id })]);
    res.json({ items, total });
  } catch (error) { next(error); }
});
apiRouter.get("/analysis/:id", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid assessment ID." });
  try { const item = await Assessment.findOne({ _id: req.params.id, userId: req.user._id }).select("-userId").lean(); return item ? res.json(item) : res.status(404).json({ error: "Assessment not found." }); } catch (error) { return next(error); }
});
apiRouter.post("/analysis/:id/retry", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid assessment ID." });
  try {
    const item = await Assessment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ error: "Assessment not found." });
    if (item.status === "completed" && item.report) return res.status(409).json({ error: "This assessment is already complete." });
    const retry = await retryAnalysis(item, req.user.role);
    const result = item.toObject();
    delete result.userId;
    return res.status(retry.available ? 200 : 503).json(retry.available ? result : { error: "The AI assessment is still unavailable. Your collected source evidence remains saved.", assessment: result });
  } catch (error) { return next(error); }
});
apiRouter.post("/analysis/:id/feedback", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid assessment ID." });
  const allowed = ["pricing", "source_match", "analysis", "missing_information", "other"];
  const category = String(req.body?.category || "");
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!allowed.includes(category) || message.length < 8 || message.length > 2000) return res.status(400).json({ error: "Choose a feedback topic and enter 8 to 2,000 characters." });
  try {
    const belongsToUser = await Assessment.exists({ _id: req.params.id, userId: req.user._id });
    if (!belongsToUser) return res.status(404).json({ error: "Assessment not found." });
    const feedback = await AssessmentFeedback.create({ userId: req.user._id, assessmentId: req.params.id, category, message });
    res.status(201).json({ id: String(feedback._id), received: true });
  } catch (error) { next(error); }
});
apiRouter.get("/market-prices", async (req, res, next) => {
  try {
    const query = {};
    for (const field of ["category", "model", "condition"]) if (req.query[field]) query[field] = new RegExp(`^${String(req.query[field]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const [items, total] = await Promise.all([PriceRecord.find(query).sort({ retrievedAt: -1 }).limit(100).lean(), PriceRecord.countDocuments(query)]);
    res.json({ items, total, sourceTypes: [...new Set(items.map((item) => item.sourceType))], lastUpdated: items[0]?.retrievedAt || null });
  } catch (error) { next(error); }
});
apiRouter.post("/market-prices/import", async (req, res, next) => {
  const configuredToken = process.env.MARKET_IMPORT_TOKEN || "";
  const suppliedToken = req.get("x-market-import-token") || "";
  if (!configuredToken || suppliedToken.length !== configuredToken.length || !crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(configuredToken))) return res.status(403).json({ error: "Market data imports are not enabled for this account." });
  try { res.status(201).json(await importPrices(req.body?.records, req.body?.metadata || {})); } catch (error) { next(error); }
});
apiRouter.post("/market-prices/refresh", (_req, res) => res.status(409).json({ error: "Market searches are listing-specific.", message: "Submit a listing analysis to search the independent Nigeria marketplaces and attach source evidence to that assessment." }));
