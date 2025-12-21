export type CurrencyCode = "EUR" | "USD";

const currencyFormatterCache = new Map<CurrencyCode, Intl.NumberFormat>();

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

export const formatPercent = (value: number) => percentFormatter.format(value);
