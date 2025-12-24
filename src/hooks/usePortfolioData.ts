import { useEffect, useMemo, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import {
  loadStoredTransactions,
  persistTransactions,
  TRANSACTIONS_UPDATED_EVENT,
} from "@/lib/storage";
import { Holding, PortfolioSummary, RealizedTrade } from "@/types/portfolio";
import { Transaction, TransactionType } from "@/types/transactions";
import { convertCurrencyFrom, inferCurrencyFromTicker, type CurrencyCode } from "@/lib/formatters";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type PriceSnapshot = {
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
};

type ParsedRow = Record<string, string | number>;

const fieldAliases: Record<keyof Transaction, string[]> = {
  date: ["date", "closing time", "close_time", "datetime", "trade_date"],
  ticker: ["ticker", "symbol", "asset", "isin"],
  type: ["type", "side", "action"],
  quantity: ["quantity", "qty", "shares", "units", "qty shares"],
  price: ["price", "fill price", "fill_price", "avg_price", "cost"],
  fee: ["fee", "fees", "commission", "broker fee"],
  currency: ["currency", "ccy", "currency_code", "moneda"],
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickField = (row: ParsedRow, candidates: string[]) => {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase().trim();
    if (candidates.includes(normalizedKey)) return value;
  }
  return undefined;
};

const normalizeType = (raw: string): TransactionType => {
  const upper = raw.toUpperCase();
  if (upper === "BUY" || upper === "SELL") return upper;
  if (upper === "DIVIDEND" || upper === "DIV" || upper === "DIVS") return "DIVIDEND";
  if (upper === "FEE" || upper === "COMMISSION") return "FEE";
  return "OTHER";
};

const normalizeCurrency = (raw: unknown): CurrencyCode | undefined => {
  if (!raw) return undefined;
  const normalized = String(raw).trim().toUpperCase();
  if (normalized === "EUR" || normalized === "USD") return normalized as CurrencyCode;
  return undefined;
};

const toTransaction = (row: ParsedRow): Transaction | null => {
  const dateRaw = pickField(row, fieldAliases.date.map((a) => a.toLowerCase()));
  const tickerRaw = pickField(row, fieldAliases.ticker.map((a) => a.toLowerCase()));
  const typeRaw = pickField(row, fieldAliases.type.map((a) => a.toLowerCase()));
  const qtyRaw = pickField(row, fieldAliases.quantity.map((a) => a.toLowerCase()));
  const priceRaw = pickField(row, fieldAliases.price.map((a) => a.toLowerCase()));
  const feeRaw = pickField(row, fieldAliases.fee.map((a) => a.toLowerCase()));
  const currencyRaw = pickField(row, fieldAliases.currency.map((a) => a.toLowerCase()));

  const date = dateRaw ? String(dateRaw).trim() : "";
  const ticker = tickerRaw ? String(tickerRaw).trim().toUpperCase() : "";
  const type = typeRaw ? normalizeType(String(typeRaw).trim()) : "OTHER";
  const quantity = normalizeNumber(qtyRaw) ?? 0;
  const price = normalizeNumber(priceRaw) ?? 0;
  const fee = feeRaw !== undefined ? normalizeNumber(feeRaw) ?? undefined : undefined;
  const currency = normalizeCurrency(currencyRaw);

  if (!date || !ticker) {
    return null;
  }

  return { date, ticker, type, quantity, price, fee, currency };
};

const computeHoldings = (
  transactions: Transaction[],
  priceMap: Record<string, PriceSnapshot>,
  fxRate: number,
  baseCurrency: CurrencyCode
): Holding[] => {
  const positions = new Map<
    string,
    { quantity: number; cost: number; lastPrice: number; currency: CurrencyCode }
  >();
  const ordered = transactions
    .map((tx, idx) => ({ tx, idx }))
    .sort((a, b) => {
      const timeA = Date.parse(a.tx.date);
      const timeB = Date.parse(b.tx.date);
      if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      return a.idx - b.idx;
    });

  ordered.forEach(({ tx }) => {
    const entry = positions.get(tx.ticker) ?? {
      quantity: 0,
      cost: 0,
      lastPrice: 0,
      currency: tx.currency ?? inferCurrencyFromTicker(tx.ticker),
    };
    const fee = tx.fee ?? 0;
    const currency = tx.currency ?? inferCurrencyFromTicker(tx.ticker);
    if (!entry.currency) {
      entry.currency = currency;
    }
    const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, fxRate, baseCurrency);
    const feeBase = convertCurrencyFrom(fee, currency, baseCurrency, fxRate, baseCurrency);

    if (tx.type === "BUY") {
      entry.cost += tx.quantity * priceBase + feeBase;
      entry.quantity += tx.quantity;
      entry.lastPrice = priceBase;
    } else if (tx.type === "SELL") {
      const avgCost = entry.quantity > 0 ? entry.cost / entry.quantity : 0;
      const qtySold = Math.min(entry.quantity, tx.quantity);
      entry.quantity = Math.max(0, entry.quantity - tx.quantity);
      entry.cost = Math.max(0, entry.cost - avgCost * qtySold);
      entry.lastPrice = priceBase;
    } else if (tx.type === "FEE") {
      entry.cost += feeBase;
    } else {
      entry.lastPrice = entry.lastPrice || priceBase || entry.lastPrice;
    }

    positions.set(tx.ticker, entry);
  });

  return Array.from(positions.entries())
    .map(([ticker, data]) => {
      const tickerKey = ticker.toUpperCase();
      const averageBuyPrice = data.quantity > 0 ? data.cost / data.quantity : 0;
      const override = priceMap[tickerKey];
      const currency = data.currency ?? inferCurrencyFromTicker(tickerKey);
      const currentPriceRaw = override?.price ?? (data.lastPrice || averageBuyPrice);
      const currentPrice = convertCurrencyFrom(
        currentPriceRaw,
        currency,
        baseCurrency,
        fxRate,
        baseCurrency
      );
      const marketValue = data.quantity * currentPrice;
      const pnlValue = marketValue - data.cost;
      const pnlPercent = data.cost > 0 ? (pnlValue / data.cost) * 100 : 0;

      return {
        ticker,
        currency,
        totalQuantity: data.quantity,
        averageBuyPrice,
        currentPrice,
        dayChange:
          override?.dayChange !== undefined
            ? convertCurrencyFrom(override.dayChange, currency, baseCurrency, fxRate, baseCurrency)
            : undefined,
        dayChangePercent: override?.dayChangePercent,
        marketValue,
        pnlValue,
        pnlPercent,
      };
    })
    .filter((holding) => holding.totalQuantity > 0);
};

