import test from "node:test";
import assert from "node:assert/strict";
import { buildPriceBenchmark, summarizeConditionRanges, validateMarketObservation } from "../services/market-data.js";
import { validateListingInput } from "../services/analysis.js";
import { allowedEvidenceRefs, validateAssessmentResponse } from "../gemini.js";

const now = new Date("2026-10-25T12:00:00.000Z");
const listing = { productName: "Apple iPhone 16", category: "Electronics & phones", brand: "Apple", model: "iPhone 16", storage: "128GB", condition: "used", price: 300000, currency: "NGN", marketplace: "Jumia", url: "" };
const sites = [
  { name: "Jumia Nigeria", domain: "jumia.com.ng" },
  { name: "Konga Nigeria", domain: "konga.com" },
  { name: "Jiji Nigeria", domain: "jiji.ng" },
];
function offer(site, price, overrides = {}) {
  const sourceUrl = `https://www.${site.domain}/apple-iphone-16-128gb-used-${price}`;
  return {
    sourceUrl, title: `Apple iPhone 16 128GB used ₦${price}`, seller: `${site.name} seller`, brand: "Apple", model: "iPhone 16", storage: "128GB",
    condition: "used", price, currency: "NGN", country: "Nigeria", availability: "available", priceIncludesCharges: true,
    promotional: false, observedAt: now.toISOString(), ...overrides,
  };
}
function attempts(prices = [280000, 310000, 320000]) {
  return sites.map((site, index) => ({ site, status: "searched", queries: [`site:${site.domain} iPhone 16 used`], citations: [{ url: offer(site, prices[index] ?? 310000).sourceUrl, title: site.name }], candidates: index < prices.length ? [offer(site, prices[index])] : [] }));
}

test("three independent exact Nigeria NGN offers use the arithmetic mean", () => {
  const result = buildPriceBenchmark(listing, attempts(), { now });
  assert.equal(result.status, "complete");
  assert.equal(result.requiredSourceCount, 3);
  assert.equal(result.usableSourceCount, 3);
  assert.equal(result.meanPrice, 303333.33);
  assert.equal(result.differenceAmount, -3333.33);
  assert.equal(result.percentageDifference, -1.1);
  assert.deepEqual(result.observations.map((item) => item.sourceDomain), ["jumia.com.ng", "konga.com", "jiji.ng"]);
});

test("two, one, and zero comparable source results are labeled provisional or unavailable", () => {
  const two = buildPriceBenchmark(listing, attempts([280000, 310000]), { now });
  assert.equal(two.status, "provisional");
  assert.equal(two.usableSourceCount, 2);
  assert.equal(two.meanPrice, 295000);
  const one = buildPriceBenchmark(listing, attempts([280000]), { now });
  assert.equal(one.status, "provisional");
  assert.equal(one.usableSourceCount, 1);
  const none = buildPriceBenchmark(listing, [], { now });
  assert.equal(none.status, "unavailable");
  assert.equal(none.meanPrice, null);
  assert.equal(none.differenceAmount, null);
  assert.equal(none.percentageDifference, null);
});

test("offers without a URL in actual Google grounding citations are rejected", () => {
  const site = sites[0];
  const candidate = offer(site, 280000);
  const result = validateMarketObservation(listing, candidate, { site, citations: [], now });
  assert.equal(result.accepted, false);
  assert.match(result.exclusions.join(" "), /grounding evidence/i);
});

test("currency, market, availability, and all-in price must be explicit", () => {
  for (const overrides of [
    { currency: "USD" }, { country: "United States" }, { availability: "unknown" }, { priceIncludesCharges: false },
  ]) {
    const site = sites[0];
    const candidate = offer(site, 280000, overrides);
    const result = validateMarketObservation(listing, candidate, { site, citations: [{ url: candidate.sourceUrl }], now });
    assert.equal(result.accepted, false);
  }
});

test("condition, model, brand, and storage mismatches do not enter the benchmark", () => {
  for (const overrides of [
    { condition: "new" }, { model: "iPhone 16 Pro" }, { brand: "Samsung" }, { storage: "256GB" },
  ]) {
    const site = sites[0];
    const candidate = offer(site, 280000, overrides);
    const result = validateMarketObservation(listing, candidate, { site, citations: [{ url: candidate.sourceUrl }], now });
    assert.equal(result.accepted, false);
  }
});

test("missing optional brand and model fields can still match a product name", () => {
  const partialListing = { ...listing, brand: "", model: "", productName: "Apple iPhone 16" };
  const candidate = offer(sites[0], 280000);
  const result = validateMarketObservation(partialListing, candidate, { site: sites[0], citations: [{ url: candidate.sourceUrl }], now });
  assert.equal(result.accepted, true);
});

test("non-positive, non-finite, and out-of-range prices are rejected", () => {
  for (const price of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 2_000_000_000]) {
    const site = sites[0];
    const candidate = offer(site, price);
    const result = validateMarketObservation(listing, candidate, { site, citations: [{ url: candidate.sourceUrl }], now });
    assert.equal(result.accepted, false);
  }
});

