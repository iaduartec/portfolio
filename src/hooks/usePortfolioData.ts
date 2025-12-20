import { useEffect, useMemo, useState } from "react";
import { loadStoredTransactions, TRANSACTIONS_UPDATED_EVENT } from "@/lib/storage";
import { Holding, PortfolioSummary, RealizedTrade } from "@/types/portfolio";
import { Transaction } from "@/types/transactions";

type PriceSnapshot = {
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
};

const computeHoldings = (
  transactions: Transaction[],
  priceMap: Record<string, PriceSnapshot>
): Holding[] => {
  const positions = new Map<string, { quantity: number; cost: number; lastPrice: number }>();
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
    const entry = positions.get(tx.ticker) ?? { quantity: 0, cost: 0, lastPrice: 0 };
    const fee = tx.fee ?? 0;

    if (tx.type === "BUY") {
      entry.cost += tx.quantity * tx.price + fee;
      entry.quantity += tx.quantity;
      entry.lastPrice = tx.price;
    } else if (tx.type === "SELL") {
      const avgCost = entry.quantity > 0 ? entry.cost / entry.quantity : 0;
      const qtySold = Math.min(entry.quantity, tx.quantity);
      entry.quantity = Math.max(0, entry.quantity - tx.quantity);
      entry.cost = Math.max(0, entry.cost - avgCost * qtySold);
      entry.lastPrice = tx.price;
    } else if (tx.type === "FEE") {
      entry.cost += fee;
    } else {
      entry.lastPrice = entry.lastPrice || tx.price || entry.lastPrice;
    }

    positions.set(tx.ticker, entry);
  });

  return Array.from(positions.entries())
    .map(([ticker, data]) => {
      const tickerKey = ticker.toUpperCase();
      const averageBuyPrice = data.quantity > 0 ? data.cost / data.quantity : 0;
      const override = priceMap[tickerKey];
      const currentPrice = override?.price ?? (data.lastPrice || averageBuyPrice);
      const marketValue = data.quantity * currentPrice;
      const pnlValue = marketValue - data.cost;
      const pnlPercent = data.cost > 0 ? (pnlValue / data.cost) * 100 : 0;

      return {
        ticker,
        totalQuantity: data.quantity,
        averageBuyPrice,
        currentPrice,
        dayChange: override?.dayChange,
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

const computeRealizedTrades = (transactions: Transaction[]): RealizedTrade[] => {
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

    if (tx.type === "BUY") {
      const totalCost = entry.averageCost * entry.quantity + tx.quantity * tx.price + fee;
      entry.quantity += tx.quantity;
      entry.averageCost = entry.quantity > 0 ? totalCost / entry.quantity : 0;
    } else if (tx.type === "SELL") {
      const qtySold = Math.min(entry.quantity, tx.quantity);
      if (qtySold > 0) {
        const pnlValue = (tx.price - entry.averageCost) * qtySold - fee;
        realized.push({
          id: `${tx.ticker}-${tx.date}-${idx}`,
          ticker: tx.ticker,
          date: tx.date,
          quantity: qtySold,
          entryPrice: entry.averageCost,
          exitPrice: tx.price,
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

  const holdings = useMemo(() => computeHoldings(transactions, priceMap), [transactions, priceMap]);
  const summary = useMemo(() => computeSummary(holdings), [holdings]);
  const realizedTrades = useMemo(() => computeRealizedTrades(transactions), [transactions]);
  const hasTransactions = transactions.length > 0;

  useEffect(() => {
    const tickers = Array.from(new Set(transactions.map((tx) => tx.ticker))).filter(Boolean);
    if (tickers.length === 0) return;
    const controller = new AbortController();
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
      .catch(() => {});

    return () => controller.abort();
  }, [transactions]);

  return { transactions, holdings, summary, realizedTrades, hasTransactions };
}
