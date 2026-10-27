import { createHash } from "node:crypto";

export const REQUIRED_MARKET_SOURCES = 3;
export const MARKET_CONDITIONS = ["new", "used", "refurbished", "open_box", "near_expiry", "service"];

const normalize = (value = "") => String(value).toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|ref|source|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
};

const TWO_PART_SUFFIXES = new Set(["com.ng", "org.ng", "net.ng", "co.uk", "com.au", "co.za"]);
export function independentDomain(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length < 2) return host;
    const suffix = parts.slice(-2).join(".");
    return TWO_PART_SUFFIXES.has(suffix) && parts.length >= 3 ? parts.slice(-3).join(".") : suffix;
  } catch { return ""; }
}

function citationUrlSet(citations = []) {
  return new Set(citations.map((citation) => normalizeUrl(citation.url || citation.uri)).filter(Boolean));
}

export function validateMarketObservation(listing, candidate, { site, citations = [], now = new Date(), maxAgeDays = 90 } = {}) {
  const exclusions = [];
  const sourceUrl = normalizeUrl(candidate?.sourceUrl || "");
  const citedUrls = citationUrlSet(citations);
  if (!sourceUrl || !citedUrls.has(sourceUrl)) exclusions.push("Source URL was not returned in Google Search grounding evidence.");
  if (sourceUrl && site?.domain && !(new URL(sourceUrl).hostname === site.domain || new URL(sourceUrl).hostname.endsWith(`.${site.domain}`))) exclusions.push("Result is outside the requested marketplace domain.");
  if (!Number.isFinite(Number(candidate?.price)) || Number(candidate.price) <= 0 || Number(candidate.price) > 1_000_000_000) exclusions.push("Price is not a valid positive NGN amount.");
  if (String(candidate?.currency || "").toUpperCase() !== "NGN") exclusions.push("Currency is missing or is not NGN; no exchange-rate conversion was provided.");
  if (!/^nigeria$/i.test(String(candidate?.country || "").trim())) exclusions.push("Offer is not explicitly identified as being in Nigeria.");
  if (candidate?.availability !== "available") exclusions.push("Current offer availability is not confirmed.");
  if (candidate?.priceIncludesCharges !== true) exclusions.push("Total price including required charges is unclear.");
  if (listing.brand && (!candidate?.brand || normalize(candidate.brand) !== normalize(listing.brand))) exclusions.push("Brand does not exactly match the submitted listing.");
  if (listing.model && (!candidate?.model || normalize(candidate.model) !== normalize(listing.model))) exclusions.push("Model does not exactly match the submitted listing.");
  if (!listing.model && candidate?.model && !normalize(listing.productName).includes(normalize(candidate.model))) exclusions.push("Model is not present in the submitted product name.");
  if (listing.storage && normalize(candidate.storage) !== normalize(listing.storage)) exclusions.push("Storage or capacity does not exactly match the submitted listing.");
  if (candidate?.condition !== listing.condition) exclusions.push("Condition does not exactly match the submitted listing.");
  if (!String(candidate?.title || "").trim()) exclusions.push("Source title is missing.");
  let observedAt = null;
  if (candidate?.observedAt) {
    observedAt = new Date(candidate.observedAt);
    if (Number.isNaN(observedAt.getTime())) exclusions.push("Observation date is invalid.");
    else if (observedAt > new Date(now.getTime() + 24 * 60 * 60 * 1000)) exclusions.push("Observation date is in the future.");
    else if (now.getTime() - observedAt.getTime() > maxAgeDays * 24 * 60 * 60 * 1000) exclusions.push("Observation is older than 90 days.");
  }
  return {
    accepted: exclusions.length === 0,
    exclusions,
    record: exclusions.length ? null : {
      title: String(candidate.title).trim().slice(0, 500),
      productName: String(candidate.title).trim().slice(0, 240),
      brand: String(candidate.brand).trim().slice(0, 100),
      model: String(candidate.model).trim().slice(0, 180),
      storage: String(candidate.storage || "").trim().slice(0, 100),
      condition: candidate.condition,
      price: Number(candidate.price),
      currency: "NGN",
      country: "Nigeria",
      seller: String(candidate.seller || "").trim().slice(0, 180),
      source: site?.name || new URL(sourceUrl).hostname,
      sourceDomain: independentDomain(sourceUrl),
      sourceUrl,
      observedAt,
      retrievedAt: now,
      availability: "available",
      priceIncludesCharges: true,
      promotional: candidate.promotional === true,
      matchType: "exact",
      sourceType: "live",
      referenceId: createHash("sha256").update(sourceUrl).digest("hex"),
    },
  };
}

