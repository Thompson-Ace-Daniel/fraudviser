import mongoose from "mongoose";

export function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    error: "Database unavailable. Configure MONGODB_URL and ensure MongoDB is running.",
  });
}
