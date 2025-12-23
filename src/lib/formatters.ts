export type CurrencyCode = "EUR" | "USD";

const currencyFormatterCache = new Map<CurrencyCode, Intl.NumberFormat>();
const EUR_EXCHANGES = new Set(["BME", "MIL", "XETR", "FRA", "PAR", "AMS", "BRU"]);
const EUR_SUFFIXES = [".MC", ".MI", ".DE", ".PA", ".AS", ".BR"];

const getCurrencyFormatter = (currency: CurrencyCode) => {
  const cached = currencyFormatterCache.get(currency);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  currencyFormatterCache.set(currency, formatter);
  return formatter;
};

const percentFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const formatCurrency = (value: number, currency: CurrencyCode = "EUR") =>
  getCurrencyFormatter(currency).format(value);

export const convertCurrency = (
  value: number,
  targetCurrency: CurrencyCode,
  fxRate: number,
  baseCurrency: CurrencyCode = "EUR"
) => {
  if (!Number.isFinite(value)) return value;
  if (targetCurrency === baseCurrency) return value;
  if (baseCurrency === "EUR" && targetCurrency === "USD") {
    return value * fxRate;
  }
  if (baseCurrency === "USD" && targetCurrency === "EUR") {
    return value / fxRate;
  }
  return value;
};

export const convertCurrencyFrom = (
  value: number,
  sourceCurrency: CurrencyCode,
  targetCurrency: CurrencyCode,
  fxRate: number,
  baseCurrency: CurrencyCode = "EUR"
) => {
  if (!Number.isFinite(value)) return value;
  if (sourceCurrency === targetCurrency) return value;
  if (baseCurrency === "EUR") {
    if (sourceCurrency === "USD" && targetCurrency === "EUR") return value / fxRate;
    if (sourceCurrency === "EUR" && targetCurrency === "USD") return value * fxRate;
  } else {
    if (sourceCurrency === "EUR" && targetCurrency === "USD") return value / fxRate;
    if (sourceCurrency === "USD" && targetCurrency === "EUR") return value * fxRate;
  }
  return value;
};

export const inferCurrencyFromTicker = (
  ticker: string,
  fallback: CurrencyCode = "EUR"
): CurrencyCode => {
  const cleaned = ticker.trim().toUpperCase();
  const [exchange, rawSymbol] = cleaned.includes(":") ? cleaned.split(":") : ["", cleaned];
  if (exchange && EUR_EXCHANGES.has(exchange)) return "EUR";
  for (const suffix of EUR_SUFFIXES) {
    if (rawSymbol.endsWith(suffix)) return "EUR";
  }
  return fallback === "EUR" ? "USD" : "USD";
};

export const formatPercent = (value: number) => percentFormatter.format(value);
