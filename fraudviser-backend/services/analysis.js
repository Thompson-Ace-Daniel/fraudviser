import crypto from "node:crypto";
import PriceRecord from "../models/PriceRecord.js";
import Assessment from "../models/Assessment.js";
import { collectMarketSearches, extractListingDetails, generateUnifiedAssessment } from "../gemini.js";
import { buildPriceBenchmark, independentDomain, MARKET_CONDITIONS, MARKET_SITES, REQUIRED_MARKET_SOURCES, summarizeConditionRanges } from "./market-data.js";

const normalize = (value = "") => value.toString().trim().toLowerCase().replace(/\s+/g, " ");
export const makeProductKey = ({ category, brand, model, storage, condition }) =>
  [category, brand, model || "", storage || "", condition].map(normalize).join("|");

export function validateListingInput(input = {}) {
  const productName = typeof input.productName === "string" ? input.productName.trim() : "";
  if (productName.length < 5 || productName.length > 1200) { const error = new Error("Describe the product or service in at least 5 characters."); error.status = 400; throw error; }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000_000) { const error = new Error("Price must be a positive amount in Nigerian naira."); error.status = 400; throw error; }
  if (input.currency && String(input.currency).toUpperCase() !== "NGN") { const error = new Error("Only NGN listings are supported until a reliable exchange-rate source is configured."); error.status = 400; throw error; }
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

function storedEvidence(benchmark) {
  return {
    provider: "Gemini Google Search grounding",
    status: benchmark.status,
    requiredSourceCount: REQUIRED_MARKET_SOURCES,
    usableSourceCount: benchmark.usableSourceCount,
    currency: benchmark.currency,
    meanPrice: benchmark.meanPrice,
    differenceAmount: benchmark.differenceAmount,
    percentageDifference: benchmark.percentageDifference,
    observations: benchmark.observations,
    conditionRanges: benchmark.conditionRanges || [],
    excluded: benchmark.excluded,
    attempts: benchmark.attempts,
    calculatedAt: benchmark.calculatedAt,
  };
}

function publicAssessmentError(aiResult) {
  const reason = String(aiResult?.reason || "").toLowerCase();
  if (reason.includes("not configured") || reason.includes("api key")) return "AI advice is not configured. Add GEMINI_API_KEY to the backend environment, then retry this assessment.";
  if (reason.includes("quota") || reason.includes("rate limit") || reason.includes("429")) return "The AI service is at capacity. Your listing and market evidence are saved; retry this assessment shortly.";
  if (reason.includes("timeout") || reason.includes("timed out") || reason.includes("deadline")) return "The AI review took too long to finish. Your listing and market evidence are saved; retry this assessment.";
  if (aiResult?.invalid) return "The AI service returned a report that did not pass evidence checks. Your listing and market evidence are saved; retry this assessment.";
  return "AI advice could not be generated. Your listing and market evidence are saved; retry this assessment shortly.";
}

