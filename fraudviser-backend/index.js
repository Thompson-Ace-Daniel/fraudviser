import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
import { DATABASE_URL, PORT } from "./constants/utils.js";
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

// --- Database Connection & Server Startup ---
const startServer = async () => {
  try {
    if (DATABASE_URL) {
      await mongoose.connect(DATABASE_URL, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log("MongoDB connection established");
    } else {
      console.warn(
        "DATABASE_URL is not configured; running without DB connection.",
      );
    }

    if (process.env.VERCEL !== "1") {
      app.listen(PORT, () => {
        console.log(`Fraudviser API listening locally on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();

const shutdown = async () => {
  console.log("Shutting down gracefully...");
  await mongoose.disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
