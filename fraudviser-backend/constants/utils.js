import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});

export const PORT = Number(process.env.PORT) || 3000;

const rawMongoUrl =
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  process.env.MONGODB_URI;

export const DATABASE_URL = rawMongoUrl
  ? `${rawMongoUrl.replace(/\/$/, "")}/fraudviser`
  : "";
