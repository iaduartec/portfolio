import {
  Asset,
  CashTransaction,
  CurrencyCode,
  DateRange,
  DividendTransaction,
  PortfolioCalculationError,
  Position,
  Trade,
} from "@/domain/portfolio";

const EPSILON = 1e-9;

type LedgerSellEvent = {
  tradeId: string;
  assetSymbol: string;
  executedAt: string;
  quantity: number;
  feeBase: number;
  allocatedCostBase: number;
  netProceedsBase: number;
  realizedPnLBase: number;
};

type LedgerState = {
  assetSymbol: string;
  totalBoughtQty: number;
  totalSoldQty: number;
  openQty: number;
  averageCostPerUnitBase: number;
  remainingCostBasisBase: number;
  realizedPnLAllTimeBase: number;
  realizedCostBasisSoldBase: number;
  sellEvents: LedgerSellEvent[];
};

const roundTo = (value: number, decimals = 8): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const parseTimestamp = (value: string, fieldName: string): number => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new PortfolioCalculationError(`Invalid date in ${fieldName}: ${value}`);
  }
  return parsed;
};

const normalizeSymbol = (symbol: string, fieldName: string): string => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    throw new PortfolioCalculationError(`Missing symbol in ${fieldName}`);
  }
  return normalized;
};

const validateNonNegative = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new PortfolioCalculationError(`${fieldName} must be a finite number >= 0`);
  }
  return value;
};

const validatePositive = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new PortfolioCalculationError(`${fieldName} must be a finite number > 0`);
  }
  return value;
};

export const convertToBase = (
  amount: number,
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  fxRateToBase: number,
  fieldName: string,
): number => {
  const normalizedAmount = validateNonNegative(amount, fieldName);
  if (currency === baseCurrency) {
    return normalizedAmount;
  }

  const normalizedFxRate = validatePositive(fxRateToBase, `${fieldName} fxRateToBase`);
  return normalizedAmount * normalizedFxRate;
};

export const convertSignedCashToBase = (
  amount: number,
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  fxRateToBase: number,
  fieldName: string,
): number => {
  if (!Number.isFinite(amount)) {
    throw new PortfolioCalculationError(`${fieldName} must be finite`);
  }
  if (amount === 0) {
    return 0;
  }

  const absoluteBaseAmount = convertToBase(
    Math.abs(amount),
    currency,
    baseCurrency,
    fxRateToBase,
    fieldName,
  );
  return amount < 0 ? -absoluteBaseAmount : absoluteBaseAmount;
};

const sortTrades = (trades: readonly Trade[]): Trade[] =>
  [...trades].sort((left, right) => {
    const byTime = parseTimestamp(left.executedAt, `trade ${left.id} executedAt`)
      - parseTimestamp(right.executedAt, `trade ${right.id} executedAt`);
    if (byTime !== 0) {
      return byTime;
    }
    return left.id.localeCompare(right.id);
  });

export const buildTradeLedger = (
  trades: readonly Trade[],
  baseCurrency: CurrencyCode,
): LedgerState => {
  if (trades.length === 0) {
    throw new PortfolioCalculationError("At least one trade is required");
  }

  const assetSymbol = normalizeSymbol(trades[0].assetSymbol, "trade assetSymbol");
  let totalBoughtQty = 0;
  let totalSoldQty = 0;
  let openQty = 0;
  let remainingCostBasisBase = 0;
  let realizedPnLAllTimeBase = 0;
  let realizedCostBasisSoldBase = 0;
  const sellEvents: LedgerSellEvent[] = [];

  for (const trade of sortTrades(trades)) {
    const tradeAssetSymbol = normalizeSymbol(trade.assetSymbol, `trade ${trade.id} assetSymbol`);
    if (tradeAssetSymbol !== assetSymbol) {
      throw new PortfolioCalculationError(
        `calculatePosition received trades for multiple assets: ${assetSymbol} and ${tradeAssetSymbol}`,
      );
    }

    const quantity = validatePositive(trade.quantity, `trade ${trade.id} quantity`);
    const priceBase = convertToBase(
      validatePositive(trade.price, `trade ${trade.id} price`),
      trade.currency,
      baseCurrency,
      trade.fxRateToBase,
      `trade ${trade.id} price`,
    );
    const feeBase = convertToBase(
      validateNonNegative(trade.fee, `trade ${trade.id} fee`),
      trade.currency,
      baseCurrency,
      trade.fxRateToBase,
      `trade ${trade.id} fee`,
    );
    parseTimestamp(trade.executedAt, `trade ${trade.id} executedAt`);

    if (trade.side === "BUY") {
      totalBoughtQty += quantity;
      openQty += quantity;
      remainingCostBasisBase += quantity * priceBase + feeBase;
      continue;
    }

    if (trade.side !== "SELL") {
      throw new PortfolioCalculationError(`Unsupported trade side in trade ${trade.id}`);
    }

    if (quantity > openQty + EPSILON) {
      throw new PortfolioCalculationError(
        `Trade ${trade.id} sells ${quantity} units but only ${roundTo(openQty)} are available`,
      );
    }

    const averageCostPerUnitBaseBeforeSell =
      openQty > EPSILON ? remainingCostBasisBase / openQty : 0;
    const allocatedCostBase = quantity * averageCostPerUnitBaseBeforeSell;
    const netProceedsBase = quantity * priceBase - feeBase;
    const realizedPnLBase = netProceedsBase - allocatedCostBase;

    totalSoldQty += quantity;
    openQty -= quantity;
    remainingCostBasisBase -= allocatedCostBase;
    if (Math.abs(openQty) <= EPSILON) {
      openQty = 0;
    }
    if (Math.abs(remainingCostBasisBase) <= EPSILON) {
      remainingCostBasisBase = 0;
    }

    realizedPnLAllTimeBase += realizedPnLBase;
    realizedCostBasisSoldBase += allocatedCostBase;
    sellEvents.push({
      tradeId: trade.id,
      assetSymbol,
      executedAt: trade.executedAt,
      quantity,
      feeBase,
      allocatedCostBase,
      netProceedsBase,
      realizedPnLBase,
    });
  }

  return {
    assetSymbol,
    totalBoughtQty: roundTo(totalBoughtQty),
    totalSoldQty: roundTo(totalSoldQty),
    openQty: roundTo(openQty),
    averageCostPerUnitBase:
      openQty > EPSILON ? roundTo(remainingCostBasisBase / openQty) : 0,
    remainingCostBasisBase: roundTo(remainingCostBasisBase),
    realizedPnLAllTimeBase: roundTo(realizedPnLAllTimeBase),
    realizedCostBasisSoldBase: roundTo(realizedCostBasisSoldBase),
    sellEvents: sellEvents.map((event) => ({
      ...event,
      feeBase: roundTo(event.feeBase),
      allocatedCostBase: roundTo(event.allocatedCostBase),
      netProceedsBase: roundTo(event.netProceedsBase),
      realizedPnLBase: roundTo(event.realizedPnLBase),
    })),
  };
};

