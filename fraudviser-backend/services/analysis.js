import crypto from "node:crypto";
import PriceRecord from "../models/PriceRecord.js";
import Assessment from "../models/Assessment.js";
import { analyzeWithGemini } from "../gemini.js";

const normalize = (value = "") => value.toString().trim().toLowerCase().replace(/\s+/g, " ");
export const makeProductKey = ({ category, brand, model, storage, condition }) =>
  [category, brand, model || "", storage || "", condition].map(normalize).join("|");
const legacyProductKeys = ({ category, brand, model, storage }) =>
  ["new", "used", "refurbished", "open_box", "near_expiry", "service"].map((condition) =>
    [category, brand, model || "", storage || "", condition].map(normalize).join("|"));

export function summarizeConditionRanges(observations = []) {
  const labels = { new: "New", used: "Used", refurbished: "Refurbished", open_box: "Open box", near_expiry: "Near expiry", service: "Service" };
  return Object.entries(observations.reduce((groups, item) => ((groups[item.condition] ||= []).push(item), groups), {}))
    .map(([condition, rows]) => {
      const prices = rows.map((row) => Number(row.price)).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
      if (!prices.length) return null;
      const middle = Math.floor(prices.length / 2);
      const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
      return { condition, label: labels[condition] || condition, count: prices.length, low: prices[0], median: Math.round(median), high: prices.at(-1) };
    }).filter(Boolean);
}

export function comparePrices(listingPrice, observations) {
  const sorted = observations.map((item) => item.price).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (!sorted.length) return { available: false, confidence: "unavailable", count: 0, observations: [] };
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const deviation = ((listingPrice - median) / median) * 100;
  return {
    available: true, confidence: sorted.length >= 5 ? "moderate" : "low", count: sorted.length,
    referencePrice: Math.round(median), lowestPrice: Math.min(...sorted), highestPrice: Math.max(...sorted),
    signedDeviationPct: Number(deviation.toFixed(1)), absoluteDeviationPct: Number(Math.abs(deviation).toFixed(1)),
    method: "Median of matching product, specification and condition observations",
    observations: observations.map((item) => ({ price: item.price, source: item.source, sourceType: item.sourceType, observedAt: item.observedAt, retrievedAt: item.retrievedAt })),
    interpretation: deviation <= -25 ? "The listing is substantially below the observed median." : deviation >= 25 ? "The listing is substantially above the observed median." : "The listing is within 25% of the observed median.",
  };
}

export function assessRisk(listing, prices) {
  let score = 0;
  const factors = [];
  const add = (weight, title, explanation, severity = "caution") => { score += weight; factors.push({ title, explanation, severity, weight }); };
  if (prices.available && prices.signedDeviationPct <= -35) add(30, "Price far below observed median", `The asking price is ${Math.abs(prices.signedDeviationPct)}% below the median of ${prices.count} matching observations. A low price is a reason to verify details, not proof of fraud.`, "elevated");
  else if (prices.available && prices.signedDeviationPct <= -20) add(15, "Price below observed median", `The asking price is ${Math.abs(prices.signedDeviationPct)}% below the matching median.`, "caution");
  else if (prices.available && prices.signedDeviationPct >= 50) add(8, "Price far above observed median", `The asking price is ${prices.signedDeviationPct}% above the matching median. Confirm that product specifications, included items, and condition are comparable; a high price alone does not establish fraud.`, "caution");
  if (!prices.available) add(0, "No comparable observations", "There is not enough matching market data to evaluate the asking price.", "information");
  else if (prices.count < 3) add(10, "Limited market sample", `Only ${prices.count} comparable observation(s) are available; confidence is low.`, "caution");
  if (!listing.brand?.trim() || !listing.model?.trim()) add(10, "Incomplete product details", "A brand and model or clear identifying details help verify that comparisons are like for like.", "caution");
  if (!listing.seller?.trim()) add(8, "Seller details not provided", "The seller could not be assessed because no seller name was supplied. This is unknown information, not proof of fraud.", "information");
  if (!listing.marketplace?.trim()) add(0, "Marketplace not provided", "The marketplace hosting this listing was not supplied, so its buyer protections could not be considered.", "information");
  if (listing.marketplace && /whatsapp|telegram|facebook marketplace|instagram|classified/i.test(listing.marketplace)) add(8, "Limited platform purchase protection", "The named channel may not provide an integrated checkout or dispute process. Confirm available buyer protection and avoid off-platform payment.", "caution");
  if (!listing.url?.trim()) add(0, "Listing link not provided", "There is no listing link to review or return to later.", "information");
  if (listing.url && /[?&](?:ref|utm_|src|source|redirect)=/i.test(listing.url)) add(5, "Listing link contains redirect or tracking parameters", "Open the marketplace directly and confirm the listing address before sharing personal or payment details.", "information");
  const text = `${listing.description || ""} ${listing.observations || ""}`.toLowerCase();
  const suspicious = [/pay\s+(?:now|first|immediately)/i, /no\s+(?:inspection|refund|returns?)/i, /urgent(?:ly)?\s+payment/i, /send\s+(?:a\s+)?deposit/i, /payment\s+outside\s+(?:the\s+)?platform/i, /only\s+today/i, /wire\s+transfer/i].filter((pattern) => pattern.test(text));
  if (suspicious.length) add(15, "Pressure or payment language", "The supplied text includes pressure to pay, a deposit request or a refusal of inspection/returns. Verify independently before paying.", "caution");
  const conditionConflict = listing.condition === "new" && /used|for parts|needs repair|as-is|as is|opened/i.test(text)
    || listing.condition === "refurbished" && /brand new|factory sealed|never used/i.test(text)
    || listing.condition === "used" && /brand new|factory sealed|unopened/i.test(text)
    || listing.condition === "open_box" && /sealed|unopened|never opened/i.test(text)
    || listing.condition === "near_expiry" && /expired|out of date/i.test(text);
  if (conditionConflict) add(12, "Description conflicts with selected condition", "The submitted text appears inconsistent with the selected item condition. Ask the seller to clarify and inspect the item before payment.", "caution");
  score = Math.min(100, score);
  const level = score >= 50 ? "Elevated observed risk" : score >= 25 ? "Moderate observed risk" : !prices.available ? "Insufficient information" : "Low observed risk";
  const missing = [];
  if (!listing.seller?.trim()) missing.push("Seller name and independently verifiable contact details");
  if (!listing.url?.trim()) missing.push("A listing URL that can be reviewed");
  if (!listing.brand?.trim() || !listing.model?.trim()) missing.push("Brand and model or another precise product identifier");
  if (!prices.available || prices.count < 3) missing.push("More matching market observations");
  const evidenceCoverage = prices.count >= 5 && listing.seller?.trim() && listing.url?.trim() && listing.brand?.trim() && listing.model?.trim() ? "More information available" : prices.available ? "Some information missing" : "Limited information";
  return { score, level, evidenceCoverage, factors, missingInformation: missing, recommendations: ["Inspect the exact item and confirm its condition before payment.", "Check product specifications, authenticity marks and proof of ownership where relevant.", "Use a payment method with buyer protection; avoid deposits or pressure to pay upfront."], disclaimer: "This rule-based score summarizes observable signals. It is not a calibrated probability or a definitive fraud verdict." };
}

