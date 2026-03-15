import { Transaction } from "@/types/transactions";
import { Holding, PortfolioSummary, RealizedTrade } from "@/types/portfolio";
import { convertCurrencyFrom, inferCurrencyFromTicker, type CurrencyCode } from "@/lib/formatters";
import { isNonInvestmentTicker } from "@/lib/portfolioGroups";

export type PriceSnapshot = {
  name?: string;
  price: number;
  dayChange?: number;
  dayChangePercent?: number;
};

export type PositionAuditSnapshot = {
  ticker: string;
  account?: Transaction["account"];
  currency: CurrencyCode;
  openQuantity: number;
  averageEntryPriceRaw: number;
  totalCostRaw: number;
};

type PositionLot = {
  quantity: number;
  costPerShare: number;
};

const buildPositionKey = (tx: Pick<Transaction, "ticker" | "account">) =>
  `${tx.account ?? "UNASSIGNED"}::${tx.ticker}`;

const sumLots = (lots: PositionLot[]) =>
  lots.reduce((total, lot) => total + lot.quantity, 0);

const sumLotCost = (lots: PositionLot[]) =>
  lots.reduce((total, lot) => total + lot.quantity * lot.costPerShare, 0);

const getTransactionCurrency = (tx: Transaction, baseCurrency: CurrencyCode) => {
  if (tx.currency) return tx.currency;
  if (tx.ticker) return inferCurrencyFromTicker(tx.ticker);
  return baseCurrency;
};

const getTransactionGrossAmount = (tx: Transaction) => {
  if (Number.isFinite(tx.grossAmount) && (tx.grossAmount ?? 0) !== 0) {
    return Math.abs(tx.grossAmount ?? 0);
  }
  const hasQuantity = Number.isFinite(tx.quantity) && tx.quantity !== 0;
  const hasPrice = Number.isFinite(tx.price) && tx.price !== 0;
  if (hasQuantity && hasPrice) return tx.quantity * tx.price;
  if (hasPrice) return Math.abs(tx.price);
  if (hasQuantity) return tx.quantity;
  return 0;
};

const getTransactionSignedAmount = (tx: Transaction) => {
  if (Number.isFinite(tx.grossAmount) && (tx.grossAmount ?? 0) !== 0) {
    return tx.grossAmount ?? 0;
  }
  const gross = getTransactionGrossAmount(tx);
  if (tx.type === "BUY" || tx.type === "FEE") return -gross;
  if (tx.type === "SELL" || tx.type === "DIVIDEND") return gross;
  if (Number.isFinite(tx.price) && tx.price !== 0) return tx.price;
  return gross;
};

const getTransactionFeeAmount = (tx: Transaction) => {
  if (Number.isFinite(tx.fee)) return Math.abs(tx.fee ?? 0);
  if (tx.type !== "FEE") return 0;
  return getTransactionGrossAmount(tx);
};

const normalizeZero = (value: number) => (Math.abs(value) < 1e-6 ? 0 : value);
const quantityEpsilon = 1e-6;

export const computeCashBalancesByCurrency = (
  transactions: Transaction[],
  baseCurrency: CurrencyCode,
) => {
  const balances = new Map<CurrencyCode, number>();
  const ordered = [...transactions].sort((a, b) => {
    const timeA = Date.parse(a.date);
    const timeB = Date.parse(b.date);
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return 0;
  });

  for (const tx of ordered) {
    const currency = getTransactionCurrency(tx, baseCurrency);
    const current = balances.get(currency) ?? 0;
    const gross = getTransactionGrossAmount(tx);
    const signed = getTransactionSignedAmount(tx);
    const fee = getTransactionFeeAmount(tx);
    const isExternalCashFlow = tx.type === "OTHER" && (!tx.ticker || isNonInvestmentTicker(tx.ticker));

    let delta = 0;
    if (isExternalCashFlow) {
      delta = signed;
    } else if (tx.type === "BUY") {
      delta = -(gross + fee);
    } else if (tx.type === "SELL") {
      delta = gross - fee;
    } else if (tx.type === "DIVIDEND") {
      delta = signed >= 0 ? signed - fee : signed + fee;
    } else if (tx.type === "FEE") {
      delta = -fee;
    }

    balances.set(currency, normalizeZero(current + delta));
  }

  return balances;
};

export const computeCashBalanceBase = (
  transactions: Transaction[],
  fxRate: number,
  baseCurrency: CurrencyCode,
) => {
  const balances = computeCashBalancesByCurrency(transactions, baseCurrency);
  let total = 0;
  for (const [currency, amount] of balances.entries()) {
    total += convertCurrencyFrom(amount, currency, baseCurrency, fxRate, baseCurrency);
  }
  return normalizeZero(total);
};

