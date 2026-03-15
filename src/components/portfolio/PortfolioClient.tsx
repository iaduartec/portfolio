"use client";

import { useEffect, useMemo, useState } from "react";
import { PortfolioMonthlyIncomeChart } from "@/components/charts/PortfolioMonthlyIncomeChart";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  formatPercent,
  formatCurrency,
  convertCurrency,
  convertCurrencyFrom,
  inferCurrencyFromTicker,
  type CurrencyCode,
} from "@/lib/formatters";
import { AIChat } from "@/components/ai/AIChat";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { cn } from "@/lib/utils";
import { isFundTicker, isNonInvestmentTicker } from "@/lib/portfolioGroups";
import { computeCashBalanceBase } from "@/lib/portfolio";
import type { Holding, RealizedTrade } from "@/types/portfolio";
import type { InvestmentAccount, Transaction } from "@/types/transactions";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";



type PortfolioAccountView = "all" | "brokerage" | "robo";
type PerformancePoint = { label: string; value: number };
type IncomePoint = { label: string; value: number };
type HistoryClosePoint = { timestamp: number; close: number };
type AccountSeries = {
  valuePoints: PerformancePoint[];
  gainLossPoints: PerformancePoint[];
  roiPoints: PerformancePoint[];
};
type AccountMetrics = {
  totalValue: number;
  cashBalance: number;
  realized: number;
  unrealized: number;
  totalPnl: number;
  roi: number;
};

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const toTimestamp = (value: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const isoDateTime = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2}))?(?::(\d{2}))?(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/
  );
  if (isoDateTime) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = isoDateTime;
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const localDateTime = raw.match(
    /^(\d{2})[/-](\d{2})[/-](\d{4})(?:[T\s](\d{2})(?::(\d{2}))?(?::(\d{2}))?)?$/
  );
  if (localDateTime) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = localDateTime;
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const fallback = Date.parse(raw);
  return Number.isFinite(fallback) ? fallback : null;
};

const getMonthStart = (timestamp: number) => {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

const getNextMonthStart = (monthStart: number) => {
  const date = new Date(monthStart);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
};

const getMonthEnd = (monthStart: number) => getNextMonthStart(monthStart) - 1;
const getDayStart = (timestamp: number) => {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};
const getNextDayStart = (dayStart: number) => dayStart + 24 * 60 * 60 * 1000;
const getDayEnd = (dayStart: number) => getNextDayStart(dayStart) - 1;

const formatMonthLabel = (monthStart: number, includeYear: boolean) => {
  const date = new Date(monthStart);
  const month = MONTH_LABELS[date.getUTCMonth()];
  if (!includeYear) return month;
  return `${month} ${String(date.getUTCFullYear()).slice(-2)}`;
};
const formatDayLabel = (dayStart: number, includeYear: boolean) => {
  const date = new Date(dayStart);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTH_LABELS[date.getUTCMonth()];
  if (!includeYear) return `${day} ${month}`;
  return `${day} ${month} ${String(date.getUTCFullYear()).slice(-2)}`;
};

const getTransactionCurrency = (tx: Transaction, baseCurrency: CurrencyCode) => {
  if (tx.currency) return tx.currency;
  if (tx.ticker) return inferCurrencyFromTicker(tx.ticker);
  return baseCurrency;
};

const getTransactionAccount = (tx: Transaction): InvestmentAccount => {
  if (tx.account) return tx.account;
  if (tx.ticker && isFundTicker(tx.ticker)) return "ROBO_ADVISOR";
  if (!tx.ticker || isNonInvestmentTicker(tx.ticker)) return "BROKERAGE";
  return "BROKERAGE";
};

const getHoldingAccount = (holding: Holding): InvestmentAccount => {
  if (holding.account) return holding.account;
  return isFundTicker(holding.ticker) ? "ROBO_ADVISOR" : "BROKERAGE";
};

const getRealizedTradeAccount = (trade: RealizedTrade): InvestmentAccount => {
  if (trade.account) return trade.account;
  return isFundTicker(trade.ticker) ? "ROBO_ADVISOR" : "BROKERAGE";
};

const matchesAccountView = (
  account: InvestmentAccount,
  accountView: PortfolioAccountView,
) => {
  if (accountView === "all") return true;
  if (accountView === "brokerage") return account === "BROKERAGE" || account === "UNASSIGNED";
  return account === "ROBO_ADVISOR";
};

const getTransactionGrossAmount = (tx: Transaction) => {
  if (Number.isFinite(tx.grossAmount) && (tx.grossAmount ?? 0) !== 0) {
    return Math.abs(tx.grossAmount ?? 0);
  }
  const hasQty = Number.isFinite(tx.quantity) && tx.quantity !== 0;
  const hasPrice = Number.isFinite(tx.price) && tx.price !== 0;
  if (hasQty && hasPrice) return tx.quantity * tx.price;
  if (hasPrice) return tx.price;
  if (hasQty) return tx.quantity;
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

const transactionPriority = (tx: Transaction) => {
  const isExternalCashFlow = tx.type === "OTHER" && (!tx.ticker || isNonInvestmentTicker(tx.ticker));
  if (isExternalCashFlow) return -1;
  if (tx.type === "SELL") return 0;
  if (tx.type === "DIVIDEND") return 1;
  if (tx.type === "BUY") return 2;
  if (tx.type === "FEE") return 3;
  return 4;
};

const sortTransactionsForCash = (transactions: Transaction[]) =>
  [...transactions].sort((a, b) => {
    const aTs = toTimestamp(a.date) ?? 0;
    const bTs = toTimestamp(b.date) ?? 0;
    if (aTs !== bTs) return aTs - bTs;
    return transactionPriority(a) - transactionPriority(b);
  });

const normalizeHistoryTimestamp = (raw: unknown) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return value < 1_000_000_000_000 ? value * 1000 : value;
};

const findCloseAtOrBefore = (points: HistoryClosePoint[], targetTimestamp: number) => {
  if (points.length === 0) return undefined;
  let lo = 0;
  let hi = points.length - 1;
  let answer = -1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].timestamp <= targetTimestamp) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return answer >= 0 ? points[answer].close : undefined;
};

