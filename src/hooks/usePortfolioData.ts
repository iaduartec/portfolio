import { useEffect, useMemo, useState } from "react";
import { loadStoredTransactions, TRANSACTIONS_UPDATED_EVENT } from "@/lib/storage";
import { Holding, PortfolioSummary, RealizedTrade } from "@/types/portfolio";
import { Transaction } from "@/types/transactions";
import { convertCurrencyFrom, inferCurrencyFromTicker, type CurrencyCode } from "@/lib/formatters";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type PriceSnapshot = {
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
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
    const sync = () => setTransactions(loadStoredTransactions());

    sync();
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
