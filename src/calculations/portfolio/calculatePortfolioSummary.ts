import {
  Asset,
  CashTransaction,
  CurrencyCode,
  DividendTransaction,
  PortfolioSummary,
  Trade,
} from "@/domain/portfolio";

import {
  buildPositionFromLedger,
  buildTradeLedger,
  calculateDividendCashDeltaBase,
  calculateTradeCashDeltaBase,
  findAssetMarketData,
  roundResult,
  sumDividendIncomeBase,
  summarizeCashFlows,
} from "./shared";

const groupTradesByAsset = (trades: readonly Trade[]): Map<string, Trade[]> => {
  const groups = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = trade.assetSymbol.trim().toUpperCase();
    const existing = groups.get(key);
    if (existing) {
      existing.push(trade);
      continue;
    }
    groups.set(key, [trade]);
  }

  return groups;
};

export const calculatePortfolioSummary = (
  allTrades: readonly Trade[],
  allDividends: readonly DividendTransaction[],
  allCashTx: readonly CashTransaction[],
  marketData: readonly Asset[],
  baseCurrency: CurrencyCode,
): PortfolioSummary => {
  const ledgers = Array.from(groupTradesByAsset(allTrades).entries())
    .map(([assetSymbol, assetTrades]) => {
      const ledger = buildTradeLedger(assetTrades, baseCurrency);
      const asset = findAssetMarketData(marketData, assetSymbol);
      return {
        ledger,
        position: buildPositionFromLedger(asset, ledger, baseCurrency),
      };
    })
    .sort((left, right) => left.position.assetSymbol.localeCompare(right.position.assetSymbol));
  const openPositions = ledgers.filter((entry) => entry.position.openQty > 0);

  const tradeCashBalanceBase = allTrades.reduce(
    (total, trade) => total + calculateTradeCashDeltaBase(trade, baseCurrency),
    0,
  );
  const dividendCashBalanceBase = allDividends.reduce(
    (total, dividend) => total + calculateDividendCashDeltaBase(dividend, baseCurrency),
    0,
  );
  const cashSummary = summarizeCashFlows(allCashTx, baseCurrency);
  const dividendIncomeSummary = sumDividendIncomeBase(allDividends, baseCurrency);

  const cashBalanceBase = roundResult(
    cashSummary.cashBalanceBase + tradeCashBalanceBase + dividendCashBalanceBase,
  );
  const investedCostBasisBase = roundResult(
    openPositions.reduce((total, entry) => total + entry.ledger.remainingCostBasisBase, 0),
  );
  const openPositionsMarketValueBase = roundResult(
    openPositions.reduce((total, entry) => total + entry.position.marketValueBase, 0),
  );
  const unrealizedPnLBase = roundResult(
    openPositions.reduce((total, entry) => total + entry.position.unrealizedPnLBase, 0),
  );
  const realizedPnLAllTimeBase = roundResult(
    ledgers.reduce((total, entry) => total + entry.position.realizedPnLAllTimeBase, 0),
  );
  const incomeAllTimeBase = roundResult(
    dividendIncomeSummary.incomeBase + cashSummary.incomeBase,
  );
  const totalReturnBase = roundResult(
    realizedPnLAllTimeBase
      + unrealizedPnLBase
      + incomeAllTimeBase
      - cashSummary.standaloneFeesBase
      - cashSummary.taxesBase,
  );
  const historicalCostBasisBase = roundResult(
    ledgers.reduce(
      (total, entry) =>
        total
        + entry.ledger.remainingCostBasisBase
        + entry.ledger.realizedCostBasisSoldBase,
      0,
    ),
  );
  const totalReturnPct =
    historicalCostBasisBase > 0
      ? roundResult((totalReturnBase / historicalCostBasisBase) * 100)
      : null;

  return {
    baseCurrency,
    cashBalanceBase,
    investedCostBasisBase,
    portfolioMarketValueBase: roundResult(cashBalanceBase + openPositionsMarketValueBase),
    unrealizedPnLBase,
    realizedPnLAllTimeBase,
    incomeAllTimeBase,
    totalReturnBase,
    totalReturnPct,
    positions: openPositions.map((entry) => entry.position),
  };
};