const findIndexAtOrBefore = (points: { timestamp: number }[], targetTimestamp: number) => {
  if (points.length === 0) return -1;
  let lo = 0;
  let hi = points.length - 1;
  let answer = -1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].timestamp <= targetTimestamp) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return answer;
};

const getTransactionFeeBase = (tx: Transaction, fxRate: number, baseCurrency: CurrencyCode) => {
  const currency = getTransactionCurrency(tx, baseCurrency);
  const effectiveFxRate = tx.fxRate ?? fxRate;
  const explicitFee = Number.isFinite(tx.fee) ? Math.abs(tx.fee ?? 0) : 0;
  if (explicitFee > 0) {
    return convertCurrencyFrom(explicitFee, currency, baseCurrency, effectiveFxRate, baseCurrency);
  }
  if (tx.type !== "FEE") return 0;
  const fallbackFee = Math.abs(getTransactionGrossAmount(tx));
  if (!Number.isFinite(fallbackFee) || fallbackFee === 0) return 0;
  return convertCurrencyFrom(fallbackFee, currency, baseCurrency, effectiveFxRate, baseCurrency);
};

const getDividendNetBase = (tx: Transaction, fxRate: number, baseCurrency: CurrencyCode) => {
  const currency = getTransactionCurrency(tx, baseCurrency);
  const effectiveFxRate = tx.fxRate ?? fxRate;
  const gross = getTransactionSignedAmount(tx);
  const fee = Number.isFinite(tx.fee) ? Math.abs(tx.fee ?? 0) : 0;
  const net = gross >= 0 ? gross - fee : gross + fee;
  return convertCurrencyFrom(net, currency, baseCurrency, effectiveFxRate, baseCurrency);
};

const getExternalCashFlowBase = (tx: Transaction, fxRate: number, baseCurrency: CurrencyCode) => {
  if (tx.type !== "OTHER") return null;
  if (tx.ticker && !isNonInvestmentTicker(tx.ticker)) return null;
  const gross = getTransactionSignedAmount(tx);
  if (!Number.isFinite(gross) || gross === 0) return null;
  const currency = getTransactionCurrency(tx, baseCurrency);
  const effectiveFxRate = tx.fxRate ?? fxRate;
  return convertCurrencyFrom(gross, currency, baseCurrency, effectiveFxRate, baseCurrency);
};

type RunningPortfolioState = {
  cashByCurrency: Map<CurrencyCode, number>;
  netExternalContributions: number;
  totalCostBasis: number;
  quantities: Map<string, number>;
  lastTradePriceBase: Map<string, number>;
};

const createRunningPortfolioState = (): RunningPortfolioState => ({
  cashByCurrency: new Map<CurrencyCode, number>(),
  netExternalContributions: 0,
  totalCostBasis: 0,
  quantities: new Map<string, number>(),
  lastTradePriceBase: new Map<string, number>(),
});

