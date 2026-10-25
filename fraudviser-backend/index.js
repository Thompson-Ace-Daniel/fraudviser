import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
import { DATABASE_URL, PORT } from "./constants/utils.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";

// Safe IPv4 routing for serverless clouds
dns.setDefaultResultOrder("ipv4first");

const app = express();

// --- CORS Configuration ---
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) =>
      !origin || allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error("Origin not allowed.")),
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// --- 🔌 Serverless Database Connection Middleware ---
// This ensures MongoDB is connected before processing ANY route requests on Vercel
const ensureDatabaseConnected = async (req, res, next) => {
  if (mongoose.connection.readyState >= 1) {
    return next();
  }

  if (!DATABASE_URL) {
    console.warn(
      "⚠️ DATABASE_URL is not configured; database endpoints are unavailable.",
    );
    return next();
  }

  try {
    await mongoose.connect(DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB cloud connection established");
    next();
  } catch (error) {
    console.error(`❌ MongoDB cloud connection failed: ${error.message}`);
    // Gracefully handle database drops without freezing the execution context
    res.status(500).json({ error: "Database connection failed" });
  }
};

// Global Middleware Engagement
app.use(ensureDatabaseConnected);

// --- Base Routes ---
app.get("/", (_req, res) => res.json({ message: "Fraudviser API" }));

app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "degraded",
    api: "running",
    database: connected ? "connected" : "disconnected",
    checkedAt: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

// --- Error Handling Middleware ---
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));

app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);
  res
    .status(err.status || 500)
    .json({ error: err.status ? err.message : "Unexpected server error" });
});

// --- Local Hybrid Listening Execution ---
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🚀 Fraudviser API listening locally on port ${PORT}`);
  });
}

const shutdown = async () => {
  await mongoose.disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
