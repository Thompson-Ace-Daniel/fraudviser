import { Router } from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";
import mongoose from "mongoose";
import User from "../models/User.js";
import Session from "../models/Session.js";
import AuthAttempt from "../models/AuthAttempt.js";
import { requireDatabase } from "../middleware/database.js";
import { enforceAllowedOrigin } from "../middleware/security.js";

const scrypt = promisify(crypto.scrypt);
export const authRouter = Router();
const SESSION_AGE = 7 * 24 * 60 * 60 * 1000;
const cookieName = "fraudviser_session";
const sameSite = ["lax", "strict", "none"].includes(
  (process.env.COOKIE_SAME_SITE || "lax").toLowerCase(),
)
  ? (process.env.COOKIE_SAME_SITE || "lax").toLowerCase()
  : "lax";
const secureCookie =
  process.env.NODE_ENV === "production" || sameSite === "none";
const cookieOptions = `Path=/api; HttpOnly; SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}; Max-Age=${SESSION_AGE / 1000}${secureCookie ? "; Secure" : ""}`;
const getToken = (req) => {
  const raw = req.headers.cookie || "";
  const part = raw
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));
  try {
    return part ? decodeURIComponent(part.slice(cookieName.length + 1)) : "";
  } catch {
    return "";
  }
};
const digest = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const safeUser = (user) => ({
  id: String(user._id),
  email: user.email,
  role: user.role,
});
authRouter.use(enforceAllowedOrigin);
async function limitAuthAttempts(req, res, next) {
  try {
    const windowMs = 15 * 60 * 1000;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const client = req.ip || req.socket.remoteAddress || "unknown";
    const bucketKey = crypto
      .createHash("sha256")
      .update(`${req.path}:${client}:${window}`)
      .digest("hex");
    let bucket;
    try {
      bucket = await AuthAttempt.findOneAndUpdate(
        { bucketKey },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      bucket = await AuthAttempt.findOneAndUpdate(
        { bucketKey },
        { $inc: { count: 1 } },
        { returnDocument: "after" },
      );
    }
    if (bucket.count > 12)
      return res.status(429).json({
        error: "Too many attempts. Wait a few minutes and try again.",
      });
    next();
  } catch (error) {
    next(error);
  }
}

authRouter.use(requireDatabase);
authRouter.post("/register", limitAuthAttempts, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const role = ["buyer", "seller"].includes(req.body?.role)
      ? req.body.role
      : "buyer";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 10 || password.length > 128)
      return res
        .status(400)
        .json({ error: "Use a password between 10 and 128 characters." });
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = (await scrypt(password, salt, 64)).toString("hex");
    const user = await User.create({
      email,
      passwordSalt: salt,
      passwordHash,
      role,
    });
    const token = crypto.randomBytes(32).toString("base64url");
    await Session.create({
      tokenHash: digest(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + SESSION_AGE),
    });
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${encodeURIComponent(token)}; ${cookieOptions}`,
    );
    res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000)
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    next(error);
  }
});

authRouter.post("/login", limitAuthAttempts, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email }).select(
      "+passwordHash +passwordSalt",
    );
    if (!user || !password || password.length > 128)
      return res.status(401).json({ error: "Email or password is incorrect." });
    const candidate = await scrypt(password, user.passwordSalt, 64);
    const expected = Buffer.from(user.passwordHash, "hex");
    if (
      candidate.length !== expected.length ||
      !crypto.timingSafeEqual(candidate, expected)
    )
      return res.status(401).json({ error: "Email or password is incorrect." });
    const token = crypto.randomBytes(32).toString("base64url");
    await Session.create({
      tokenHash: digest(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + SESSION_AGE),
    });
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${encodeURIComponent(token)}; ${cookieOptions}`,
    );
    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Sign in to continue." });
    const session = await Session.findOne({
      tokenHash: digest(token),
      expiresAt: { $gt: new Date() },
    }).populate("userId", "email role");
    return session?.userId
      ? res.json({ user: safeUser(session.userId) })
      : res.status(401).json({ error: "Sign in to continue." });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) await Session.deleteOne({ tokenHash: digest(token) });
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=; Path=/api; HttpOnly; SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}; Max-Age=0${secureCookie ? "; Secure" : ""}`,
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export async function requireAuth(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1)
      return res
        .status(503)
        .json({ error: "The service is temporarily unavailable." });
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Sign in to continue." });
    const session = await Session.findOne({
      tokenHash: digest(token),
      expiresAt: { $gt: new Date() },
    }).populate("userId", "email role");
    if (!session?.userId)
      return res.status(401).json({ error: "Sign in to continue." });
    req.user = session.userId;
    next();
  } catch (error) {
    next(error);
  }
}