const applyTransactionToState = (
  state: RunningPortfolioState,
  tx: Transaction,
  fxRate: number,
  baseCurrency: CurrencyCode
) => {
  const externalCashFlowBase = getExternalCashFlowBase(tx, fxRate, baseCurrency);
  if (externalCashFlowBase !== null) {
    const currency = getTransactionCurrency(tx, baseCurrency);
    const currentCash = state.cashByCurrency.get(currency) ?? 0;
    state.cashByCurrency.set(currency, currentCash + getTransactionSignedAmount(tx));
    state.netExternalContributions += externalCashFlowBase;
    return externalCashFlowBase;
  }

  const hasInvestmentTicker = Boolean(tx.ticker) && !isNonInvestmentTicker(tx.ticker);
  const currency = getTransactionCurrency(tx, baseCurrency);
  const quantity = Number.isFinite(tx.quantity) ? Math.abs(tx.quantity) : 0;
  const effectiveFxRate = tx.fxRate ?? fxRate;
  const priceBase = convertCurrencyFrom(tx.price, currency, baseCurrency, effectiveFxRate, baseCurrency);
  const feeBase = getTransactionFeeBase(tx, fxRate, baseCurrency);
  const gross = getTransactionGrossAmount(tx);
  const fee = Number.isFinite(tx.fee) ? Math.abs(tx.fee ?? 0) : (tx.type === "FEE" ? gross : 0);
  const currentCash = state.cashByCurrency.get(currency) ?? 0;
  
  if (hasInvestmentTicker && Number.isFinite(priceBase) && priceBase > 0) {
    state.lastTradePriceBase.set(tx.ticker, priceBase);
  }

  if (tx.type === "BUY") {
    if (!hasInvestmentTicker) return 0;
    const cost = quantity * priceBase + feeBase;
    const costInCurrency = gross + fee;
    
    // Auto-Cash Injection: if the user hasn't recorded enough deposits to cover the buy,
    // we assume an implied external cash flow. This prevents negative equity distortion.
    let injection = 0;
    let nextCash = currentCash;
    if (nextCash < costInCurrency) {
      const injectionInCurrency = costInCurrency - nextCash;
      injection = convertCurrencyFrom(
        injectionInCurrency,
        currency,
        baseCurrency,
        effectiveFxRate,
        baseCurrency,
      );
      nextCash += injectionInCurrency;
      state.netExternalContributions += injection;
    }
    
    state.cashByCurrency.set(currency, nextCash - costInCurrency);
    state.totalCostBasis += cost;
    state.quantities.set(tx.ticker, (state.quantities.get(tx.ticker) ?? 0) + quantity);
    return injection;
  }

  if (tx.type === "SELL") {
    if (!hasInvestmentTicker) return 0;
    state.cashByCurrency.set(currency, currentCash + gross - fee);
    const previous = state.quantities.get(tx.ticker) ?? 0;
    state.quantities.set(tx.ticker, Math.max(0, previous - quantity));
    return 0;
  }

  if (tx.type === "DIVIDEND") {
    const signedAmount = getTransactionSignedAmount(tx);
    const netDividend = signedAmount >= 0 ? signedAmount - fee : signedAmount + fee;
    state.cashByCurrency.set(currency, currentCash + netDividend);
    return 0;
  }

  if (tx.type === "FEE") {
    state.cashByCurrency.set(currency, currentCash - fee);
    return 0;
  }

  return 0;
};