test("stale and future observations are rejected", () => {
  const site = sites[0];
  for (const observedAt of ["2026-07-01T00:00:00.000Z", "2026-10-27T00:00:00.000Z", "not-a-date"]) {
    const candidate = offer(site, 280000, { observedAt });
    const result = validateMarketObservation(listing, candidate, { site, citations: [{ url: candidate.sourceUrl }], now });
    assert.equal(result.accepted, false);
  }
});

test("all verified source prices remain in the arithmetic mean without a threshold flag", () => {
  const result = buildPriceBenchmark(listing, attempts([100000, 110000, 1000000]), { now });
  assert.equal(result.meanPrice, 403333.33);
  assert.equal(result.observations.find((item) => item.price === 1000000).outlierReview, undefined);
  assert.equal(result.usableSourceCount, 3);
});

test("same-site, identical URL, and syndicated seller offers count only once", () => {
  const first = offer(sites[0], 280000);
  const copied = { ...offer(sites[1], 280000), title: first.title, seller: first.seller };
  const data = [
    { site: sites[0], status: "searched", citations: [{ url: first.sourceUrl }], candidates: [first] },
    { site: sites[1], status: "searched", citations: [{ url: copied.sourceUrl }], candidates: [copied] },
    { site: sites[2], status: "searched", citations: [{ url: offer(sites[2], 320000).sourceUrl }], candidates: [offer(sites[2], 320000)] },
  ];
  const result = buildPriceBenchmark(listing, data, { now });
  assert.equal(result.usableSourceCount, 2);
  assert.equal(result.status, "provisional");
  assert.ok(result.excluded.some((item) => item.reasons.some((reason) => /duplicate|syndicated/i.test(reason))));
});

test("out-of-domain search results and provider failures remain explicit", () => {
  const wrongDomain = { ...offer(sites[0], 280000), sourceUrl: "https://unrelated.example/item" };
  const result = buildPriceBenchmark(listing, [
    { site: sites[0], status: "searched", citations: [{ url: wrongDomain.sourceUrl }], candidates: [wrongDomain] },
    { site: sites[1], status: "error", error: "private provider stack" },
  ], { now });
  assert.equal(result.status, "unavailable");
  assert.equal(result.attempts[1].status, "unavailable");
  assert.equal(result.attempts[1].error, undefined);
  assert.ok(result.excluded[0].reasons.some((reason) => /outside the requested/i.test(reason)));
});

test("asking price validation rejects invalid currency, amount, and listing URL", () => {
  for (const input of [{ ...listing, currency: "USD" }, { ...listing, price: Infinity }, { ...listing, url: "javascript:alert(1)" }]) {
    assert.throws(() => validateListingInput(input), { status: 400 });
  }
  assert.equal(validateListingInput(listing).currency, "NGN");
});

test("AI response validation requires evidence references and cannot invent an unavailable benchmark", () => {
  const response = {
    listingSummary: "The listing is an iPhone 16.", priceAssessment: "cannot_assess", priceExplanation: "No matching offers were found.", evidenceCoverage: "Price evidence is missing.",
    qualitativeConclusion: "cannot_assess", riskExplanation: "The listing cannot be fully assessed.", supportedFindings: [{ message: "The listing URL is missing.", evidenceRefs: ["listing.marketplace"] }],
    safetyRecommendations: ["Ask for a device inspection."], questionsForSeller: ["Can you share a current video?"], verificationActions: ["Verify the IMEI with the manufacturer."],
    missingInformation: ["Listing URL"], limitations: ["Seller identity is not verified."], overallConclusion: "Price could not be assessed.", suggestedNextSteps: ["Compare the model on additional local sources."],
  };
  const noEvidence = buildPriceBenchmark(listing, [], { now });
  assert.equal(validateAssessmentResponse(response, noEvidence, listing).priceAssessment, "cannot_assess");
  assert.throws(() => validateAssessmentResponse({ ...response, supportedFindings: [{ message: "Unsupported claim", evidenceRefs: ["market.sources:0"] }] }, noEvidence, listing), /unavailable evidence reference/i);
  assert.throws(() => validateAssessmentResponse({ ...response, priceAssessment: "consistent_with_evidence" }, noEvidence, listing), /without a validated market source/i);
});

test("allowed evidence references exclude empty fields and track benchmark size", () => {
  const emptySeller = { ...listing, seller: "", url: "" };
  const none = allowedEvidenceRefs(emptySeller, buildPriceBenchmark(listing, [], { now }));
  assert.ok(none.includes("listing.price"));
  assert.ok(!none.includes("listing.seller"));
  assert.ok(!none.some((ref) => ref.startsWith("market.sources:")));
  assert.ok(!none.some((ref) => ref.startsWith("marketBenchmark.")));
  const three = allowedEvidenceRefs(listing, buildPriceBenchmark(listing, attempts(), { now }));
  assert.ok(three.includes("market.sources:0"));
  assert.ok(three.includes("market.sources:2"));
  assert.ok(!three.includes("market.sources:3"));
});

test("condition ranges use only positive finite prices and report the arithmetic mean", () => {
  const ranges = summarizeConditionRanges([{ condition: "used", price: 100 }, { condition: "used", price: 200 }, { condition: "new", price: 400 }, { condition: "new", price: 0 }]);
  assert.deepEqual(ranges.find((item) => item.condition === "used"), { condition: "used", label: "Used", count: 2, lowestPrice: 100, meanPrice: 150, highestPrice: 200, currency: "NGN" });
});
