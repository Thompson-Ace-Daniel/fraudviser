import { Router } from "express";
import mongoose from "mongoose";
import { Assessment, PriceRecord, createAnalysis, importPrices } from "../services/analysis.js";

export const apiRouter = Router();
apiRouter.use((_req, res, next) => mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: "Database unavailable. Configure MONGODB_URL and ensure MongoDB is running." }));

apiRouter.post("/analysis", async (req, res, next) => {
  try { res.status(201).json(await createAnalysis(req.body || {})); } catch (error) { next(error); }
});
apiRouter.get("/analysis", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [items, total] = await Promise.all([Assessment.find().sort({ createdAt: -1 }).limit(limit).lean(), Assessment.countDocuments()]);
    res.json({ items, total });
  } catch (error) { next(error); }
});
apiRouter.get("/analysis/:id", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid assessment ID." });
  try { const item = await Assessment.findById(req.params.id).lean(); return item ? res.json(item) : res.status(404).json({ error: "Assessment not found." }); } catch (error) { return next(error); }
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
  try { res.status(201).json(await importPrices(req.body?.records, req.body?.metadata || {})); } catch (error) { next(error); }
});
apiRouter.post("/market-prices/refresh", (_req, res) => res.status(503).json({ error: "No external market-data provider is configured.", message: "No external live provider is configured. Import permitted observations or run npm run seed:demo. Demo records are labelled and are not live market data." }));