async function saveMarketObservations(listing, observations) {
  if (!observations.length) return;
  const operations = observations.map((item) => ({ updateOne: {
    filter: { source: item.sourceDomain, referenceId: item.referenceId },
    update: { $set: {
      productKey: makeProductKey({ category: listing.category, brand: item.brand, model: item.model, storage: item.storage, condition: item.condition }),
      productName: item.productName,
      title: item.title,
      category: listing.category,
      brand: item.brand,
      model: item.model,
      storage: item.storage,
      condition: item.condition,
      price: item.price,
      currency: "NGN",
      country: "Nigeria",
      seller: item.seller,
      source: item.sourceDomain,
      sourceUrl: item.sourceUrl,
      sourceDomain: item.sourceDomain,
      sourceType: "live",
      availability: "available",
      priceIncludesCharges: true,
      promotional: item.promotional,
      matchType: "exact",
      observedAt: item.observedAt,
      retrievedAt: item.retrievedAt,
      location: "Nigeria",
      referenceId: item.referenceId,
    } }, upsert: true,
  } }));
  await PriceRecord.bulkWrite(operations, { ordered: false });
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

async function loadConditionRanges(listing, matchedObservations = []) {
  const identities = [...matchedObservations, ...(listing.model ? [listing] : [])]
    .filter((item) => String(item.model || "").trim())
    .map(({ brand = "", model, storage = "" }) => ({ brand: normalize(brand), model: normalize(model), storage: normalize(storage) }));
  const uniqueIdentities = [...new Map(identities.map((item) => [`${item.brand}|${item.model}|${item.storage}`, item])).values()];
  if (!uniqueIdentities.length) return [];
  const exactMatch = (value) => new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const identityQueries = uniqueIdentities.map((identity) => ({
    model: exactMatch(identity.model),
    ...(identity.brand ? { brand: exactMatch(identity.brand) } : {}),
    ...(identity.storage ? { storage: exactMatch(identity.storage) } : {}),
  }));
  const records = await PriceRecord.find(buildConditionRangeQuery(identityQueries)).sort({ retrievedAt: -1 }).limit(300).lean();
  const seen = new Set();
  const independent = records.filter((record) => {
    const key = `${normalize(record.brand)}|${normalize(record.model)}|${normalize(record.storage)}|${record.condition}|${record.sourceDomain || independentDomain(record.sourceUrl)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return summarizeConditionRanges(independent);
}

export async function createAnalysis(input, userId, userRole = "buyer", dependencies = {}) {
  let listing = validateListingInput(input);
  let detailExtraction;
  if (listing.condition === "unspecified") {
    detailExtraction = await extractListingDetails(listing.description);
    if (detailExtraction.available) {
      listing = {
        ...listing,
        ...detailExtraction.listing,
        price: listing.price,
        currency: listing.currency,
        seller: listing.seller,
        marketplace: listing.marketplace,
        url: listing.url,
        description: listing.description,
        observations: listing.observations,
      };
    }
  }
  const search = dependencies.search || collectMarketSearches;
  const ai = dependencies.generateAssessment || generateUnifiedAssessment;
  const attempts = listing.condition === "unspecified"
    ? MARKET_SITES.map((site) => ({ site, status: "insufficient_details", candidates: [], citations: [], queries: [] }))
    : await Promise.resolve().then(() => search(listing)).catch((error) => MARKET_SITES.map((site) => ({ site, status: "error", error, candidates: [], citations: [], queries: [] })));
  const benchmark = buildPriceBenchmark(listing, attempts);
  benchmark.conditionRanges = await loadConditionRanges(listing, benchmark.observations);
  const evidence = storedEvidence(benchmark);

  // Persist collected source evidence before AI generation so a provider failure never discards it.
  await saveMarketObservations(listing, benchmark.observations);
  const assessment = await Assessment.create({
    userId,
    accountRole: userRole,
    status: "ai_unavailable",
    schemaVersion: "2.0",
    listing,
    marketEvidence: evidence,
    report: null,
    assessmentError: "AI assessment is pending. Your source evidence has been saved.",
  });
  const aiResult = await ai({ listing, benchmark, userRole }).catch((error) => ({ available: false, reason: error?.message || "AI assessment is unavailable." }));
  if (!aiResult?.available || !aiResult.report) {
    console.error("AI assessment unavailable:", aiResult?.reason || "unknown provider error");
    assessment.assessmentError = publicAssessmentError(aiResult);
    assessment.status = aiResult?.invalid ? "ai_invalid" : "ai_unavailable";
    await assessment.save();
    return { ...assessment.toObject(), userId: undefined };
  }
  assessment.status = "completed";
  assessment.report = aiResult.report;
  assessment.assessmentError = "";
  assessment.aiAssessment = { model: aiResult.model, schemaVersion: aiResult.schemaVersion, generatedAt: aiResult.report.generatedAt };
  await assessment.save();
  const result = assessment.toObject();
  delete result.userId;
  return result;
}

export async function retryAnalysis(assessment, userRole = "buyer", ai = generateUnifiedAssessment) {
  const benchmark = {
    status: assessment.marketEvidence?.status || "unavailable",
    currency: assessment.marketEvidence?.currency || "NGN",
    requiredSourceCount: assessment.marketEvidence?.requiredSourceCount || REQUIRED_MARKET_SOURCES,
    usableSourceCount: assessment.marketEvidence?.usableSourceCount || 0,
    meanPrice: assessment.marketEvidence?.meanPrice ?? null,
    differenceAmount: assessment.marketEvidence?.differenceAmount ?? null,
    percentageDifference: assessment.marketEvidence?.percentageDifference ?? null,
    observations: assessment.marketEvidence?.observations || [],
    conditionRanges: assessment.marketEvidence?.conditionRanges || [],
    excluded: assessment.marketEvidence?.excluded || [],
    attempts: assessment.marketEvidence?.attempts || [],
    calculatedAt: assessment.marketEvidence?.calculatedAt || assessment.createdAt,
  };
  const aiResult = await ai({ listing: assessment.listing, benchmark, userRole });
  if (!aiResult?.available || !aiResult.report) {
    console.error("AI assessment retry unavailable:", aiResult?.reason || "unknown provider error");
    return { available: false, status: aiResult?.invalid ? "ai_invalid" : "ai_unavailable" };
  }
  assessment.status = "completed";
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
