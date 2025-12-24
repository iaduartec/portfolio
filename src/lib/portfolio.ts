import { Transaction, TransactionType } from "@/types/transactions";
import { Holding, PortfolioSummary, RealizedTrade } from "@/types/portfolio";
import { convertCurrencyFrom, inferCurrencyFromTicker, type CurrencyCode } from "@/lib/formatters";

export type PriceSnapshot = {
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
};

export const computeHoldings = (
  transactions: Transaction[],
  priceMap: Record<string, PriceSnapshot>,
  fxRate: number,
  baseCurrency: CurrencyCode
): Holding[] => {
  const positions = new Map<
    string,
    { quantity: number; cost: number; lastPrice: number; currency: CurrencyCode }
  >();
  
  const ordered = [...transactions].sort((a, b) => {
    const timeA = Date.parse(a.date);
    const timeB = Date.parse(b.date);
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return 0; // Maintain stable order for same timestamps
  });

  ordered.forEach((tx) => {
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

export const computeSummary = (holdings: Holding[]): PortfolioSummary => {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalPnl = holdings.reduce((sum, holding) => sum + holding.pnlValue, 0);

  return {
    totalValue,
    totalPnl,
    dailyPnl: 0,
  };
};

export const computeRealizedTrades = (
  transactions: Transaction[],
  fxRate: number,
  baseCurrency: CurrencyCode
): RealizedTrade[] => {
  const positions = new Map<string, { quantity: number; averageCost: number }>();
  const ordered = [...transactions].sort((a, b) => {
    const timeA = Date.parse(a.date);
    const timeB = Date.parse(b.date);
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return 0;
  });
  
  const realized: RealizedTrade[] = [];

  ordered.forEach((tx, idx) => {
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
