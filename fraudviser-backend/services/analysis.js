import crypto from "node:crypto";
import PriceRecord from "../models/PriceRecord.js";
import Assessment from "../models/Assessment.js";
import { generateListingAdvice } from "../gemini.js";
import { independentDomain, MARKET_CONDITIONS, REQUIRED_MARKET_SOURCES } from "./market-data.js";

const normalize = (value = "") => value.toString().trim().toLowerCase().replace(/\s+/g, " ");
export const makeProductKey = ({ category, brand, model, storage, condition }) =>
  [category, brand, model || "", storage || "", condition].map(normalize).join("|");

export function validateListingInput(input = {}) {
  const productName = typeof input.productName === "string" ? input.productName.trim() : "";
  if (productName.length < 5 || productName.length > 1200) { const error = new Error("Describe the product or service in at least 5 characters."); error.status = 400; throw error; }
  const price = input.price == null || String(input.price).trim() === "" ? null : Number(input.price);
  if (price !== null && (!Number.isFinite(price) || price <= 0 || price > 1_000_000_000)) { const error = new Error("Price must be a positive amount in Nigerian naira."); error.status = 400; throw error; }
  if (price !== null && input.currency && String(input.currency).toUpperCase() !== "NGN") { const error = new Error("Only NGN listings are supported until a reliable exchange-rate source is configured."); error.status = 400; throw error; }
  const condition = input.condition || "unspecified";
  if (!["new", "used", "refurbished", "open_box", "near_expiry", "service", "unspecified"].includes(condition)) { const error = new Error("The listing condition is not supported."); error.status = 400; throw error; }
  if (input.url) {
    try { const url = new URL(input.url); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch { const error = new Error("Listing URL must be a valid http or https URL."); error.status = 400; throw error; }
  }
  return {
    productName: productName.slice(0, 240),
    category: String(input.category || "Marketplace listing").trim().slice(0, 120),
    productType: input.productType === "service" ? "service" : "goods",
    brand: String(input.brand || "").trim().slice(0, 100),
    model: String(input.model || "").trim().slice(0, 180),
    storage: String(input.storage || "").trim().slice(0, 100),
    condition,
    price,
    currency: "NGN",
    seller: String(input.seller || "").trim().slice(0, 180),
    marketplace: String(input.marketplace || "").trim().slice(0, 160),
    url: String(input.url || "").trim().slice(0, 2000),
    description: String(input.description || input.productName || "").trim().slice(0, 1200),
    observations: String(input.observations || "").trim().slice(0, 1500),
  };
}

function publicAssessmentError(aiResult) {
  const reason = String(aiResult?.reason || "").toLowerCase();
  if (reason.includes("not configured") || reason.includes("api key")) return "AI advice is not configured. Add GEMINI_API_KEY to the backend environment, then retry this assessment.";
  if (reason.includes("quota") || reason.includes("rate limit") || reason.includes("429")) return "The AI service is at capacity. Your listing is saved; retry this assessment shortly.";
  if (reason.includes("timeout") || reason.includes("timed out") || reason.includes("deadline")) return "The AI review took too long. Your listing is saved; retry this assessment.";
  if (aiResult?.invalid) return "The AI returned an incomplete recommendation. Your listing is saved; retry this assessment.";
  return "AI advice could not be generated. Your listing is saved; retry this assessment shortly.";
}

export function buildConditionRangeQuery(identityQueries, { freshSince, now } = {}) {
  const since = freshSince || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const current = now || new Date();
  return {
    $and: [
      { $or: identityQueries },
      { $or: [{ observedAt: null }, { observedAt: { $gte: since, $lte: current } }] },
    ],
    condition: { $in: MARKET_CONDITIONS },
    sourceType: { $in: ["live", "imported"] },
    sourceUrl: /^https:\/\//i,
    sourceDomain: { $ne: "" },
    currency: "NGN",
    country: /^nigeria$/i,
    availability: "available",
    matchType: "exact",
    retrievedAt: { $gte: since },
  };
}

async function loadMarketReference(listing) {
  if (!listing.productName || listing.condition === "unspecified") return null;
  const now = new Date();
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const exactName = new RegExp(`^${listing.productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const records = await PriceRecord.find({
    productName: exactName,
    condition: listing.condition,
    sourceType: { $in: ["live", "imported"] },
    sourceUrl: /^https:\/\//i,
    sourceDomain: { $nin: ["", null] },
    currency: "NGN",
    country: /^nigeria$/i,
    availability: "available",
    matchType: "exact",
    priceIncludesCharges: true,
    retrievedAt: { $gte: since },
    $or: [{ observedAt: null }, { observedAt: { $gte: since, $lte: now } }],
  }).sort({ retrievedAt: -1 }).limit(100).lean();
  const seenDomains = new Set();
  const independent = records.filter((record) => {
    const domain = independentDomain(record.sourceUrl);
    if (!domain || seenDomains.has(domain)) return false;
    seenDomains.add(domain);
    return Number.isFinite(Number(record.price)) && Number(record.price) > 0;
  });
  if (independent.length < 2) return null;
  const prices = independent.map((record) => Number(record.price));
  const meanPrice = Number((prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2));
  const differenceAmount = listing.price == null ? null : Number((listing.price - meanPrice).toFixed(2));
  return {
    source: "trusted_records",
    condition: listing.condition,
    currency: "NGN",
    sourceCount: independent.length,
    meanPrice,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    differenceAmount,
    percentageDifference: differenceAmount == null ? null : Number(((differenceAmount / meanPrice) * 100).toFixed(2)),
    calculatedAt: now,
  };
}

export async function createAnalysis(input, userId, userRole = "buyer", dependencies = {}) {
  const listing = validateListingInput(input);
  const marketEvidence = await loadMarketReference(listing).catch(() => null);
  const ai = dependencies.generateAssessment || generateListingAdvice;
  const assessment = await Assessment.create({
    userId,
    accountRole: userRole,
    status: "ai_unavailable",
    schemaVersion: "3.0",
    listing,
    marketEvidence,
    report: null,
    assessmentError: "Preparing your listing recommendation.",
  });
  const aiResult = await ai({ listing, userRole }).catch((error) => ({ available: false, reason: error?.message || "AI assessment is unavailable." }));
  if (!aiResult?.available || !aiResult.report) {
    console.error("AI assessment unavailable:", aiResult?.reason || "unknown provider error");
    assessment.assessmentError = publicAssessmentError(aiResult);
    assessment.status = aiResult?.invalid ? "ai_invalid" : "ai_unavailable";
    await assessment.save();
    return { ...assessment.toObject(), userId: undefined };
  }
  assessment.status = "completed";
  assessment.schemaVersion = "3.0";
  assessment.report = aiResult.report;
  assessment.assessmentError = "";
  assessment.aiAssessment = { model: aiResult.model, schemaVersion: aiResult.schemaVersion, generatedAt: aiResult.report.generatedAt };
  await assessment.save();
  const result = assessment.toObject();
  delete result.userId;
  return result;
}

export async function retryAnalysis(assessment, userRole = "buyer", ai = generateListingAdvice) {
  const aiResult = await ai({ listing: assessment.listing, userRole });
  if (!aiResult?.available || !aiResult.report) {
    console.error("AI assessment retry unavailable:", aiResult?.reason || "unknown provider error");
    assessment.assessmentError = publicAssessmentError(aiResult);
    await assessment.save();
    return { available: false, status: aiResult?.invalid ? "ai_invalid" : "ai_unavailable" };
  }
  assessment.status = "completed";
  assessment.schemaVersion = "3.0";
  assessment.report = aiResult.report;
  assessment.assessmentError = "";
  assessment.aiAssessment = { model: aiResult.model, schemaVersion: aiResult.schemaVersion, generatedAt: aiResult.report.generatedAt };
  await assessment.save();
  return { available: true, assessment };
}

export async function importPrices(rows, { source = "Trusted import", sourceType = "imported" } = {}) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) { const error = new Error("Provide between 1 and 2,000 price records."); error.status = 400; throw error; }
  if (!["live", "cached", "imported"].includes(sourceType)) { const error = new Error("Imported observations must identify their source type."); error.status = 400; throw error; }
  const normalized = rows.map((row, index) => {
    const price = Number(row.price);
    const url = String(row.sourceUrl || "");
    let validUrl = false;
    try { validUrl = new URL(url).protocol === "https:"; } catch { /* Invalid source links are rejected below. */ }
    const currency = String(row.currency || "NGN").toUpperCase();
    const item = { ...row, price, currency, country: String(row.country || "Nigeria"), source: String(row.source || source).trim(), sourceType,
      sourceUrl: url, sourceDomain: String(row.sourceDomain || independentDomain(url)), observedAt: row.observedAt ? new Date(row.observedAt) : null,
      referenceId: String(row.referenceId || crypto.createHash("sha256").update(url.toLowerCase()).digest("hex")) };
    if (!item.productName || !item.category || !validUrl || !item.sourceDomain || currency !== "NGN" || item.country.toLowerCase() !== "nigeria" || !["new", "used", "refurbished", "open_box", "near_expiry", "service"].includes(item.condition) || !Number.isFinite(price) || price <= 0 || row.availability !== "available" || row.priceIncludesCharges !== true || row.matchType !== "exact" || (item.observedAt && Number.isNaN(item.observedAt.getTime()))) {
      const error = new Error(`Record ${index + 1} requires an exact Nigeria NGN offer, HTTPS source, confirmed availability, and a total payable price.`); error.status = 400; throw error;
    }
    if (item.observedAt && item.observedAt > new Date()) { const error = new Error(`Record ${index + 1} has a future observation date.`); error.status = 400; throw error; }
    item.productKey = makeProductKey(item); item.retrievedAt = new Date();
    return item;
  });
  const ops = normalized.map((item) => ({ updateOne: { filter: { source: item.source, referenceId: item.referenceId }, update: { $set: item }, upsert: true } }));
  const result = await PriceRecord.bulkWrite(ops, { ordered: true });
  return { received: normalized.length, inserted: result.upsertedCount, updated: result.modifiedCount };
}

export { Assessment, PriceRecord };
