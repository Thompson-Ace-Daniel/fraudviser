import test from "node:test";
import assert from "node:assert/strict";
import { assessRisk, comparePrices, makeProductKey } from "../services/analysis.js";

const comparable = [
  { price: 485000, source: "Example", sourceType: "demo" },
  { price: 510000, source: "Example", sourceType: "demo" },
  { price: 525000, source: "Example", sourceType: "demo" },
  { price: 550000, source: "Example", sourceType: "demo" },
  { price: 575000, source: "Example", sourceType: "demo" },
];

test("uses median and signed deviation for odd number of observations", () => {
  const result = comparePrices(420000, comparable);
  assert.equal(result.referencePrice, 525000);
  assert.equal(result.signedDeviationPct, -20);
  assert.equal(result.absoluteDeviationPct, 20);
  assert.equal(result.lowestPrice, 485000);
  assert.equal(result.highestPrice, 575000);
});

test("uses average of the two middle values for an even sample", () => {
  assert.equal(comparePrices(200, [{ price: 100 }, { price: 300 }]).referencePrice, 200);
});

test("returns unavailable rather than inventing a reference with no observations", () => {
  const result = comparePrices(100, []);
  assert.equal(result.available, false);
  assert.equal(result.referencePrice, undefined);
});

test("uses product identity and condition to keep comparisons specific", () => {
  const listing = { category: "Smartphones", brand: "Apple", model: "iPhone 13", storage: "128GB", condition: "used" };
  assert.equal(makeProductKey(listing), makeProductKey({ ...listing, model: " iPhone   13 " }));
  assert.notEqual(makeProductKey(listing), makeProductKey({ ...listing, model: "iPhone 14" }));
  assert.notEqual(makeProductKey(listing), makeProductKey({ ...listing, storage: "256GB" }));
  assert.notEqual(makeProductKey(listing), makeProductKey({ ...listing, condition: "new" }));
});

test("explains price anomalies and missing market evidence", () => {
  const base = { productName: "Phone", brand: "Apple", model: "13", storage: "128GB", seller: "Shop", marketplace: "Market", description: "", observations: "" };
  const risk = assessRisk({ ...base, price: 200 }, { available: true, signedDeviationPct: -40, count: 5 });
  assert.equal(risk.factors[0].title, "Price far below observed median");
  assert.match(risk.factors[0].explanation, /not proof of fraud/i);
  assert.equal(assessRisk(base, { available: false, count: 0 }).level, "Insufficient information");
});
