export function getAllowedOrigins() {
  return (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin) {
  if (!origin) return true;
  return getAllowedOrigins().includes(origin);
}

/** Minimal security headers without extra dependencies. */
export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

/**
 * CSRF guard for cookie-authenticated mutations. Browsers attach cookies
 * automatically, so non-GET requests must carry an explicitly allowed Origin.
 */
export function enforceAllowedOrigin(req, res, next) {
  const origin = req.get("origin");
  if (req.method !== "GET" && origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: "Request origin is not allowed." });
  }
  next();
}
