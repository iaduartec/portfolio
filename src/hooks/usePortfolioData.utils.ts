import { Transaction, TransactionType } from "@/types/transactions";
import { CurrencyCode } from "@/lib/formatters";

export type ParsedRow = Record<string, string | number>;

export const fieldAliases: Record<keyof Transaction, string[]> = {
  date: ["date", "closing time", "close_time", "datetime", "trade_date"],
  ticker: ["ticker", "symbol", "asset", "isin"],
  type: ["type", "side", "action"],
  quantity: ["quantity", "qty", "shares", "units", "qty shares"],
  price: [
    "price",
    "fill price",
    "fill_price",
    "avg_price",
    "cost",
    "price per share",
    "total amount",
  ],
  fee: ["fee", "fees", "commission", "broker fee"],
  currency: ["currency", "ccy", "currency_code", "moneda"],
};

export const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const pickField = (row: ParsedRow, candidates: string[]) => {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase().trim();
    if (candidates.includes(normalizedKey)) return value;
  }
  return undefined;
};

export const normalizeType = (raw: string): TransactionType => {
  const upper = raw.toUpperCase();
  if (upper.includes("BUY")) return "BUY";
  if (upper.includes("SELL")) return "SELL";
  if (upper.includes("DIVIDEND") || upper.includes("DIV")) return "DIVIDEND";
  if (upper.includes("FEE") || upper.includes("COMMISSION")) return "FEE";
  if (upper.includes("CASH")) return "OTHER"; // Transacciones de efectivo
  return "OTHER";
};

export const normalizeCurrency = (raw: unknown): CurrencyCode | undefined => {
  if (!raw) return undefined;
  const normalized = String(raw).trim().toUpperCase();
  if (normalized === "EUR" || normalized === "USD")
    return normalized as CurrencyCode;
  return undefined;
};

export const toTransaction = (row: ParsedRow): Transaction | null => {
  const dateRaw = pickField(
    row,
    fieldAliases.date.map((a) => a.toLowerCase()),
  );
  const tickerRaw = pickField(
    row,
    fieldAliases.ticker.map((a) => a.toLowerCase()),
  );
  const typeRaw = pickField(
    row,
    fieldAliases.type.map((a) => a.toLowerCase()),
  );
  const qtyRaw = pickField(
    row,
    fieldAliases.quantity.map((a) => a.toLowerCase()),
  );
  const priceRaw = pickField(
    row,
    fieldAliases.price.map((a) => a.toLowerCase()),
  );
  const feeRaw = pickField(
    row,
    fieldAliases.fee.map((a) => a.toLowerCase()),
  );
  const currencyRaw = pickField(
    row,
    fieldAliases.currency.map((a) => a.toLowerCase()),
  );

  const date = dateRaw ? String(dateRaw).trim() : "";
  const ticker = tickerRaw ? String(tickerRaw).trim().toUpperCase() : "";
  const type = typeRaw ? normalizeType(String(typeRaw).trim()) : "OTHER";
  const quantity = normalizeNumber(qtyRaw) ?? 0;
  const price = normalizeNumber(priceRaw) ?? 0;
  const fee =
    feeRaw !== undefined ? (normalizeNumber(feeRaw) ?? undefined) : undefined;
  const currency = normalizeCurrency(currencyRaw);

  // Requerir solo date; ticker puede estar vacío para transacciones de efectivo
  if (!date) {
    return null;
  }

  return { date, ticker, type, quantity, price, fee, currency };
};
