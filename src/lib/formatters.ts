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

export const formatPercent = (value: number) => percentFormatter.format(value);