export function buildPriceBenchmark(listing, attempts = [], { now = new Date() } = {}) {
  const usable = [];
  const excluded = [];
  for (const attempt of attempts) {
    const candidates = Array.isArray(attempt.candidates) ? attempt.candidates : [];
    let acceptedForSite = false;
    for (const candidate of candidates) {
      const validation = validateMarketObservation(listing, candidate, { site: attempt.site, citations: attempt.citations || [], now });
      if (!validation.accepted) {
        excluded.push({ title: String(candidate?.title || "Unmatched result").slice(0, 240), source: attempt.site?.name || "Search result", sourceUrl: normalizeUrl(candidate?.sourceUrl), reasons: validation.exclusions });
        continue;
      }
      const record = validation.record;
      const sameNamedOffer = normalize(record.seller) && usable.some((item) => normalize(item.title) === normalize(record.title) && item.price === record.price && normalize(item.seller) === normalize(record.seller));
      const duplicate = usable.some((item) => item.sourceUrl === record.sourceUrl || item.sourceDomain === record.sourceDomain) || sameNamedOffer;
      if (duplicate) {
        excluded.push({ title: record.title, source: record.source, sourceUrl: record.sourceUrl, reasons: ["Duplicate or syndicated offer; counted once."] });
        continue;
      }
      if (usable.length >= REQUIRED_MARKET_SOURCES) {
        excluded.push({ title: record.title, source: record.source, sourceUrl: record.sourceUrl, reasons: ["Additional source beyond the required three-source benchmark."] });
        continue;
      }
      usable.push(record);
      acceptedForSite = true;
      break;
    }
    if (acceptedForSite) attempt.status = "matched";
    else if (attempt.status === "error" || attempt.status === "unavailable") attempt.status = "unavailable";
    else if (!["insufficient_details", "no_grounding", "no_results"].includes(attempt.status)) attempt.status = candidates.length ? "no_comparable_offer" : "no_results";
  }
  const observations = usable;
  const count = observations.length;
  const status = count >= REQUIRED_MARKET_SOURCES ? "complete" : count > 0 ? "provisional" : "unavailable";
  const mean = count ? observations.reduce((sum, record) => sum + record.price, 0) / count : null;
  const differenceAmount = mean == null ? null : Number((listing.price - mean).toFixed(2));
  const percentageDifference = mean == null ? null : Number((((listing.price - mean) / mean) * 100).toFixed(2));
  return {
    status,
    currency: "NGN",
    requiredSourceCount: REQUIRED_MARKET_SOURCES,
    usableSourceCount: count,
    meanPrice: mean == null ? null : Number(mean.toFixed(2)),
    differenceAmount,
    percentageDifference,
    observations,
    conditionRanges: summarizeConditionRanges([]),
    excluded,
    attempts: attempts.map(({ site, status: attemptStatus, queries = [], error }) => ({ source: site?.name || "Google Search", domain: site?.domain || "", status: attemptStatus || "unknown", queries, ...(error ? { reason: "Source search was unavailable." } : {}) })),
    calculatedAt: now,
  };
}

export function summarizeConditionRanges(observations = []) {
  const labels = { new: "New", used: "Used", refurbished: "Refurbished", open_box: "Open box", near_expiry: "Near expiry", service: "Service" };
  const groups = observations.reduce((all, item) => ((all[item.condition] ||= []).push(item), all), {});
  return Object.entries(groups).map(([condition, rows]) => {
    const prices = rows.map((row) => Number(row.price)).filter((price) => Number.isFinite(price) && price > 0);
    if (!prices.length) return null;
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return { condition, label: labels[condition] || condition, count: prices.length, lowestPrice: Math.min(...prices), meanPrice: Number(mean.toFixed(2)), highestPrice: Math.max(...prices), currency: "NGN" };
  }).filter(Boolean);
}

export { normalize as normalizeProductAttribute, normalizeUrl };