const buildPerformanceSeries = (
  transactions: Transaction[],
  fxRate: number,
  baseCurrency: CurrencyCode
): AccountSeries => {
  const ordered = sortTransactionsForCash(transactions)
    .map((tx) => {
      const timestamp = toTimestamp(tx.date);
      if (!Number.isFinite(timestamp)) return null;
      return { tx, timestamp: timestamp as number };
    })
    .filter((entry): entry is { tx: Transaction; timestamp: number } => entry !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (ordered.length === 0) {
    const empty = [{ label: formatMonthLabel(getMonthStart(Date.now()), false), value: 0 }];
    return { valuePoints: empty, gainLossPoints: empty, roiPoints: empty };
  }

  const startMonth = getMonthStart(ordered[0].timestamp);
  const lastMonth = getMonthStart(ordered[ordered.length - 1].timestamp);
  const nowMonth = getMonthStart(Date.now());
  const endMonth = Math.max(lastMonth, nowMonth);
  const includeYear = new Date(startMonth).getUTCFullYear() !== new Date(endMonth).getUTCFullYear();

  const quantityEpsilon = 1e-6;
  const state = createRunningPortfolioState();
  const valuePoints: PerformancePoint[] = [];
  const gainLossPoints: PerformancePoint[] = [];
  const roiPoints: PerformancePoint[] = [];
  let txIndex = 0;
  let previousEquity: number | null = null;
  let cumulativeGrowth = 1;

  for (let month = startMonth; month <= endMonth; month = getNextMonthStart(month)) {
    const monthEnd = getMonthEnd(month);
    let periodExternalFlow = 0;
    while (txIndex < ordered.length && ordered[txIndex].timestamp <= monthEnd) {
      periodExternalFlow += applyTransactionToState(state, ordered[txIndex].tx, fxRate, baseCurrency);
      txIndex += 1;
    }

    let totalValue = 0;
    for (const [ticker, quantity] of state.quantities.entries()) {
      if (quantity <= quantityEpsilon) continue;
      const priceBase = state.lastTradePriceBase.get(ticker) ?? 0;
      totalValue += quantity * priceBase;
    }
    for (const [currency, amount] of state.cashByCurrency.entries()) {
      totalValue += convertCurrencyFrom(amount, currency, baseCurrency, fxRate, baseCurrency);
    }

    const equity = totalValue;
    const gainLoss = equity - state.netExternalContributions;
    if (previousEquity !== null && previousEquity > quantityEpsilon) {
      const periodReturn = (equity - previousEquity - periodExternalFlow) / previousEquity;
      if (Number.isFinite(periodReturn)) {
        cumulativeGrowth *= 1 + periodReturn;
      }
    }
    previousEquity = equity;
    const roiPercent = (cumulativeGrowth - 1) * 100;

    valuePoints.push({
      label: formatMonthLabel(month, includeYear),
      value: Number(equity.toFixed(2)),
    });
    gainLossPoints.push({
      label: formatMonthLabel(month, includeYear),
      value: Number(gainLoss.toFixed(2)),
    });
    roiPoints.push({
      label: formatMonthLabel(month, includeYear),
      value: Number(roiPercent.toFixed(2)),
    });
  }

  return { valuePoints, gainLossPoints, roiPoints };
};

const buildPerformanceSeriesWithHistory = async (
  allTransactions: Transaction[],
  currentFxRate: number,
  baseCurrency: CurrencyCode,
  accountView: PortfolioAccountView,
): Promise<AccountSeries | null> => {
  const transactions = allTransactions.filter((tx) =>
    matchesAccountView(getTransactionAccount(tx), accountView),
  );

  const ordered = sortTransactionsForCash(transactions);
  if (ordered.length === 0) return null;

  const minTxDate = transactions.reduce((min, tx) => {
    const ts = toTimestamp(tx.date);
    return ts !== null && ts < min ? ts : min;
  }, Date.now());

  const startDay = getDayStart(minTxDate);
  const endDay = getDayStart(Date.now());
  const includeYear = new Date(startDay).getUTCFullYear() !== new Date(endDay).getUTCFullYear();

  const tickers = Array.from(
    new Set(
      ordered
        .map((tx) => tx.ticker)
        .filter((ticker): ticker is string => Boolean(ticker) && !isNonInvestmentTicker(ticker))
    )
  );
  
  const tickerCurrency = new Map<string, CurrencyCode>();
  for (const ticker of tickers) {
    tickerCurrency.set(ticker, inferCurrencyFromTicker(ticker));
  }

  // Fetch Historical FX rates (primarily EUR/USD)
  let historicalFx: { timestamp: number; close: number }[] = [];
  try {
    const fxRes = await fetch("/api/yahoo?action=history&symbol=EURUSD=X&range=5y&interval=1d");
    if (fxRes.ok) {
      const fxJson = await fxRes.json();
      historicalFx = (fxJson.data?.points ?? [])
        .map((p: any) => ({
          timestamp: normalizeHistoryTimestamp(p.timestamp),
          close: Number(p.close),
        }))
        .filter((p: any) => p.timestamp && p.close > 0)
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
    }
  } catch (err) {
    console.warn("Failed to fetch historical FX rates", err);
  }

  const getDayFxRate = (timestamp: number) => {
    if (historicalFx.length === 0) return currentFxRate;
    const idx = findIndexAtOrBefore(historicalFx, timestamp);
    return idx >= 0 ? historicalFx[idx].close : currentFxRate;
  };

  const historyEntries = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `/api/yahoo?action=history&symbol=${encodeURIComponent(ticker)}&range=5y&interval=1d`,
          { cache: "no-store" }
        );
        if (!res.ok) return [ticker, [] as HistoryClosePoint[]] as const;
        const json = (await res.json()) as {
          data?: { points?: Array<{ timestamp?: number; close?: number }> };
        };
        const points = (json.data?.points ?? [])
          .map((point) => {
            const timestamp = normalizeHistoryTimestamp(point.timestamp);
            const rawClose = Number(point.close);
            if (!timestamp || !Number.isFinite(rawClose) || rawClose <= 0) return null;
            // We keep raw prices here and convert using dayFxRate in the loop
            return { timestamp, close: rawClose };
          })
          .filter((point): point is HistoryClosePoint => point !== null)
          .sort((a, b) => a.timestamp - b.timestamp);
        return [ticker, points] as const;
      } catch (err) {
        console.warn("Failed to fetch historical data for", ticker, err);
        return [ticker, [] as HistoryClosePoint[]] as const;
      }
    })
  );
  const historyByTicker = new Map<string, HistoryClosePoint[]>(historyEntries);

  const quantityEpsilon = 1e-6;
  const state = createRunningPortfolioState();
  let txIndex = 0;
  const valuePoints: PerformancePoint[] = [];
  const roiPoints: PerformancePoint[] = [];
  const gainLossPoints: PerformancePoint[] = [];
  let previousROI = 0;
  let previousEquity: number | null = null;
  let cumulativeGrowth = 1;

  for (let day = startDay; day <= endDay; day = getNextDayStart(day)) {
    const dayEnd = getDayEnd(day);
    const dayFxRate = getDayFxRate(dayEnd);
    let dayExternalFlow = 0;
    
    while (txIndex < ordered.length) {
      const tx = ordered[txIndex];
      const txTimestamp = toTimestamp(tx.date);
      if (!txTimestamp || txTimestamp > dayEnd) break;
      const txFxRate = getDayFxRate(txTimestamp);
      dayExternalFlow += applyTransactionToState(state, tx, txFxRate, baseCurrency);
      txIndex += 1;
    }

    let totalValue = 0;
    for (const [ticker, qty] of state.quantities.entries()) {
      if (qty <= quantityEpsilon) continue;
      const series = historyByTicker.get(ticker) ?? [];
      const rawPrice = findCloseAtOrBefore(series, dayEnd);
      
      const currency = tickerCurrency.get(ticker) ?? baseCurrency;
      const historicalPrice = rawPrice !== undefined 
        ? convertCurrencyFrom(rawPrice, currency, baseCurrency, dayFxRate, baseCurrency)
        : undefined;

      let effectivePrice = 0;
      if (historicalPrice !== undefined && historicalPrice > 0) {
        effectivePrice = historicalPrice;
        state.lastTradePriceBase.set(ticker, historicalPrice);
      } else {
        effectivePrice = state.lastTradePriceBase.get(ticker) ?? 0;
      }
      
      totalValue += qty * effectivePrice;
    }
    for (const [currency, amount] of state.cashByCurrency.entries()) {
      totalValue += convertCurrencyFrom(amount, currency, baseCurrency, dayFxRate, baseCurrency);
    }

    const equity = totalValue;
    const gainLoss = equity - state.netExternalContributions;
    if (previousEquity !== null && previousEquity > quantityEpsilon) {
      const dayReturn = (equity - previousEquity - dayExternalFlow) / previousEquity;
      if (Number.isFinite(dayReturn)) {
        cumulativeGrowth *= 1 + dayReturn;
      }
    }
    previousEquity = equity;
    let roiPercent = (cumulativeGrowth - 1) * 100;
    
    // Safety check for suspicious movements
    const isSuspicious = state.quantities.size > 0 && (roiPercent < previousROI - 15 || roiPercent > previousROI + 50);
    const isZeroError = equity <= 0 && state.quantities.size > 0;

    if ((isSuspicious || isZeroError) && roiPoints.length > 0) {
      roiPercent = previousROI;
    } else {
      previousROI = roiPercent;
    }

    valuePoints.push({
      label: formatDayLabel(day, includeYear),
      value: Number(equity.toFixed(2)),
    });
    roiPoints.push({
      label: formatDayLabel(day, includeYear),
      value: Number(roiPercent.toFixed(2)),
    });

    gainLossPoints.push({
      label: formatDayLabel(day, includeYear),
      value: Number(convertCurrencyFrom(gainLoss, baseCurrency, baseCurrency, dayFxRate, baseCurrency).toFixed(2)),
    });
  }

  if (roiPoints.length === 0) return null;
  return { valuePoints, gainLossPoints, roiPoints };
};

