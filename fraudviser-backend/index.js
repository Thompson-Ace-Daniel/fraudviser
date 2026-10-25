import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
import { DATABASE_URL, PORT } from "./constants/utils.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";


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

// --- Serverless / Local Hybrid Startup ---
const connectDatabase = async () => {
  if (mongoose.connection.readyState >= 1) return;

  if (!DATABASE_URL) {
    console.warn(
      "⚠️ DATABASE_URL is not configured; database endpoints are unavailable.",
    );
    return;
  }

  try {
    await mongoose.connect(DATABASE_URL, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
  }
};

if (process.env.VERCEL !== "1") {
  app.listen(PORT, async () => {
    await connectDatabase();
    console.log(`🚀 Fraudviser API listening locally on port ${PORT}`);
  });
} else {
  connectDatabase();
}

const shutdown = async () => {
  await mongoose.disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