export const getMarketValueBase = (
  asset: Asset,
  openQty: number,
  baseCurrency: CurrencyCode,
): number => {
  if (openQty <= EPSILON) {
    return 0;
  }

  const symbol = normalizeSymbol(asset.symbol, "asset symbol");
  validatePositive(asset.lastPrice, `asset ${symbol} lastPrice`);
  const marketValueBase = convertToBase(
    asset.lastPrice * openQty,
    asset.currency,
    baseCurrency,
    asset.lastFxRateToBase,
    `asset ${symbol} market value`,
  );
  return roundTo(marketValueBase);
};

export const buildPositionFromLedger = (
  asset: Asset,
  ledger: LedgerState,
  baseCurrency: CurrencyCode,
): Position => {
  const assetSymbol = normalizeSymbol(asset.symbol, "asset symbol");
  if (assetSymbol !== ledger.assetSymbol) {
    throw new PortfolioCalculationError(
      `Market data symbol ${assetSymbol} does not match trade symbol ${ledger.assetSymbol}`,
    );
  }

  const marketValueBase = getMarketValueBase(asset, ledger.openQty, baseCurrency);
  const unrealizedPnLBase = roundTo(marketValueBase - ledger.remainingCostBasisBase);
  const unrealizedReturnPct =
    ledger.remainingCostBasisBase > EPSILON
      ? roundTo((unrealizedPnLBase / ledger.remainingCostBasisBase) * 100)
      : null;

  return {
    assetSymbol,
    assetName: asset.name,
    assetCurrency: asset.currency,
    baseCurrency,
    totalBoughtQty: ledger.totalBoughtQty,
    totalSoldQty: ledger.totalSoldQty,
    openQty: ledger.openQty,
    averageCostPerUnitBase: ledger.averageCostPerUnitBase,
    remainingCostBasisBase: ledger.remainingCostBasisBase,
    marketValueBase,
    unrealizedPnLBase,
    unrealizedReturnPct,
    realizedPnLAllTimeBase: ledger.realizedPnLAllTimeBase,
  };
};

export const isWithinRange = (value: string, range: DateRange): boolean => {
  const timestamp = parseTimestamp(value, "range value");
  const fromTimestamp = parseTimestamp(range.from, "range from");
  const toTimestamp = parseTimestamp(range.to, "range to");
  return timestamp >= fromTimestamp && timestamp <= toTimestamp;
};

export const sumDividendIncomeBase = (
  dividends: readonly DividendTransaction[],
  baseCurrency: CurrencyCode,
  range?: DateRange,
): { incomeBase: number; feeBase: number; dividendCount: number } => {
  let incomeBase = 0;
  let feeBase = 0;
  let dividendCount = 0;

  for (const dividend of dividends) {
    parseTimestamp(dividend.paidAt, `dividend ${dividend.id} paidAt`);
    if (range && !isWithinRange(dividend.paidAt, range)) {
      continue;
    }

    const grossBase = convertToBase(
      validateNonNegative(dividend.amount, `dividend ${dividend.id} amount`),
      dividend.currency,
      baseCurrency,
      dividend.fxRateToBase,
      `dividend ${dividend.id} amount`,
    );
    const dividendFeeBase = convertToBase(
      validateNonNegative(dividend.fee, `dividend ${dividend.id} fee`),
      dividend.currency,
      baseCurrency,
      dividend.fxRateToBase,
      `dividend ${dividend.id} fee`,
    );

    incomeBase += grossBase - dividendFeeBase;
    feeBase += dividendFeeBase;
    dividendCount += 1;
  }

  return {
    incomeBase: roundTo(incomeBase),
    feeBase: roundTo(feeBase),
    dividendCount,
  };
};

