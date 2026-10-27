import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
import { PORT } from "./constants/utils.js";
import { connectDB } from "./config/mongodb.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { isOriginAllowed, securityHeaders } from "./middleware/security.js";

dns.setDefaultResultOrder("ipv4first");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);

app.use(
  cors({
    origin: (origin, callback) =>
      isOriginAllowed(origin)
        ? callback(null, true)
        : callback(new Error("Origin not allowed.")),
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// --- Serverless DB Middleware ---
// This ensures MongoDB connection is awaited on every incoming request
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// --- Base routes ---
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

app.use(notFound);
app.use(errorHandler);

if (!process.env.VERCEL) {
  connectDB();

  app.listen(PORT, () => {
    console.log(`Fraudviser API listening locally on port ${PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export default app;