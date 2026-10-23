import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { DATABASE_URL, PORT } from "./constants/utils.js";
import { apiRouter } from "./routes/api.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "1mb" }));
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
app.use("/api", apiRouter);
app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));
app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);
  res
    .status(err.status || 500)
    .json({ error: err.status ? err.message : "Unexpected server error" });
});

const server = app.listen(PORT, () =>
  console.log(`Fraudviser API listening on port ${PORT}`),
);
if (!DATABASE_URL)
  console.warn(
    "MONGODB_URL is not configured; database-backed endpoints are unavailable.",
  );
else
  mongoose
    .connect(DATABASE_URL, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("MongoDB connected"))
    .catch((error) =>
      console.error(`MongoDB connection failed: ${error.message}`),
    );

const shutdown = async () => {
  server.close();
  await mongoose.disconnect();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