export const summarizeCashFlows = (
  cashTransactions: readonly CashTransaction[],
  baseCurrency: CurrencyCode,
  range?: DateRange,
): {
  cashBalanceBase: number;
  incomeBase: number;
  feesBase: number;
  taxesBase: number;
  depositsBase: number;
  withdrawalsBase: number;
  standaloneFeesBase: number;
} => {
  let cashBalanceBase = 0;
  let incomeBase = 0;
  let feesBase = 0;
  let taxesBase = 0;
  let depositsBase = 0;
  let withdrawalsBase = 0;
  let standaloneFeesBase = 0;

  for (const cashTransaction of cashTransactions) {
    parseTimestamp(cashTransaction.createdAt, `cash transaction ${cashTransaction.id} createdAt`);
    if (range && !isWithinRange(cashTransaction.createdAt, range)) {
      continue;
    }

    const amountBase = convertToBase(
      validateNonNegative(cashTransaction.amount, `cash transaction ${cashTransaction.id} amount`),
      cashTransaction.currency,
      baseCurrency,
      cashTransaction.fxRateToBase,
      `cash transaction ${cashTransaction.id} amount`,
    );

    switch (cashTransaction.type) {
      case "DEPOSIT":
        depositsBase += amountBase;
        cashBalanceBase += amountBase;
        break;
      case "WITHDRAWAL":
        withdrawalsBase += amountBase;
        cashBalanceBase -= amountBase;
        break;
      case "INTEREST":
        incomeBase += amountBase;
        cashBalanceBase += amountBase;
        break;
      case "FEE":
        feesBase += amountBase;
        standaloneFeesBase += amountBase;
        cashBalanceBase -= amountBase;
        break;
      case "TAX":
        taxesBase += amountBase;
        cashBalanceBase -= amountBase;
        break;
      default:
        throw new PortfolioCalculationError(
          `Unsupported cash transaction type in ${cashTransaction.id}`,
        );
    }
  }

  return {
    cashBalanceBase: roundTo(cashBalanceBase),
    incomeBase: roundTo(incomeBase),
    feesBase: roundTo(feesBase),
    taxesBase: roundTo(taxesBase),
    depositsBase: roundTo(depositsBase),
    withdrawalsBase: roundTo(withdrawalsBase),
    standaloneFeesBase: roundTo(standaloneFeesBase),
  };
};

export const calculateTradeCashDeltaBase = (
  trade: Trade,
  baseCurrency: CurrencyCode,
): number => {
  const quantity = validatePositive(trade.quantity, `trade ${trade.id} quantity`);
  const grossValueBase = convertToBase(
    validatePositive(trade.price, `trade ${trade.id} price`) * quantity,
    trade.currency,
    baseCurrency,
    trade.fxRateToBase,
    `trade ${trade.id} gross value`,
  );
  const feeBase = convertToBase(
    validateNonNegative(trade.fee, `trade ${trade.id} fee`),
    trade.currency,
    baseCurrency,
    trade.fxRateToBase,
    `trade ${trade.id} fee`,
  );

  if (trade.side === "BUY") {
    return roundTo(-(grossValueBase + feeBase));
  }
  if (trade.side === "SELL") {
    return roundTo(grossValueBase - feeBase);
  }

  throw new PortfolioCalculationError(`Unsupported trade side in trade ${trade.id}`);
};

export const calculateDividendCashDeltaBase = (
  dividend: DividendTransaction,
  baseCurrency: CurrencyCode,
): number => {
  const grossBase = convertToBase(
    validateNonNegative(dividend.amount, `dividend ${dividend.id} amount`),
    dividend.currency,
    baseCurrency,
    dividend.fxRateToBase,
    `dividend ${dividend.id} amount`,
  );
  const feeBase = convertToBase(
    validateNonNegative(dividend.fee, `dividend ${dividend.id} fee`),
    dividend.currency,
    baseCurrency,
    dividend.fxRateToBase,
    `dividend ${dividend.id} fee`,
  );
  return roundTo(grossBase - feeBase);
};

export const findAssetMarketData = (
  marketData: readonly Asset[],
  assetSymbol: string,
): Asset => {
  const normalizedSymbol = normalizeSymbol(assetSymbol, "market data lookup symbol");
  const asset = marketData.find(
    (marketAsset) => normalizeSymbol(marketAsset.symbol, "market data symbol") === normalizedSymbol,
  );
  if (!asset) {
    throw new PortfolioCalculationError(`Missing market data for asset ${normalizedSymbol}`);
  }
  return asset;
};

export const roundResult = roundTo;
