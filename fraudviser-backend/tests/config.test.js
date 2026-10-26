import test from "node:test";
import assert from "node:assert/strict";
import { resolveDatabaseUrl } from "../constants/utils.js";
import { buildConditionRangeQuery } from "../services/analysis.js";
import { DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL, modelCandidates } from "../gemini.js";

test("database URL gains the fraudviser database on a bare host", () => {
  assert.equal(
    resolveDatabaseUrl("mongodb://127.0.0.1:27017"),
    "mongodb://127.0.0.1:27017/fraudviser",
  );
});

test("database URL keeps query parameters and an explicit database", () => {
  assert.equal(
    resolveDatabaseUrl("mongodb://host:27017/?retryWrites=true&w=majority"),
    "mongodb://host:27017/fraudviser?retryWrites=true&w=majority",
  );
  assert.equal(
    resolveDatabaseUrl("mongodb+srv://user:pass@cluster.example/myapp?retryWrites=true"),
    "mongodb+srv://user:pass@cluster.example/myapp?retryWrites=true",
  );
});

test("database URL resolves empty input to an empty string", () => {
  assert.equal(resolveDatabaseUrl(""), "");
  assert.equal(resolveDatabaseUrl(undefined), "");
});

test("condition-range query keeps both the identity filter and the freshness filter", () => {
  const freshSince = new Date("2026-07-27T12:00:00.000Z");
  const now = new Date("2026-10-25T12:00:00.000Z");
  const identityQueries = [{ model: /^iphone 16$/i }];
  const query = buildConditionRangeQuery(identityQueries, { freshSince, now });

  assert.ok(Array.isArray(query.$and));
  assert.deepEqual(query.$and[0], { $or: identityQueries });
  assert.deepEqual(query.$and[1], {
    $or: [{ observedAt: null }, { observedAt: { $gte: freshSince, $lte: now } }],
  });
  assert.equal(query.currency, "NGN");
  assert.equal(query.matchType, "exact");
  assert.deepEqual(query.retrievedAt, { $gte: freshSince });
});

test("gemini models default to supported candidates without duplicates", () => {
  assert.equal(DEFAULT_GEMINI_MODEL, "gemini-3.8-flash");
  assert.equal(FALLBACK_GEMINI_MODEL, "gemini-3.5-flash-lite");
  assert.ok(modelCandidates.length >= 1);
  assert.equal(new Set(modelCandidates).size, modelCandidates.length);
  assert.ok(modelCandidates.includes(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL));
});
