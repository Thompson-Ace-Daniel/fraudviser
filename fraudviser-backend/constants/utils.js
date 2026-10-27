import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.VERCEL) {
  dotenv.config({
    path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
  });
}

export const PORT = Number(process.env.PORT) || 3000;
export const DATABASE_NAME = "fraudviser";
export const PORT = Number(process.env.PORT) || 3000;
export const DATABASE_NAME = "fraudviser";

/**
 * Resolve the MongoDB connection string, ensuring it points at the
 * Fraudviser database without corrupting query parameters or an
 * explicitly configured database path.
 *
 * - `mongodb://127.0.0.1:27017` -> `mongodb://127.0.0.1:27017/fraudviser`
 * - `mongodb://host:27017/?retryWrites=true` keeps its query string.
 * - A URI that already carries a database path is left untouched.
 */
export function resolveDatabaseUrl(rawMongoUrl, databaseName = DATABASE_NAME) {
  const raw = String(rawMongoUrl || "").trim();
  if (!raw) return "";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return `${raw.replace(/\/+$/, "")}/${databaseName}`;
  }
  const pathname = parsed.pathname || "/";
  if (pathname !== "/" && pathname.replace(/\/+$/, "") !== "") return raw;
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

const rawMongoUrl =
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  process.env.MONGODB_URI;

export const DATABASE_URL = resolveDatabaseUrl(rawMongoUrl)
