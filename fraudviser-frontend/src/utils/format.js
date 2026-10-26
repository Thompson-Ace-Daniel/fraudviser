export const hasNumber = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value));

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const moneyFormatters = new Map();

function formatterFor(currency) {
  if (currency === "NGN") return naira;
  if (!moneyFormatters.has(currency)) {
    moneyFormatters.set(
      currency,
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    );
  }
  return moneyFormatters.get(currency);
}

export const money = (value, currency = "NGN", fallback = "—") => {
  if (!hasNumber(value)) return fallback;
  try {
    return formatterFor(currency).format(Number(value));
  } catch {
    return fallback;
  }
};

const dayFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const date = (value, fallback = "—") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return dayFormatter.format(parsed);
};

export const label = (value = "") => String(value).replaceAll("_", " ");

export const referenceLabel = (reference = "") =>
  reference.startsWith("market.sources:")
    ? `Offer ${Number(reference.split(":").at(-1)) + 1}`
    : reference.replace("listing.", "Listing: ");
