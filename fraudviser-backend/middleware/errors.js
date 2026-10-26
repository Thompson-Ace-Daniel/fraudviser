export function notFound(_req, res) {
  res.status(404).json({ error: "Endpoint not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err?.message === "Origin not allowed.") {
    return res.status(403).json({ error: "Request origin is not allowed." });
  }
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }
  if (err?.name === "ValidationError") {
    const details = Object.values(err.errors || {})
      .map((entry) => entry?.message)
      .filter(Boolean);
    return res.status(400).json({
      error: details.length ? details.join(" ") : "The submitted data is invalid.",
    });
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ error: "A request identifier is invalid." });
  }
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error("API error:", err?.message || err);
  return res.status(500).json({ error: "Unexpected server error" });
}
