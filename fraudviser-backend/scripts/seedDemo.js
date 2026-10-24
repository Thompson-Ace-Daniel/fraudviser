import { connectDB } from "../config/mongodb.js";
import PriceRecord from "../models/PriceRecord.js";
import { makeProductKey } from "../services/analysis.js";

const now = Date.now();
const records = [
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "used", 485000],
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "used", 510000],
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "used", 525000],
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "used", 550000],
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "used", 575000],
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "new", 820000],
  ["Apple iPhone 13 128GB", "Apple", "iPhone 13", "128GB", "refurbished", 630000],
  ["Apple iPhone 14 128GB", "Apple", "iPhone 14", "128GB", "used", 670000],
  ["Samsung Galaxy S23 256GB", "Samsung", "Galaxy S23", "256GB", "used", 690000],
  ["Samsung Galaxy S23 256GB", "Samsung", "Galaxy S23", "256GB", "used", 720000],
  ["Samsung Galaxy S23 256GB", "Samsung", "Galaxy S23", "256GB", "used", 750000],
];

try {
  await connectDB();
  const ops = records.map(([productName, brand, model, storage, condition, price], index) => {
    const item = { productName, category: "Smartphones", brand, model, storage, condition, price, source: "Demonstration fixture — illustrative only, not observed listings", sourceType: "demo", observedAt: null, retrievedAt: new Date(now), location: "Nigeria (illustrative dataset)", referenceId: `fraudviser-demo-v1-${index + 1}` };
    item.productKey = makeProductKey(item);
    return { updateOne: { filter: { source: item.source, referenceId: item.referenceId }, update: { $set: item }, upsert: true } };
  });
  const result = await PriceRecord.bulkWrite(ops);
  console.log(`Demo data ready: ${result.upsertedCount} inserted, ${result.modifiedCount} updated. All observations are labelled demo.`);
} catch (error) { console.error(`Seed failed: ${error.message}`); process.exitCode = 1; }
finally { await (await import("mongoose")).default.disconnect(); }
