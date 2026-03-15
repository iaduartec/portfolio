import {
  CashTransaction,
  CurrencyCode,
  DateRange,
  DividendTransaction,
  PeriodPnL,
  Trade,
} from "@/domain/portfolio";

import {
  buildTradeLedger,
  convertToBase,
  isWithinRange,
  roundResult,
  sumDividendIncomeBase,
  summarizeCashFlows,
} from "./shared";

const collectTradeFeesInRange = (
  trades: readonly Trade[],
  baseCurrency: CurrencyCode,
  range: DateRange,
): number =>
  roundResult(
    trades.reduce((total, trade) => {
      if (!isWithinRange(trade.executedAt, range)) {
        return total;
      }

      return total
        + convertToBase(
          trade.fee,
          trade.currency,
          baseCurrency,
          trade.fxRateToBase,
          `trade ${trade.id} fee`,
        );
    }, 0),
  );

const groupTradesByAsset = (trades: readonly Trade[]): Map<string, Trade[]> => {
  const groups = new Map<string, Trade[]>();

  for (const trade of trades) {
    const symbol = trade.assetSymbol.trim().toUpperCase();
    const current = groups.get(symbol);
    if (current) {
      current.push(trade);
      continue;
    }
    groups.set(symbol, [trade]);
  }

  return groups;
};

const inferBaseCurrency = (
  trades: readonly Trade[],
  dividends: readonly DividendTransaction[],
  cashTransactions: readonly CashTransaction[],
): CurrencyCode => {
  const matchingSameCurrency = [
    ...trades.map((trade) => ({
      currency: trade.currency,
      fxRateToBase: trade.fxRateToBase,
    })),
    ...dividends.map((dividend) => ({
      currency: dividend.currency,
      fxRateToBase: dividend.fxRateToBase,
    })),
    ...cashTransactions.map((cashTransaction) => ({
      currency: cashTransaction.currency,
      fxRateToBase: cashTransaction.fxRateToBase,
    })),
  ].filter((entry) => entry.fxRateToBase === 1);

  if (matchingSameCurrency.length > 0) {
    return matchingSameCurrency[0].currency;
  }

  return "EUR";
};

export const calculatePeriodPnL = (
  range: DateRange,
  trades: readonly Trade[],
  dividends: readonly DividendTransaction[],
  cashTx: readonly CashTransaction[],
  baseCurrency?: CurrencyCode,
): PeriodPnL => {
  const effectiveBaseCurrency = baseCurrency ?? inferBaseCurrency(trades, dividends, cashTx);
  const realizedPnLBase = roundResult(
    Array.from(groupTradesByAsset(trades).values()).reduce((total, assetTrades) => {
      const ledger = buildTradeLedger(assetTrades, effectiveBaseCurrency);
      return total
        + ledger.sellEvents.reduce((assetTotal, event) => {
          if (!isWithinRange(event.executedAt, range)) {
            return assetTotal;
          }
          return assetTotal + event.realizedPnLBase;
        }, 0);
    }, 0),
  );

  const dividendSummary = sumDividendIncomeBase(dividends, effectiveBaseCurrency, range);
  const cashSummary = summarizeCashFlows(cashTx, effectiveBaseCurrency, range);
  const incomeBase = roundResult(dividendSummary.incomeBase + cashSummary.incomeBase);
  const feesBase = roundResult(
    collectTradeFeesInRange(trades, effectiveBaseCurrency, range)
      + dividendSummary.feeBase
      + cashSummary.feesBase,
  );
  const taxesBase = cashSummary.taxesBase;
  const netPnLBase = roundResult(
    realizedPnLBase + incomeBase - cashSummary.standaloneFeesBase - taxesBase,
  );
  const sellCount = trades.filter(
    (trade) => trade.side === "SELL" && isWithinRange(trade.executedAt, range),
  ).length;

  return {
    realizedPnLBase,
    incomeBase,
    feesBase,
    taxesBase,
    netPnLBase,
    sellCount,
    dividendCount: dividendSummary.dividendCount,
  };
};
