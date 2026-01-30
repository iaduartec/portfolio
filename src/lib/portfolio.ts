import { Transaction } from "@/types/transactions";
import { Holding, PortfolioSummary, RealizedTrade } from "@/types/portfolio";
import { convertCurrencyFrom, inferCurrencyFromTicker, type CurrencyCode } from "@/lib/formatters";

export type PriceSnapshot = {
  name?: string;
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
};

type PositionLot = {
  quantity: number;
  costPerShare: number;
};

const sumLots = (lots: PositionLot[]) =>
  lots.reduce((total, lot) => total + lot.quantity, 0);

const sumLotCost = (lots: PositionLot[]) =>
  lots.reduce((total, lot) => total + lot.quantity * lot.costPerShare, 0);

export const computeHoldings = (
  transactions: Transaction[],
  priceMap: Record<string, PriceSnapshot>,
  fxRate: number,
  baseCurrency: CurrencyCode
): Holding[] => {
  const quantityEpsilon = 1e-6;
  const positions = new Map<
    string,
    { lots: PositionLot[]; lastPriceRaw: number; currency: CurrencyCode }
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
    if (!tx.ticker) return;
    const currency = tx.currency ?? inferCurrencyFromTicker(tx.ticker);
    const entry = positions.get(tx.ticker) ?? {
      lots: [],
      lastPriceRaw: 0,
      currency,
    };
    const fee = tx.fee ?? 0;
    if (!entry.currency) entry.currency = currency;
    if (Number.isFinite(tx.price) && tx.price > 0) {
      entry.lastPriceRaw = tx.price;
    }
    const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, fxRate, baseCurrency);
    const feeBase = convertCurrencyFrom(fee, currency, baseCurrency, fxRate, baseCurrency);

    if (tx.type === "BUY") {
      const totalCost = tx.quantity * priceBase + feeBase;
      const costPerShare = tx.quantity > 0 ? totalCost / tx.quantity : priceBase;
      entry.lots.push({ quantity: tx.quantity, costPerShare });
    } else if (tx.type === "SELL") {
      let remaining = tx.quantity;
      while (remaining > quantityEpsilon && entry.lots.length > 0) {
        const lot = entry.lots[0];
        const sold = Math.min(lot.quantity, remaining);
        lot.quantity -= sold;
        remaining -= sold;
        if (lot.quantity <= quantityEpsilon) entry.lots.shift();
      }
    } else if (tx.type === "FEE" && feeBase > 0) {
      const totalQty = sumLots(entry.lots);
      if (totalQty > quantityEpsilon) {
        const feePerShare = feeBase / totalQty;
        entry.lots = entry.lots.map((lot) => ({
          ...lot,
          costPerShare: lot.costPerShare + feePerShare,
        }));
      }
    }

    positions.set(tx.ticker, entry);
  });

  return Array.from(positions.entries())
    .map(([ticker, data]) => {
      const tickerKey = ticker.toUpperCase();
      const totalQuantity = sumLots(data.lots);
      if (totalQuantity <= quantityEpsilon) return null;
      const totalCost = sumLotCost(data.lots);
      const averageBuyPrice = totalCost / totalQuantity;
      const override = priceMap[tickerKey];
      const currency = data.currency ?? inferCurrencyFromTicker(tickerKey);
      const fallbackRaw = Number.isFinite(data.lastPriceRaw) && data.lastPriceRaw > 0
        ? data.lastPriceRaw
        : undefined;
      const currentPriceRaw = Number.isFinite(override?.price)
        ? override?.price
        : fallbackRaw;
      const currentPriceBase = Number.isFinite(currentPriceRaw)
        ? convertCurrencyFrom(currentPriceRaw!, currency, baseCurrency, fxRate, baseCurrency)
        : averageBuyPrice;
      const marketValue = totalQuantity * currentPriceBase;
      const pnlValue = marketValue - totalCost;
      const pnlPercent = totalCost > 0 ? (pnlValue / totalCost) * 100 : 0;
      const dayChange =
        override?.dayChange !== undefined
          ? convertCurrencyFrom(override.dayChange, currency, baseCurrency, fxRate, baseCurrency) * totalQuantity
          : undefined;
      const dayChangePercent = override?.dayChangePercent;

      // Find the name from the last transaction for this ticker (CSV fallback)
      const lastTxWithName = ordered.filter(tx => tx.ticker === ticker && tx.name).pop();

      const holding: Holding = {
        ticker,
        name: override?.name || lastTxWithName?.name,
        currency,
        totalQuantity,
        averageBuyPrice,
        currentPrice: currentPriceBase,
        marketValue,
        pnlValue,
        pnlPercent,
        ...(dayChange !== undefined ? { dayChange } : {}),
        ...(dayChangePercent !== undefined ? { dayChangePercent } : {}),
      };
      return holding;
    })
    .filter((holding): holding is Holding => holding !== null);
};

export const computeSummary = (holdings: Holding[]): PortfolioSummary => {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalPnl = holdings.reduce((sum, holding) => sum + holding.pnlValue, 0);

  return {
    totalValue,
    totalPnl,
    dailyPnl: holdings.reduce((sum, holding) => sum + (holding.dayChange ?? 0), 0),
  };
};

export const computeRealizedTrades = (
  transactions: Transaction[],
  fxRate: number,
  baseCurrency: CurrencyCode
): RealizedTrade[] => {
  const positions = new Map<string, { lots: PositionLot[]; currency: CurrencyCode }>();
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
    if (!tx.ticker) return;
    const currency = tx.currency ?? inferCurrencyFromTicker(tx.ticker);
    const entry = positions.get(tx.ticker) ?? { lots: [], currency };
    const fee = tx.fee ?? 0;
    if (!entry.currency) entry.currency = currency;
    const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, fxRate, baseCurrency);
    const feeBase = convertCurrencyFrom(fee, currency, baseCurrency, fxRate, baseCurrency);

    if (tx.type === "BUY") {
      const totalCost = tx.quantity * priceBase + feeBase;
      const costPerShare = tx.quantity > 0 ? totalCost / tx.quantity : priceBase;
      entry.lots.push({ quantity: tx.quantity, costPerShare });
    } else if (tx.type === "SELL") {
      let remaining = tx.quantity;
      let soldQuantity = 0;
      let soldCost = 0;
      while (remaining > 0 && entry.lots.length > 0) {
        const lot = entry.lots[0];
        const sold = Math.min(lot.quantity, remaining);
        lot.quantity -= sold;
        remaining -= sold;
        soldQuantity += sold;
        soldCost += sold * lot.costPerShare;
        if (lot.quantity <= 0) entry.lots.shift();
      }
      if (soldQuantity > 0) {
        const pnlValue = soldQuantity * priceBase - soldCost - feeBase;
        const entryPrice = soldQuantity > 0 ? soldCost / soldQuantity : 0;
        realized.push({
          id: `${tx.ticker}-${tx.date}-${idx}`,
          ticker: tx.ticker,
          currency,
          date: tx.date,
          quantity: soldQuantity,
          entryPrice,
          exitPrice: priceBase,
          pnlValue,
        });
      }
    }

    positions.set(tx.ticker, entry);
  });

  return realized;
};