const computeSummary = (holdings: Holding[]): PortfolioSummary => {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalPnl = holdings.reduce((sum, holding) => sum + holding.pnlValue, 0);

  return {
    totalValue,
    totalPnl,
    dailyPnl: 0,
  };
};

const computeRealizedTrades = (
  transactions: Transaction[],
  fxRate: number,
  baseCurrency: CurrencyCode
): RealizedTrade[] => {
  const positions = new Map<string, { quantity: number; averageCost: number }>();
  const ordered = transactions
    .map((tx, idx) => ({ tx, idx }))
    .sort((a, b) => {
      const timeA = Date.parse(a.tx.date);
      const timeB = Date.parse(b.tx.date);
      if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      return a.idx - b.idx;
    });
  const realized: RealizedTrade[] = [];

  ordered.forEach(({ tx, idx }) => {
    const entry = positions.get(tx.ticker) ?? { quantity: 0, averageCost: 0 };
    const fee = tx.fee ?? 0;
    const currency = tx.currency ?? inferCurrencyFromTicker(tx.ticker);
    const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, fxRate, baseCurrency);
    const feeBase = convertCurrencyFrom(fee, currency, baseCurrency, fxRate, baseCurrency);

    if (tx.type === "BUY") {
      const totalCost = entry.averageCost * entry.quantity + tx.quantity * priceBase + feeBase;
      entry.quantity += tx.quantity;
      entry.averageCost = entry.quantity > 0 ? totalCost / entry.quantity : 0;
    } else if (tx.type === "SELL") {
      const qtySold = Math.min(entry.quantity, tx.quantity);
      if (qtySold > 0) {
        const pnlValue = (priceBase - entry.averageCost) * qtySold - feeBase;
        realized.push({
          id: `${tx.ticker}-${tx.date}-${idx}`,
          ticker: tx.ticker,
          currency,
          date: tx.date,
          quantity: qtySold,
          entryPrice: entry.averageCost,
          exitPrice: priceBase,
          pnlValue,
        });
        entry.quantity = Math.max(0, entry.quantity - qtySold);
        if (entry.quantity === 0) {
          entry.averageCost = 0;
        }
      }
    }

    positions.set(tx.ticker, entry);
  });

  return realized;
};

export function usePortfolioData() {
  const { fxRate, baseCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceSnapshot>>({});

  useEffect(() => {
    const loadDefaultData = async () => {
      const stored = loadStoredTransactions();
      if (stored.length > 0) {
        setTransactions(stored);
        return;
      }

      try {
        const response = await fetch("/Mi cartera_2025-11-29.csv");
        if (!response.ok) return;

        const text = await response.text();
        Papa.parse<ParsedRow>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<ParsedRow>) => {
            const rows = Array.isArray(results.data) ? results.data : [];
            const parsed = rows.map(toTransaction).filter((row): row is Transaction => Boolean(row));
            if (parsed.length > 0) {
              persistTransactions(parsed);
              setTransactions(parsed);
              console.log("INFO: Loaded default portfolio data.");
            }
          },
        });
      } catch (error) {
        console.error("Failed to load default portfolio", error);
      }
    };

    loadDefaultData();

    const sync = () => setTransactions(loadStoredTransactions());
    window.addEventListener("storage", sync);
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, sync);
    };
  }, []);

  const holdings = useMemo(
    () => computeHoldings(transactions, priceMap, fxRate, baseCurrency),
    [transactions, priceMap, fxRate, baseCurrency]
  );
  const summary = useMemo(() => computeSummary(holdings), [holdings]);
  const realizedTrades = useMemo(
    () => computeRealizedTrades(transactions, fxRate, baseCurrency),
    [transactions, fxRate, baseCurrency]
  );
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const hasTransactions = transactions.length > 0;

  useEffect(() => {
    const tickers = Array.from(new Set(transactions.map((tx) => tx.ticker))).filter(Boolean);
    if (tickers.length === 0) {
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => setIsLoadingQuotes(true), 0);

    fetch(`/api/quotes?tickers=${encodeURIComponent(tickers.join(","))}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.quotes) return;
        const nextMap: Record<string, PriceSnapshot> = {};
        for (const quote of data.quotes) {
          if (!quote?.ticker || !Number.isFinite(quote.price)) continue;
          nextMap[quote.ticker.toUpperCase()] = {
            price: quote.price,
            dayChange: Number.isFinite(quote.dayChange) ? quote.dayChange : undefined,
            dayChangePercent: Number.isFinite(quote.dayChangePercent)
              ? quote.dayChangePercent
              : undefined,
          };
        }
        setPriceMap((prev) => ({ ...prev, ...nextMap }));
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingQuotes(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [transactions]);

  return { transactions, holdings, summary, realizedTrades, hasTransactions, isLoading: isLoadingQuotes };
}
