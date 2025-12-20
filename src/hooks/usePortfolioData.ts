import { useEffect, useMemo, useState } from "react";
import { loadStoredTransactions, TRANSACTIONS_UPDATED_EVENT } from "@/lib/storage";
import { Holding, PortfolioSummary } from "@/types/portfolio";
import { Transaction } from "@/types/transactions";

const computeHoldings = (transactions: Transaction[]): Holding[] => {
  const positions = new Map<string, { quantity: number; cost: number; lastPrice: number }>();

  transactions.forEach((tx) => {
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
      entry.cost += fee;
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
      const averageBuyPrice = data.quantity > 0 ? data.cost / data.quantity : 0;
      const currentPrice = data.lastPrice || averageBuyPrice;
      const marketValue = data.quantity * currentPrice;
      const pnlValue = marketValue - data.cost;
      const pnlPercent = data.cost > 0 ? (pnlValue / data.cost) * 100 : 0;

      return {
        ticker,
        totalQuantity: data.quantity,
        averageBuyPrice,
        currentPrice,
        marketValue,
        pnlValue,
        pnlPercent,
      };
    })
    .filter((holding) => holding.totalQuantity > 0 || holding.marketValue > 0 || holding.averageBuyPrice > 0);
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

export function usePortfolioData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

  const holdings = useMemo(() => computeHoldings(transactions), [transactions]);
  const summary = useMemo(() => computeSummary(holdings), [holdings]);
  const hasTransactions = transactions.length > 0;

  return { transactions, holdings, summary, hasTransactions };
}