export const computePositionAuditSnapshot = (
  transactions: Transaction[],
  ticker: string,
  account?: Transaction["account"],
): PositionAuditSnapshot | null => {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) return null;

  const relevant = [...transactions]
    .filter((tx) => tx.ticker?.trim().toUpperCase() === normalizedTicker)
    .filter((tx) => (account ? tx.account === account : true))
    .sort((a, b) => {
      const timeA = Date.parse(a.date);
      const timeB = Date.parse(b.date);
      if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      return 0;
    });

  if (relevant.length === 0) return null;

  const currency = relevant.find((tx) => tx.currency)?.currency ?? inferCurrencyFromTicker(normalizedTicker);
  let openQuantity = 0;
  let totalCostRaw = 0;

  for (const tx of relevant) {
    const fee = Math.abs(tx.fee ?? 0);

    if (tx.type === "BUY") {
      openQuantity += tx.quantity;
      totalCostRaw += tx.quantity * tx.price + fee;
      continue;
    }

    if (tx.type === "SELL") {
      if (tx.quantity > openQuantity + quantityEpsilon) {
        throw new Error(`Sell quantity exceeds open position for ${normalizedTicker}`);
      }
      if (openQuantity > quantityEpsilon) {
        const averageCost = totalCostRaw / openQuantity;
        totalCostRaw -= averageCost * tx.quantity;
        openQuantity -= tx.quantity;
      }
      continue;
    }

    if (tx.type === "FEE" && openQuantity > quantityEpsilon) {
      totalCostRaw += fee;
    }
  }

  if (openQuantity <= quantityEpsilon) return null;

  return {
    ticker: normalizedTicker,
    account,
    currency,
    openQuantity: normalizeZero(openQuantity),
    averageEntryPriceRaw: totalCostRaw / openQuantity,
    totalCostRaw: normalizeZero(totalCostRaw),
  };
};

export const computeHoldings = (
  transactions: Transaction[],
  priceMap: Record<string, PriceSnapshot>,
  fxRate: number,
  baseCurrency: CurrencyCode
): Holding[] => {
  const positions = new Map<
    string,
    {
      ticker: string;
      account: Transaction["account"];
      lots: PositionLot[];
      lastPriceRaw: number;
      currency: CurrencyCode;
    }
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
    const key = buildPositionKey(tx);
    const entry = positions.get(key) ?? {
      ticker: tx.ticker,
      account: tx.account,
      lots: [],
      lastPriceRaw: 0,
      currency,
    };
    const fee = tx.fee ?? 0;
    const tradeFxRate = tx.fxRate ?? fxRate;
    if (!entry.currency) entry.currency = currency;
    if (Number.isFinite(tx.price) && tx.price > 0) {
      entry.lastPriceRaw = tx.price;
    }
    const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, tradeFxRate, baseCurrency);
    const feeBase = convertCurrencyFrom(fee, currency, baseCurrency, tradeFxRate, baseCurrency);

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

    positions.set(key, entry);
  });

  return Array.from(positions.entries())
    .map(([, data]) => {
      const tickerKey = data.ticker.toUpperCase();
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
      const lastTxWithName = ordered.filter((tx) => tx.ticker === data.ticker && tx.name).pop();

      const holding: Holding = {
        ticker: data.ticker,
        name: override?.name || lastTxWithName?.name,
        currency,
        account: data.account,
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
  const tickerNameMap = new Map<string, string>();

  ordered.forEach((tx) => {
    if (tx.ticker && tx.name?.trim()) {
      tickerNameMap.set(tx.ticker, tx.name.trim());
    }
  });

  ordered.forEach((tx, idx) => {
    if (!tx.ticker) return;
    const currency = tx.currency ?? inferCurrencyFromTicker(tx.ticker);
    const key = buildPositionKey(tx);
    const entry = positions.get(key) ?? { lots: [], currency };
    const fee = tx.fee ?? 0;
    const tradeFxRate = tx.fxRate ?? fxRate;
    if (!entry.currency) entry.currency = currency;
    const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, tradeFxRate, baseCurrency);
    const feeBase = convertCurrencyFrom(fee, currency, baseCurrency, tradeFxRate, baseCurrency);

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
          name: tickerNameMap.get(tx.ticker) ?? tx.name,
          currency,
          account: tx.account,
          date: tx.date,
          quantity: soldQuantity,
          entryPrice,
          exitPrice: priceBase,
          pnlValue,
        });
      }
    }

    positions.set(key, entry);
  });

  return realized;
};