const isValidUrl = (value) => { if (!value) return true; try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; } };

export async function createAnalysis(input, userId, userRole = "buyer") {
  const required = ["productName", "category", "condition"];
  const missing = required.filter((field) => typeof input[field] !== "string" || !input[field].trim());
  if (missing.length) { const error = new Error(`Required fields: ${missing.join(", ")}`); error.status = 400; throw error; }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000_000) { const error = new Error("Price must be a positive amount in Nigerian naira."); error.status = 400; throw error; }
  if (!["new", "used", "refurbished", "open_box", "near_expiry", "service"].includes(input.condition)) { const error = new Error("Choose a supported listing condition."); error.status = 400; throw error; }
  if (!isValidUrl(input.url)) { const error = new Error("Listing URL must be a valid http or https URL."); error.status = 400; throw error; }
  
  const listing = Object.fromEntries(
    ["productName", "category", "productType", "brand", "model", "storage", "condition", "seller", "marketplace", "url", "description", "observations"]
      .map((key) => [
        key,
        typeof input[key] === "string" ? input[key].trim().slice(0, 1500) : "",
      ])
  );

  listing.price = price;
  if (!listing.productType) listing.productType = listing.category.toLowerCase().includes("service") ? "service" : "goods";

  const productKey = makeProductKey({ ...listing, model: listing.model || listing.productName });

  const allMatches = await PriceRecord.find({
    $or: [{ productKey }, { productKey: { $in: legacyProductKeys({ ...listing, model: listing.model || listing.productName }) } }],
  })
    .sort({ observedAt: -1, retrievedAt: -1 })
    .limit(300)
    .lean();

  const conditionRanges = summarizeConditionRanges(allMatches);
  const matches = allMatches.filter((item) => item.condition === listing.condition);

  const priceAnalysis = comparePrices(price, matches);
  priceAnalysis.conditionRanges = conditionRanges;
  const risk = assessRisk(listing, priceAnalysis);

  const aiAssessment = await analyzeWithGemini(
    listing,
    priceAnalysis,
    risk,
    userRole,
  );

  const assessment = await Assessment.create({
    userId,
    accountRole: userRole,
    listing,
    priceAnalysis,
    risk,
    aiAssessment,
  });

  const savedAssessment = assessment.toObject();
  delete savedAssessment.userId;
  return {
    ...savedAssessment,
    provenance: {
      sourceTypes: [...new Set(matches.map((item) => item.sourceType))],
      lastUpdated: matches.reduce(
        (latest, item) =>
          item.retrievedAt && (!latest || item.retrievedAt > latest)
            ? item.retrievedAt
            : latest,
        null
      ),
    },
  };
}


export async function importPrices(rows, { source = "User import", sourceType = "imported" } = {}) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000) { const error = new Error("Provide between 1 and 2,000 price records."); error.status = 400; throw error; }
  const allowed = ["live", "cached", "imported", "demo"];
  if (!allowed.includes(sourceType) || sourceType === "demo") { const error = new Error("Imports must use sourceType live, cached, or imported."); error.status = 400; throw error; }
  const normalized = rows.map((row, index) => {
    const item = { ...row, price: Number(row.price), source: String(row.source || source).trim(), sourceType,
      observedAt: row.observedAt ? new Date(row.observedAt) : null,
      referenceId: String(row.referenceId || crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex")) };
    if (!item.productName || !item.category || !["new", "used", "refurbished", "open_box", "near_expiry", "service"].includes(item.condition) || !Number.isFinite(item.price) || item.price <= 0 || (item.observedAt && Number.isNaN(item.observedAt.getTime()))) {
      const error = new Error(`Record ${index + 1} has invalid productName, category, condition, price, or observedAt.`); error.status = 400; throw error;
    }
    item.productKey = makeProductKey({ ...item, model: item.model || item.productName }); item.retrievedAt = new Date();
    return item;
  });
  const ops = normalized.map((item) => ({ updateOne: { filter: { source: item.source, referenceId: item.referenceId }, update: { $set: item }, upsert: true } }));
  const result = await PriceRecord.bulkWrite(ops, { ordered: true });
  return { received: normalized.length, inserted: result.upsertedCount, updated: result.modifiedCount };
}

export { Assessment, PriceRecord };
