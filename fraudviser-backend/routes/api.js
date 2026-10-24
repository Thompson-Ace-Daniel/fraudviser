import { Router } from "express";
import mongoose from "mongoose";
import { Assessment, PriceRecord, createAnalysis, importPrices } from "../services/analysis.js";
import { requireAuth } from "./auth.js";
import crypto from "node:crypto";

export const apiRouter = Router();
apiRouter.use((req, res, next) => req.path === "/market-prices/import" ? next() : requireAuth(req, res, next));
apiRouter.use((req, res, next) => {
  const origin = req.get("origin");
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((item) => item.trim());
  if (req.method !== "GET" && origin && !allowedOrigins.includes(origin)) return res.status(403).json({ error: "Request origin is not allowed." });
  next();
});
apiRouter.use((_req, res, next) => mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: "Database unavailable. Configure MONGODB_URL and ensure MongoDB is running." }));

apiRouter.post("/analysis", async (req, res, next) => {
  try { res.status(201).json(await createAnalysis(req.body || {}, req.user._id, req.user.role)); } catch (error) { next(error); }
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
apiRouter.post("/market-prices/refresh", (_req, res) => res.status(503).json({ error: "No external market-data provider is configured.", message: "No external live provider is configured. Import permitted observations or run npm run seed:demo. Demo records are labelled and are not live market data." }));
