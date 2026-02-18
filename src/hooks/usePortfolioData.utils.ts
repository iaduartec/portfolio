import { Transaction, TransactionType } from "@/types/transactions";
import { CurrencyCode } from "@/lib/formatters";

import { resolveTradingViewSymbol, TRADINGVIEW_TICKER_OVERRIDES } from "@/lib/marketSymbols";

export const TICKER_SUFFIX_OVERRIDES = TRADINGVIEW_TICKER_OVERRIDES;

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
  name: ["name", "company", "description", "asset name", "nombre"],
};

export const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const stripped = value.replace(/[^\d,.-]/g, "");
  if (!stripped) return null;
  const hasComma = stripped.includes(",");
  const hasDot = stripped.includes(".");
  let cleaned = stripped;
  if (hasComma && hasDot) {
    const lastComma = stripped.lastIndexOf(",");
    const lastDot = stripped.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = stripped.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = stripped.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = stripped.replace(",", ".");
  }
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

const pickFieldEntry = (row: ParsedRow, candidates: string[]) => {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase().trim();
    if (candidates.includes(normalizedKey)) return { key: normalizedKey, value };
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

export const normalizeTicker = (raw: string): string => {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return cleaned;
  return resolveTradingViewSymbol(cleaned);
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
  const unitPriceRaw = pickField(row, ["price per share", "fill price", "price", "avg_price"]);
  const totalAmountRaw = pickField(row, ["total amount", "cost"]);
  const fallbackPriceEntry = pickFieldEntry(
    row,
    ["price", "fill price", "avg_price", "cost", "total amount"],
  );
  const feeRaw = pickField(
    row,
    fieldAliases.fee.map((a) => a.toLowerCase()),
  );
  const currencyRaw = pickField(
    row,
    fieldAliases.currency.map((a) => a.toLowerCase()),
  );
  const nameRaw = pickField(
    row,
    fieldAliases.name.map((a) => a.toLowerCase()),
  );

  const date = dateRaw ? String(dateRaw).trim() : "";
  const ticker = tickerRaw ? normalizeTicker(String(tickerRaw)) : "";
  const type = typeRaw ? normalizeType(String(typeRaw).trim()) : "OTHER";
  const quantity = normalizeNumber(qtyRaw) ?? 0;
  const unitPrice = normalizeNumber(unitPriceRaw);
  const totalAmount = normalizeNumber(totalAmountRaw);
  let price = 0;

  if (unitPrice !== null && Number.isFinite(unitPrice) && unitPrice !== 0) {
    price = unitPrice;
  } else if (totalAmount !== null && Number.isFinite(totalAmount)) {
    const qty = Math.abs(quantity);
    price = qty > 0 ? totalAmount / qty : totalAmount;
  } else {
    price = normalizeNumber(fallbackPriceEntry?.value) ?? 0;
    if (fallbackPriceEntry?.key === "total amount") {
      const qty = Math.abs(quantity);
      if (Number.isFinite(qty) && qty > 0) {
        price = price / qty;
      }
    }
  }
  const fee =
    feeRaw !== undefined ? (normalizeNumber(feeRaw) ?? undefined) : undefined;
  const currency = normalizeCurrency(currencyRaw);
  const name = nameRaw ? String(nameRaw).trim() : undefined;

  // Requerir solo date; ticker puede estar vacío para transacciones de efectivo
  if (!date) {
    return null;
  }

  return { date, ticker, name, type, quantity, price, fee, currency };
};