// --- REVOLUT STYLE COMPONENTS ---

const computeSummaryFromHoldings = (subset: Holding[]) => {
  const totalValue = subset.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalPnl = subset.reduce((sum, holding) => sum + holding.pnlValue, 0);
  const dailyPnl = subset.reduce((sum, holding) => sum + (holding.dayChange ?? 0), 0);
  return { totalValue, totalPnl, dailyPnl };
};

const computeAccountMetrics = (
  accountTransactions: Transaction[],
  accountHoldings: Holding[],
  accountRealizedTrades: RealizedTrade[],
  fxRate: number,
  baseCurrency: CurrencyCode,
): AccountMetrics => {
  const cashBalance = computeCashBalanceBase(accountTransactions, fxRate, baseCurrency);

  const dividendIncome = accountTransactions
    .filter((tx) => tx.type === "DIVIDEND")
    .reduce((sum, tx) => sum + getDividendNetBase(tx, fxRate, baseCurrency), 0);
  const standaloneFees = accountTransactions
    .filter((tx) => tx.type === "FEE")
    .reduce((sum, tx) => sum + getTransactionFeeBase(tx, fxRate, baseCurrency), 0);
  const realizedTradesBase = accountRealizedTrades.reduce((sum, trade) => sum + trade.pnlValue, 0);
  const unrealized = accountHoldings.reduce((sum, holding) => sum + holding.pnlValue, 0);
  const realized = realizedTradesBase + dividendIncome - standaloneFees;
  const totalPnl = realized + unrealized;
  const totalInvested = accountTransactions
    .filter((tx) => tx.type === "BUY")
    .reduce((sum, tx) => {
      const currency = getTransactionCurrency(tx, baseCurrency);
      const effectiveFxRate = tx.fxRate ?? fxRate;
      const grossBase = convertCurrencyFrom(
        getTransactionGrossAmount(tx),
        currency,
        baseCurrency,
        effectiveFxRate,
        baseCurrency,
      );
      return sum + grossBase + getTransactionFeeBase(tx, fxRate, baseCurrency);
    }, 0);

  return {
    totalValue: accountHoldings.reduce((sum, holding) => sum + holding.marketValue, 0) + cashBalance,
    cashBalance,
    realized,
    unrealized,
    totalPnl,
    roi: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
  };
};

const buildMonthlyRealizedSeries = (trades: RealizedTrade[]): IncomePoint[] => {
  const realizedByMonth = trades
    .map((trade) => {
      const timestamp = toTimestamp(trade.date);
      if (!timestamp || !Number.isFinite(trade.pnlValue)) return null;

      return {
        monthStart: getMonthStart(timestamp),
        value: trade.pnlValue,
      };
    })
    .filter((entry): entry is { monthStart: number; value: number } => entry !== null)
    .sort((a, b) => a.monthStart - b.monthStart);

  if (realizedByMonth.length === 0) return [];

  const totals = new Map<number, number>();
  for (const entry of realizedByMonth) {
    totals.set(entry.monthStart, (totals.get(entry.monthStart) ?? 0) + entry.value);
  }

  const currentMonth = getMonthStart(Date.now());
  const lastRealizedMonth = Math.max(
    realizedByMonth[realizedByMonth.length - 1]?.monthStart ?? currentMonth,
    currentMonth
  );
  const startDate = new Date(lastRealizedMonth);
  startDate.setUTCMonth(startDate.getUTCMonth() - 5);
  const startMonth = getMonthStart(startDate.getTime());
  const includeYear = new Date(startMonth).getUTCFullYear() !== new Date(lastRealizedMonth).getUTCFullYear();
  const points: IncomePoint[] = [];

  for (let month = startMonth; month <= lastRealizedMonth; month = getNextMonthStart(month)) {
    points.push({
      label: formatMonthLabel(month, includeYear),
      value: Number((totals.get(month) ?? 0).toFixed(2)),
    });
  }

  return points;
};

