import { InvestmentAccount, Transaction, TransactionType } from "@/types/transactions";
import { CurrencyCode } from "@/lib/formatters";
import { isFundTicker, isNonInvestmentTicker } from "@/lib/portfolioGroups";

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
  fxRate: ["fx rate", "fx_rate", "exchange rate", "conversion rate"],
  grossAmount: ["total amount", "cost", "amount", "gross amount"],
  account: ["account", "portfolio", "source_account"],
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

type ToTransactionOptions = {
  account?: InvestmentAccount;
};

const inferAccountFromTicker = (ticker: string): InvestmentAccount | undefined => {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker || isNonInvestmentTicker(normalizedTicker)) return undefined;
  return isFundTicker(normalizedTicker) ? "ROBO_ADVISOR" : "BROKERAGE";
};

export const inferAccountFromRows = (rows: ParsedRow[]): InvestmentAccount => {
  let roboSignals = 0;
  let brokerageSignals = 0;

  for (const row of rows) {
    const tickerRaw = pickField(
      row,
      fieldAliases.ticker.map((alias) => alias.toLowerCase()),
    );
    const typeRaw = pickField(
      row,
      fieldAliases.type.map((alias) => alias.toLowerCase()),
    );

    const ticker = tickerRaw ? normalizeTicker(String(tickerRaw)) : "";
    const inferredFromTicker = ticker ? inferAccountFromTicker(ticker) : undefined;
    if (inferredFromTicker === "ROBO_ADVISOR") {
      roboSignals += 2;
      continue;
    }
    if (inferredFromTicker === "BROKERAGE") {
      brokerageSignals += 2;
      continue;
    }

    const upperType = typeRaw ? String(typeRaw).trim().toUpperCase() : "";
    if (upperType.includes("ROBO")) {
      roboSignals += 3;
      continue;
    }
  }

  return roboSignals > brokerageSignals ? "ROBO_ADVISOR" : "BROKERAGE";
};

export const backfillTransactionAccounts = (
  transactions: Transaction[],
): Transaction[] => {
  const normalizeTransactionAmounts = (transaction: Transaction): Transaction => {
    const normalizedTicker = transaction.ticker
      ? resolveTradingViewSymbol(transaction.ticker.trim().toUpperCase())
      : transaction.ticker;
    if (!Number.isFinite(transaction.grossAmount)) {
      return { ...transaction, ticker: normalizedTicker };
    }
    if (transaction.type === "BUY" || transaction.type === "SELL") {
      return {
        ...transaction,
        ticker: normalizedTicker,
        grossAmount: Math.abs(transaction.grossAmount ?? 0),
      };
    }
    const inferredSign =
      Number.isFinite(transaction.price) && transaction.price !== 0
        ? Math.sign(transaction.price)
        : Math.sign(transaction.grossAmount ?? 0);
    if (inferredSign === 0) return { ...transaction, ticker: normalizedTicker };
    return {
      ...transaction,
      ticker: normalizedTicker,
      grossAmount: Math.abs(transaction.grossAmount ?? 0) * inferredSign,
    };
  };

  const annotated = transactions.map((transaction, index) => ({
    transaction: normalizeTransactionAmounts(transaction),
    index,
    timestamp: Date.parse(transaction.date),
  }));

  for (const entry of annotated) {
    if (entry.transaction.account) continue;
    const inferred = entry.transaction.ticker
      ? inferAccountFromTicker(entry.transaction.ticker)
      : undefined;
    if (inferred) {
      entry.transaction.account = inferred;
      continue;
    }
    if (entry.transaction.type === "FEE") {
      entry.transaction.account = "ROBO_ADVISOR";
    }
  }

  const findNearestAssignedAccount = (position: number): InvestmentAccount | undefined => {
    let previous: { account: InvestmentAccount; distance: number } | undefined;
    let next: { account: InvestmentAccount; distance: number } | undefined;

    for (let left = position - 1; left >= 0; left -= 1) {
      const candidate = annotated[left];
      if (!candidate.transaction.account || !Number.isFinite(candidate.timestamp)) continue;
      previous = {
        account: candidate.transaction.account,
        distance: Math.abs((annotated[position].timestamp || 0) - candidate.timestamp),
      };
      break;
    }

    for (let right = position + 1; right < annotated.length; right += 1) {
      const candidate = annotated[right];
      if (!candidate.transaction.account || !Number.isFinite(candidate.timestamp)) continue;
      next = {
        account: candidate.transaction.account,
        distance: Math.abs(candidate.timestamp - (annotated[position].timestamp || 0)),
      };
      break;
    }

    if (previous && next) {
      if (previous.account === next.account) return previous.account;
      return previous.distance <= next.distance ? previous.account : next.account;
    }
    return previous?.account ?? next?.account;
  };

  for (let index = 0; index < annotated.length; index += 1) {
    if (annotated[index].transaction.account) continue;
    annotated[index].transaction.account = findNearestAssignedAccount(index) ?? "BROKERAGE";
  }

  return annotated
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.transaction);
};

const inferImplicitFee = (
  type: TransactionType,
  quantity: number,
  unitPrice: number | null,
  totalAmount: number | null,
  unitPriceRaw: unknown,
  totalAmountRaw: unknown,
) => {
  if ((type !== "BUY" && type !== "SELL") || unitPrice === null || totalAmount === null) {
    return undefined;
  }

  const inferDisplayedPrecision = (value: unknown) => {
    if (typeof value !== "string") return 2;
    const match = value.trim().match(/(\d+)([.,](\d+))?\s*$/);
    return match?.[3]?.length ?? 0;
  };

  const absoluteQuantity = Math.abs(quantity);
  if (!Number.isFinite(absoluteQuantity) || absoluteQuantity <= 0) {
    return undefined;
  }

  const gross = absoluteQuantity * Math.abs(unitPrice);
  const settled = Math.abs(totalAmount);
  const displayedPricePrecision = inferDisplayedPrecision(unitPriceRaw);
  const displayedAmountPrecision = inferDisplayedPrecision(totalAmountRaw);
  const roundingTolerance =
    absoluteQuantity * 0.5 * 10 ** -displayedPricePrecision +
    0.5 * 10 ** -displayedAmountPrecision;
  const fee = settled - gross - roundingTolerance;
  if (!Number.isFinite(fee) || fee <= 0.01) {
    return undefined;
  }
  return Number(fee.toFixed(6));
};

export const toTransaction = (
  row: ParsedRow,
  options?: ToTransactionOptions,
): Transaction | null => {
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
  const fxRateRaw = pickField(
    row,
    fieldAliases.fxRate.map((a) => a.toLowerCase()),
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
  let price: number;

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
  const parsedFee =
    feeRaw !== undefined ? (normalizeNumber(feeRaw) ?? undefined) : undefined;
  const inferredFee = inferImplicitFee(
    type,
    quantity,
    unitPrice,
    totalAmount,
    unitPriceRaw,
    totalAmountRaw,
  );
  const fee = parsedFee ?? inferredFee;
  const fxRate = normalizeNumber(fxRateRaw) ?? undefined;
  const currency = normalizeCurrency(currencyRaw);
  const name = nameRaw ? String(nameRaw).trim() : undefined;
  const inferredAccount = ticker ? inferAccountFromTicker(ticker) : undefined;

  // Requerir solo date; ticker puede estar vacío para transacciones de efectivo
  if (!date) {
    return null;
  }

  return {
    date,
    ticker,
    name,
    type,
    quantity: Math.abs(quantity),
    price,
    fee,
    currency,
    fxRate,
    grossAmount: totalAmount ?? undefined,
    account: options?.account ?? inferredAccount,
  };
};