function RevolutSparkline({ data, color = "#22c55e", height = 60 }: { data: any[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const padding = (max - min) * 0.1;
  const domain = [min - padding, max + padding];

  return (
    <div style={{ height }} className="w-full opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${color})`}
            isAnimationActive={false}
            dot={false}
          />
          <YAxis hide domain={domain} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevolutTickerIcon({ ticker, className }: { ticker: string; className?: string }) {
  const colors: Record<string, string> = {
    "REP.MC": "bg-[#FF4D00]",
    "BTC-USD": "bg-[#F7931A]",
    "NVDA": "bg-[#76B900]",
    "AAPL": "bg-[#A2AAAD]",
    "MSFT": "bg-[#00A4EF]",
    "AMZN": "bg-[#FF9900]",
    "GOOGL": "bg-[#4285F4]",
    "SPY": "bg-[#1d4ed8]",
  };
  
  const bgColor = colors[ticker] || "bg-primary/20";
  const initial = ticker.charAt(0);
  
  return (
    <div className={cn("flex items-center justify-center rounded-full text-[10px] font-bold text-white", bgColor, className)}>
      {initial}
    </div>
  );
}

export function PortfolioClient() {
  const { holdings, realizedTrades, transactions, isLoading } = usePortfolioData();
  const { currency, baseCurrency, fxRate } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valueSeries, setValueSeries] = useState<PerformancePoint[]>([]);
  const [profitSeries, setProfitSeries] = useState<PerformancePoint[]>([]);
  const [roiSeries, setRoiSeries] = useState<PerformancePoint[]>([]);
  const accountView: PortfolioAccountView =
    searchParams.get("account") === "brokerage"
      ? "brokerage"
      : searchParams.get("account") === "robo"
        ? "robo"
        : "all";
  const showBootstrapState = isLoading && transactions.length === 0;

  const handleAccountViewChange = (nextView: PortfolioAccountView) => {
    if (nextView === accountView) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("account", nextView);
    router.replace(`${pathname}?${next.toString()}` as Route, { scroll: false });
  };

  const brokerageTransactions = useMemo(
    () => transactions.filter((tx) => matchesAccountView(getTransactionAccount(tx), "brokerage")),
    [transactions],
  );
  const roboTransactions = useMemo(
    () => transactions.filter((tx) => matchesAccountView(getTransactionAccount(tx), "robo")),
    [transactions],
  );
  const brokerageHoldings = useMemo(
    () => holdings.filter((holding) => matchesAccountView(getHoldingAccount(holding), "brokerage")),
    [holdings],
  );
  const roboHoldings = useMemo(
    () => holdings.filter((holding) => matchesAccountView(getHoldingAccount(holding), "robo")),
    [holdings],
  );
  const brokerageTrades = useMemo(
    () =>
      realizedTrades.filter((trade) => matchesAccountView(getRealizedTradeAccount(trade), "brokerage")),
    [realizedTrades],
  );
  const roboTrades = useMemo(
    () => realizedTrades.filter((trade) => matchesAccountView(getRealizedTradeAccount(trade), "robo")),
    [realizedTrades],
  );

  const selectedTransactions = useMemo(() => {
    if (accountView === "brokerage") return brokerageTransactions;
    if (accountView === "robo") return roboTransactions;
    return transactions;
  }, [accountView, brokerageTransactions, roboTransactions, transactions]);
  const selectedHoldings = useMemo(() => {
    if (accountView === "brokerage") return brokerageHoldings;
    if (accountView === "robo") return roboHoldings;
    return holdings;
  }, [accountView, brokerageHoldings, roboHoldings, holdings]);
  const selectedTrades = useMemo(() => {
    if (accountView === "brokerage") return brokerageTrades;
    if (accountView === "robo") return roboTrades;
    return realizedTrades;
  }, [accountView, brokerageTrades, roboTrades, realizedTrades]);
  const selectedSummary = useMemo(
    () => computeSummaryFromHoldings(selectedHoldings),
    [selectedHoldings],
  );
  const selectedMetrics = useMemo(
    () => computeAccountMetrics(selectedTransactions, selectedHoldings, selectedTrades, fxRate, baseCurrency),
    [selectedTransactions, selectedHoldings, selectedTrades, fxRate, baseCurrency],
  );
  const selectedMonthlyRealizedSeries = useMemo(
    () => buildMonthlyRealizedSeries(selectedTrades),
    [selectedTrades],
  );
  const selectedLargestHolding = useMemo(
    () =>
      selectedHoldings.reduce<Holding | null>((largest, holding) => {
        if (!largest || holding.marketValue > largest.marketValue) return holding;
        return largest;
      }, null),
    [selectedHoldings],
  );
  const selectedAllocation = useMemo(
    () =>
      [...selectedHoldings]
        .sort((a, b) => b.marketValue - a.marketValue)
        .map((holding) => ({
          ...holding,
          percent: selectedSummary.totalValue > 0 ? holding.marketValue / selectedSummary.totalValue : 0,
        })),
    [selectedHoldings, selectedSummary.totalValue],
  );

  const accountLabel =
    accountView === "brokerage"
      ? "Cuenta de corretaje"
      : accountView === "robo"
        ? "Robo advisor"
        : "Todas las cuentas de inversión";
  const heroTitle =
    accountView === "brokerage"
      ? "Cuenta de corretaje"
      : accountView === "robo"
        ? "Robo advisor"
        : "Todas las cuentas";
  const heroDescription =
    accountView === "brokerage"
      ? "Vista ejecutiva de la cuenta de corretaje con valor actual, rentabilidad y detalle de posiciones abiertas."
      : accountView === "robo"
        ? "Lectura consolidada del robo advisor con cierres, fees de gestión y evolución histórica."
        : "Consolida corretaje y robo advisor en una sola lectura, con métricas cercanas a la analítica de Revolut.";
  const displayedValueChange =
    valueSeries.length >= 2
      ? (valueSeries[valueSeries.length - 1]?.value ?? 0) - (valueSeries[0]?.value ?? 0)
      : selectedMetrics.totalValue;
  const displayedProfitChange = selectedMetrics.totalPnl;
  const displayedReturnPct = roiSeries[roiSeries.length - 1]?.value ?? selectedMetrics.roi;

  const fallbackPerformanceSeries = useMemo(
    () => buildPerformanceSeries(selectedTransactions, fxRate, baseCurrency),
    [selectedTransactions, fxRate, baseCurrency]
  );

  useEffect(() => {
    setValueSeries(fallbackPerformanceSeries.valuePoints);
    setProfitSeries(fallbackPerformanceSeries.gainLossPoints);
    setRoiSeries(fallbackPerformanceSeries.roiPoints);
  }, [fallbackPerformanceSeries]);

  useEffect(() => {
    let cancelled = false;

    const loadHistoricalPerformance = async () => {
      if (selectedTransactions.length === 0) return;
      const result = await buildPerformanceSeriesWithHistory(
        selectedTransactions,
        fxRate,
        baseCurrency,
        accountView,
      );
      if (!cancelled && result) {
        setValueSeries(result.valuePoints);
        setProfitSeries(result.gainLossPoints);
        setRoiSeries(result.roiPoints);
      }
    };

    void loadHistoricalPerformance();

    return () => {
      cancelled = true;
    };
  }, [selectedTransactions, fxRate, baseCurrency, accountView]);

  return (
    <div className="relative flex flex-col gap-10">
      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[360px] rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(62,199,255,0.22),rgba(7,11,20,0)_66%)]" />
      <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(22,34,57,0.82),rgba(10,16,28,0.9))] px-5 py-8 shadow-panel backdrop-blur-xl md:px-10 md:py-12">
        <div className="absolute -top-20 right-[-72px] h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 left-[-72px] h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">Gestión de inversiones</p>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text md:text-6xl">
            {heroTitle}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            {heroDescription}
          </p>
          <Link
            href="/lab"
            className="inline-flex items-center gap-2 rounded-lg border border-accent/45 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors duration-200 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
          >
            Analizar en Lab
          </Link>
          <div className="mt-1 inline-flex rounded-xl border border-border/70 bg-background/45 p-1.5">
            <button
              type="button"
              onClick={() => handleAccountViewChange("all")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                accountView === "all"
                  ? "bg-primary text-background shadow-[0_0_20px_rgba(62,199,255,0.32)]"
                  : "text-muted hover:text-text"
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => handleAccountViewChange("brokerage")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                accountView === "brokerage"
                  ? "bg-primary text-background shadow-[0_0_20px_rgba(62,199,255,0.32)]"
                  : "text-muted hover:text-text"
              )}
            >
              Corretaje
            </button>
            <button
              type="button"
              onClick={() => handleAccountViewChange("robo")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                accountView === "robo"
                  ? "bg-primary text-background shadow-[0_0_20px_rgba(62,199,255,0.32)]"
                  : "text-muted hover:text-text"
              )}
            >
              Robo
            </button>
          </div>
        </div>
      </section>
      {showBootstrapState ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[300px] w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-[200px] w-full rounded-3xl" />
            <Skeleton className="h-[200px] w-full rounded-3xl" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold tracking-tight text-white">Análisis</h2>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-muted/60">
                {accountLabel}
                <span className="text-[10px] opacity-40">▼</span>
              </div>
            </div>
            <button className="text-sm font-semibold text-primary/90 hover:opacity-80">Desde el principio</button>
          </div>

          <Card className="overflow-hidden border-none bg-[#1C1C1E] p-6 shadow-2xl transition-all hover:bg-[#2C2C2E]">
            <div className="mb-4">
              <p className="text-sm font-medium text-muted/60">Valor total</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-text">
                  {formatCurrency(convertCurrency(selectedMetrics.totalValue, currency, fxRate, baseCurrency), currency)}
                </p>
                <div className={cn("flex items-center gap-1 text-sm font-semibold", (displayedValueChange >= 0 ? "text-success" : "text-danger"))}>
                   <span className="text-[10px]">{displayedValueChange >= 0 ? "▲" : "▼"}</span>
                   {formatCurrency(convertCurrency(Math.abs(displayedValueChange), currency, fxRate, baseCurrency), currency)}
                </div>
              </div>
            </div>
            <div className="h-[180px] -mx-6 -mb-6 mt-4">
              <RevolutSparkline 
                data={valueSeries} 
                height={180} 
                color={displayedValueChange >= 0 ? "#22c55e" : "#ef4444"} 
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col justify-between border-none bg-[#1C1C1E] p-6 shadow-xl transition-all hover:bg-[#2C2C2E]">
              <div>
                <p className="text-sm font-medium text-muted/60">Rendimiento</p>
                <p className={cn("mt-1 text-2xl font-bold", displayedReturnPct >= 0 ? "text-success" : "text-danger")}>
                  {displayedReturnPct >= 0 ? "+" : ""}{formatPercent(displayedReturnPct / 100)}
                </p>
              </div>
              <div className="mt-6 h-[80px]">
                <RevolutSparkline 
                  data={roiSeries} 
                  height={80} 
                  color={displayedReturnPct >= 0 ? "#22c55e" : "#ef4444"} 
                />
              </div>
            </Card>

            <Card className="flex flex-col justify-between border-none bg-[#1C1C1E] p-6 shadow-xl transition-all hover:bg-[#2C2C2E]">
              <div>
                <p className="text-sm font-medium text-muted/60">Ganancias y Pérdidas</p>
                <p className={cn("mt-1 text-2xl font-bold", displayedProfitChange >= 0 ? "text-success" : "text-danger")}>
                  {displayedProfitChange >= 0 ? "+" : ""}{formatCurrency(convertCurrency(displayedProfitChange, currency, fxRate, baseCurrency), currency)}
                </p>
              </div>
              <div className="mt-6 h-[80px]">
                <RevolutSparkline 
                  data={profitSeries} 
                  height={80} 
                  color={displayedProfitChange >= 0 ? "#22c55e" : "#ef4444"} 
                />
              </div>
              <div className="mt-auto flex flex-col items-end gap-1 pt-8">
                <div className="flex items-center gap-2">
                  <p className={cn("text-xs font-semibold", selectedMetrics.realized >= 0 ? "text-text" : "text-danger")}>
                    {selectedMetrics.realized >= 0 ? "+" : ""}{formatCurrency(convertCurrency(selectedMetrics.realized, currency, fxRate, baseCurrency), currency)}
                  </p>
                  <p className="text-[10px] font-medium text-muted/50 tracking-wide">realizadas</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className={cn("text-xs font-semibold", selectedMetrics.unrealized >= 0 ? "text-text" : "text-danger")}>
                    {selectedMetrics.unrealized >= 0 ? "+" : ""}{formatCurrency(convertCurrency(selectedMetrics.unrealized, currency, fxRate, baseCurrency), currency)}
                  </p>
                  <p className="text-[10px] font-medium text-muted/50 tracking-wide">no realizadas</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="relative overflow-hidden border-none bg-[#1C1C1E] p-6 shadow-xl">
             <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm font-medium text-muted/60">Asignación</p>
                  <div className="mt-12 flex items-center gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text">
                       <div className="flex py-0.5 space-x-[-2px]">
                         <div className="w-[1px] h-2 bg-text/40" />
                         <div className="w-[1px] h-3 bg-text/70" />
                         <div className="w-[1px] h-2 bg-text/40" />
                       </div>
                       Mayor participación
                    </div>
                  </div>
                  <p className="text-sm font-bold text-text">
                    {selectedLargestHolding?.name || selectedLargestHolding?.ticker || "---"} <span className="text-muted/50 font-medium px-1">·</span> 
                    {selectedLargestHolding && selectedSummary.totalValue > 0 
                      ? formatPercent(selectedLargestHolding.marketValue / selectedSummary.totalValue)
                      : "0%"}
                  </p>
                </div>

                <div className="flex items-end gap-3 h-[140px] pt-4 pr-1">
                  {selectedAllocation.slice(0, 3).map((holding, idx) => (
                    <div key={holding.ticker} className="flex flex-col items-center gap-3">
                       <div 
                          className="w-10 rounded-sm bg-white" 
                          style={{ 
                            opacity: 1 - (idx * 0.35),
                            height: `${Math.max(15, (holding.marketValue / (selectedAllocation[0]?.marketValue || 1)) * 100)}%` 
                          }} 
                        />
                        <RevolutTickerIcon ticker={holding.ticker} className="h-8 w-8" />
                    </div>
                  ))}
               </div>
             </div>
          </Card>

          <Card className="border-none bg-[#1C1C1E] p-6 shadow-xl overflow-hidden">
            <p className="text-sm font-medium text-muted/60 mb-6">Desglose de ingresos</p>
            <div className="h-[200px]">
              <PortfolioMonthlyIncomeChart 
                data={selectedMonthlyRealizedSeries} 
              />
            </div>
          </Card>

          <div className="mt-4">
             <p className="px-2 text-[10px] leading-relaxed text-muted/30 uppercase tracking-[0.05em] text-center max-w-md mx-auto">
                Revolut Securities Europe UAB, autorizada y regulada por el Banco de Lituania, presta los servicios de inversión.
             </p>
          </div>

          <div className="mt-10 grid gap-10 opacity-60 hover:opacity-100 transition-opacity">
            <Card className="bg-gradient-to-b from-surface-muted/30 to-surface/92" title="Posiciones Abiertas">
               <HoldingsTable holdings={selectedHoldings} />
            </Card>
            <Card className="bg-gradient-to-b from-surface-muted/30 to-surface/92" title="Ventas Cerradas">
               <RealizedTradesTable trades={selectedTrades} />
            </Card>
          </div>
        </div>
      )}
      <AIChat />
    </div>
  );
}
