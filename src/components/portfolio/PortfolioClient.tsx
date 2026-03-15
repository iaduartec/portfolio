"use client";

import { useEffect, useMemo, useState } from "react";
import { PortfolioDividendsChart } from "@/components/charts/PortfolioDividendsChart";
import { SectorTreemap } from "@/components/charts/SectorTreemap";
import { TearSheetExportButton } from "@/components/portfolio/TearSheetExportButton";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { RevolutTickerIcon } from "@/components/portfolio/RevolutTickerIcon";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
} from "lucide-react";
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
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFundTicker, isNonInvestmentTicker } from "@/lib/portfolioGroups";
import { computeCashBalanceBase } from "@/lib/portfolio";
import type { Holding, RealizedTrade } from "@/types/portfolio";
import type { InvestmentAccount, Transaction } from "@/types/transactions";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { MetricCard } from "@/components/ui/metric-card";



type PortfolioAccountView = "all" | "brokerage" | "robo";
type PortfolioDateRange = "all" | "1m" | "3m" | "6m" | "ytd" | "1y";
type PerformancePoint = { label: string; value: number; timestamp: number };

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
const DATE_RANGE_OPTIONS: Array<{ value: PortfolioDateRange; label: string }> = [
  { value: "all", label: "Desde el principio" },
  { value: "1m", label: "1 mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "ytd", label: "Este año" },
  { value: "1y", label: "1 año" },
];

const maskValue = (value: string, isPrivate: boolean) => (isPrivate ? "••••••" : value);

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
const getRangeStartTimestamp = (range: PortfolioDateRange, now = Date.now()) => {
  if (range === "all") return null;

  const date = new Date(now);
  switch (range) {
    case "1m":
      date.setUTCMonth(date.getUTCMonth() - 1);
      return date.getTime();
    case "3m":
      date.setUTCMonth(date.getUTCMonth() - 3);
      return date.getTime();
    case "6m":
      date.setUTCMonth(date.getUTCMonth() - 6);
      return date.getTime();
    case "1y":
      date.setUTCFullYear(date.getUTCFullYear() - 1);
      return date.getTime();
    case "ytd":
      return Date.UTC(date.getUTCFullYear(), 0, 1);
    default:
      return null;
  }
};

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
    const nowMonth = getMonthStart(Date.now());
    const empty = [{ label: formatMonthLabel(nowMonth, false), timestamp: nowMonth, value: 0 }];
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
      timestamp: monthEnd,
      value: Number(equity.toFixed(2)),
    });
    gainLossPoints.push({
      label: formatMonthLabel(month, includeYear),
      timestamp: monthEnd,
      value: Number(gainLoss.toFixed(2)),
    });
    roiPoints.push({
      label: formatMonthLabel(month, includeYear),
      timestamp: monthEnd,
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
      timestamp: dayEnd,
      value: Number(equity.toFixed(2)),
    });
    roiPoints.push({
      label: formatDayLabel(day, includeYear),
      timestamp: dayEnd,
      value: Number(roiPercent.toFixed(2)),
    });

    gainLossPoints.push({
      label: formatDayLabel(day, includeYear),
      timestamp: dayEnd,
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


function RevolutSparkline({ data, color = "#22c55e", height = 60, chartId }: { data: any[]; color?: string; height?: number; chartId: string }) {
  if (!data || data.length < 2) return <div style={{ height }} />;

  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const padding = (max - min) * 0.1;
  const domain = [min - padding, max + padding];
  // Unique gradient ID prevents DOM duplicate-id issues when multiple sparklines share a color
  const gradientId = `grad-${chartId}-${color.replace(/#/g, "")}`;

  return (
    <div style={{ height }} className="w-full opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
          />
          <YAxis hide domain={domain} />
        </AreaChart>
      </ResponsiveContainer>
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
  const [dateRange, setDateRange] = useState<PortfolioDateRange>("all");
  const accountView: PortfolioAccountView =
    searchParams.get("account") === "brokerage"
      ? "brokerage"
      : searchParams.get("account") === "robo"
        ? "robo"
        : "all";

  const [isPrivate, setIsPrivate] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("portfolio_privacy_mode") === "true";
  });

  useEffect(() => {
    window.localStorage.setItem("portfolio_privacy_mode", String(isPrivate));
  }, [isPrivate]);

  const highlights = useMemo(() => {
    if (!holdings.length) return null;

    const sortedByPnl = [...holdings].sort((a, b) => b.pnlValue - a.pnlValue);
    const best = sortedByPnl[0];
    const worst = sortedByPnl[sortedByPnl.length - 1];

    return {
      best,
      worst,
      diversity: holdings.length > 5 ? "Diversificada" : "Concentrada"
    };
  }, [holdings]);
  const showBootstrapState = isLoading && transactions.length === 0;

  const handleAccountViewChange = (nextView: PortfolioAccountView) => {
    if (nextView === accountView) return;
    const next = new URLSearchParams(searchParams.toString());
    if (nextView === "all") {
      next.delete("account");
    } else {
      next.set("account", nextView);
    }
    const query = next.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, { scroll: false });
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
  const filteredValueSeries = useMemo(() => {
    const startTimestamp = getRangeStartTimestamp(dateRange);
    if (startTimestamp === null) return valueSeries;
    const filtered = valueSeries.filter((point) => point.timestamp >= startTimestamp);
    return filtered.length > 0 ? filtered : valueSeries.slice(-1);
  }, [dateRange, valueSeries]);
  const filteredProfitSeries = useMemo(() => {
    const startTimestamp = getRangeStartTimestamp(dateRange);
    if (startTimestamp === null) return profitSeries;
    const filtered = profitSeries.filter((point) => point.timestamp >= startTimestamp);
    return filtered.length > 0 ? filtered : profitSeries.slice(-1);
  }, [dateRange, profitSeries]);
  const filteredRoiSeries = useMemo(() => {
    const startTimestamp = getRangeStartTimestamp(dateRange);
    if (startTimestamp === null) return roiSeries;
    const filtered = roiSeries.filter((point) => point.timestamp >= startTimestamp);
    return filtered.length > 0 ? filtered : roiSeries.slice(-1);
  }, [dateRange, roiSeries]);
  const displayedValueChange =
    filteredValueSeries.length >= 2
      ? (filteredValueSeries[filteredValueSeries.length - 1]?.value ?? 0) - (filteredValueSeries[0]?.value ?? 0)
      : (dateRange === "all" ? selectedMetrics.totalValue : 0);
  const displayedProfitChange =
    filteredProfitSeries.length >= 2
      ? (filteredProfitSeries[filteredProfitSeries.length - 1]?.value ?? 0) - (filteredProfitSeries[0]?.value ?? 0)
      : (dateRange === "all" ? selectedMetrics.totalPnl : 0);
  const displayedReturnPct =
    filteredRoiSeries.length >= 2
      ? (filteredRoiSeries[filteredRoiSeries.length - 1]?.value ?? 0) - (filteredRoiSeries[0]?.value ?? 0)
      : (dateRange === "all" ? selectedMetrics.roi : 0);

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
      <PageIntro
        eyebrow="Gestión de inversiones"
        title={heroTitle}
        description={heroDescription}
        actions={
          <Button asChild variant="secondary">
            <Link href="/lab">Analizar en Lab</Link>
          </Button>
        }
      />
      {showBootstrapState ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[300px] w-full rounded-3xl" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[200px] w-full rounded-3xl" />
            <Skeleton className="h-[200px] w-full rounded-3xl" />
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<UploadCloud size={26} />}
          title="Aún no hay datos cargados"
          description="Importa tus transacciones desde un CSV para construir la cartera, calcular rentabilidad y activar todo el análisis automático."
          action={
            <Button asChild size="lg">
              <Link href="/upload" className="gap-2">
                <UploadCloud size={16} />
                Importar transacciones
              </Link>
            </Button>
          }
        />
      ) : (
        <div id="portfolio-snapshot" className="flex flex-col gap-6 pb-2">
          <SectionHeading
            eyebrow="Análisis"
            title="Workspace financiero"
            description="Explora valor, rentabilidad, composición y evolución de la cartera con controles compactos y lectura rápida."
            actions={<TearSheetExportButton targetId="portfolio-snapshot" />}
          />

          <FilterBar>
            <div className="flex flex-col gap-3">
              <p className="financial-label">Cuenta</p>
              <div className="inline-flex rounded-full border border-border/70 bg-background/55 p-1">
                {[
                  { value: "all", label: "Todas" },
                  { value: "brokerage", label: "Corretaje" },
                  { value: "robo", label: "Robo" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAccountViewChange(option.value as PortfolioAccountView)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      accountView === option.value
                        ? "bg-primary text-background"
                        : "text-text-tertiary hover:text-text"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <p className="financial-label">Rango y privacidad</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDateRange(opt.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                        dateRange === opt.value
                          ? "border-primary/20 bg-primary/12 text-primary"
                          : "border-border/70 bg-surface-muted/30 text-text-tertiary hover:border-primary/24 hover:text-text"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    "group inline-flex items-center gap-3 rounded-full border px-3 py-2 transition-all",
                    isPrivate
                      ? "border-primary/24 bg-primary/10 text-primary"
                      : "border-border/70 bg-surface/40 text-text-tertiary hover:text-text"
                  )}
                  title={isPrivate ? "Mostrar valores" : "Ocultar valores"}
                >
                  {isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider select-none">
                    {isPrivate ? "Privado" : "Público"}
                  </span>
                </button>
              </div>
            </div>
          </FilterBar>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {highlights && (
                <>
                  <Card className="surface-panel flex min-h-[104px] items-center gap-4 border-success/12">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                        <TrendingUp size={20} />
                     </div>
                     <div className="min-w-0">
                        <p className="financial-label">Top impulsor</p>
                        <p className="mt-2 text-sm font-semibold text-text truncate">
                          {highlights.best.ticker} <span className="text-success ml-1 font-mono">+{maskValue(formatCurrency(convertCurrency(highlights.best.pnlValue, currency, fxRate, baseCurrency), currency), isPrivate)}</span>
                        </p>
                     </div>
                  </Card>
                  <Card className="surface-panel flex min-h-[104px] items-center gap-4 border-danger/12">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                        <TrendingDown size={20} />
                     </div>
                     <div className="min-w-0">
                        <p className="financial-label">Detractor</p>
                        <p className="mt-2 text-sm font-semibold text-text truncate">
                          {highlights.worst.ticker} <span className="text-danger ml-1 font-mono">{maskValue(formatCurrency(convertCurrency(highlights.worst.pnlValue, currency, fxRate, baseCurrency), currency), isPrivate)}</span>
                        </p>
                     </div>
                  </Card>
                  <Card className="surface-panel flex min-h-[104px] items-center gap-4 border-primary/12 md:col-span-2">
                     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Activity size={20} />
                     </div>
                     <div className="min-w-0">
                        <p className="financial-label">Estrategia</p>
                        <p className="mt-2 text-sm font-semibold text-text truncate">
                          {highlights.diversity} <span className="text-muted/40 font-medium px-1">·</span> 
                          <span className="text-primary font-mono">{maskValue(formatCurrency(convertCurrency(selectedSummary.totalValue - (highlights.best.pnlValue + highlights.worst.pnlValue), currency, fxRate, baseCurrency), currency), isPrivate)}</span>
                          <span className="text-[10px] text-muted/40 ml-1">({selectedHoldings.length} pos)</span>
                        </p>
                     </div>
                  </Card>
                </>
             )}
          </div>

          {/* KPI Summary Pills */}
          {(() => {
            const totalInvested = selectedTransactions
              .filter((tx) => tx.type === "BUY")
              .reduce((sum, tx) => {
                const gross = Number.isFinite(tx.grossAmount) && (tx.grossAmount ?? 0) !== 0
                  ? Math.abs(tx.grossAmount ?? 0)
                  : (Number.isFinite(tx.quantity) && Number.isFinite(tx.price) ? tx.quantity * tx.price : 0);
                return sum + convertCurrency(gross, currency, fxRate, baseCurrency);
              }, 0);
            const bestHolding = selectedHoldings.length > 0
              ? [...selectedHoldings].sort((a, b) => b.pnlPercent - a.pnlPercent)[0]
              : null;
            const worstHolding = selectedHoldings.length > 0
              ? [...selectedHoldings].sort((a, b) => a.pnlPercent - b.pnlPercent)[0]
              : null;
            const cash = convertCurrency(selectedMetrics.cashBalance, currency, fxRate, baseCurrency);

            const pills = [
              {
                label: "Total invertido",
                value: maskValue(formatCurrency(totalInvested, currency), isPrivate),
                colorClass: "border-primary/30 bg-primary/5 text-primary",
              },
              {
                label: "Efectivo disponible",
                value: maskValue(formatCurrency(cash, currency), isPrivate),
                colorClass: cash >= 0 ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger",
              },
              {
                label: "Mejor posición",
                value: bestHolding
                  ? `${bestHolding.ticker.split(":").pop()} ${maskValue(`${bestHolding.pnlPercent >= 0 ? "+" : ""}${formatPercent(bestHolding.pnlPercent / 100)}`, isPrivate)}`
                  : "–",
                colorClass: (bestHolding?.pnlPercent ?? 0) >= 0 ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger",
              },
              {
                label: "Peor posición",
                value: worstHolding
                  ? `${worstHolding.ticker.split(":").pop()} ${maskValue(`${worstHolding.pnlPercent >= 0 ? "+" : ""}${formatPercent(worstHolding.pnlPercent / 100)}`, isPrivate)}`
                  : "–",
                colorClass: (worstHolding?.pnlPercent ?? 0) >= 0 ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger",
              },
            ];

            return (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {pills.map((pill) => (
                  <MetricCard
                    key={pill.label}
                    label={pill.label}
                    value={<span className="text-lg font-semibold">{pill.value}</span>}
                    tone={
                      pill.colorClass.includes("success")
                        ? "success"
                        : pill.colorClass.includes("danger")
                          ? "danger"
                          : "primary"
                    }
                    className="min-h-[118px]"
                  />
                ))}
              </div>
            );
          })()}

          <Card className="overflow-hidden p-6">
            <div className="mb-4">
              <p className="financial-label">Valor total</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="financial-value text-3xl font-bold text-text">
                  {maskValue(formatCurrency(convertCurrency(selectedMetrics.totalValue, currency, fxRate, baseCurrency), currency), isPrivate)}
                </p>
                <div className={cn("flex items-center gap-1 text-sm font-semibold", (displayedValueChange >= 0 ? "text-success" : "text-danger"))}>
                   <span className="text-[10px]">{displayedValueChange >= 0 ? "▲" : "▼"}</span>
                   {maskValue(formatCurrency(convertCurrency(Math.abs(displayedValueChange), currency, fxRate, baseCurrency), currency), isPrivate)}
                </div>
              </div>
            </div>
              <div className="h-[180px] -mx-6 -mb-6 mt-4">
                <RevolutSparkline
                  chartId="value"
                  data={filteredValueSeries}
                  height={180}
                  color={displayedValueChange >= 0 ? "#22c55e" : "#ef4444"}
                />
              </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="flex flex-col justify-between">
              <div>
                <p className="financial-label">Rentabilidad</p>
                <p className={cn("financial-value mt-2 text-2xl font-bold", displayedReturnPct >= 0 ? "text-success" : "text-danger")}>
                  {maskValue(`${displayedReturnPct >= 0 ? "+" : ""}${formatPercent(displayedReturnPct / 100)}`, isPrivate)}
                </p>
              </div>
              <div className="mt-6 h-[80px]">
                <RevolutSparkline
                  chartId="roi"
                  data={filteredRoiSeries}
                  height={80}
                  color={displayedReturnPct >= 0 ? "#22c55e" : "#ef4444"}
                />
              </div>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <p className="financial-label">Ganancias y pérdidas</p>
                <p className={cn("financial-value mt-2 text-2xl font-bold", displayedProfitChange >= 0 ? "text-success" : "text-danger")}>
                  {maskValue(`${displayedProfitChange >= 0 ? "+" : ""}${formatCurrency(convertCurrency(displayedProfitChange, currency, fxRate, baseCurrency), currency)}`, isPrivate)}
                </p>
              </div>
              <div className="mt-6 h-[80px]">
                <RevolutSparkline
                  chartId="pnl"
                  data={filteredProfitSeries}
                  height={80}
                  color={displayedProfitChange >= 0 ? "#22c55e" : "#ef4444"}
                />
              </div>
              <div className="mt-auto flex flex-col items-end gap-1 pt-8">
                <div className="flex items-center gap-2">
                  <p className={cn("text-xs font-semibold", selectedMetrics.realized >= 0 ? "text-text" : "text-danger")}>
                    {maskValue(`${selectedMetrics.realized >= 0 ? "+" : ""}${formatCurrency(convertCurrency(selectedMetrics.realized, currency, fxRate, baseCurrency), currency)}`, isPrivate)}
                  </p>
                  <p className="text-[10px] font-medium text-muted/50 tracking-wide">realizadas</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className={cn("text-xs font-semibold", selectedMetrics.unrealized >= 0 ? "text-text" : "text-danger")}>
                    {maskValue(`${selectedMetrics.unrealized >= 0 ? "+" : ""}${formatCurrency(convertCurrency(selectedMetrics.unrealized, currency, fxRate, baseCurrency), currency)}`, isPrivate)}
                  </p>
                  <p className="text-[10px] font-medium text-muted/50 tracking-wide">no realizadas</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="relative min-h-[220px] overflow-hidden">
             <div className="flex flex-col md:flex-row justify-between items-start gap-6">
               <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted/50 mb-6">Asignación estratégica</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/80">
                       <div className="flex py-0.5 space-x-[-2px]">
                         <div className="w-[1px] h-2 bg-primary/40" />
                         <div className="w-[1px] h-3 bg-primary/70" />
                         <div className="w-[1px] h-2 bg-primary/40" />
                       </div>
                       Mayor participación
                    </div>
                    
                    <div>
                      <p className="text-lg font-bold text-white leading-tight">
                        {selectedLargestHolding?.name || selectedLargestHolding?.ticker || "---"}
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-tight text-text">
                        {selectedLargestHolding && selectedSummary.totalValue > 0 
                          ? formatPercent(selectedLargestHolding.marketValue / selectedSummary.totalValue)
                          : "0%"}
                        <span className="ml-2 text-xs font-medium uppercase tracking-widest text-muted/40">Peso</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel flex h-[160px] items-end gap-4 rounded-[1.5rem] px-6 pb-4 pt-8">
                  {selectedAllocation.slice(0, 3).map((holding, idx) => (
                    <div key={holding.ticker} className="flex flex-col items-center gap-4">
                       <div className="relative w-12 flex flex-col justify-end h-full">
                         <div 
                            className="w-full rounded-t-md bg-primary/75" 
                            style={{ 
                              opacity: 1 - (idx * 0.25),
                              height: `${Math.max(20, (holding.marketValue / (selectedAllocation[0]?.marketValue || 1)) * 100)}%` 
                            }} 
                          />
                        </div>
                        <RevolutTickerIcon ticker={holding.ticker} className="h-9 w-9" />
                    </div>
                  ))}
               </div>
             </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card className="overflow-hidden flex flex-col justify-center">
              <p className="financial-label mb-3">Dividendos cobrados (LTM) y rentabilidad base</p>
              <div className="h-[260px] w-full pt-4">
                <PortfolioDividendsChart 
                  transactions={selectedTransactions} 
                  holdings={selectedHoldings}
                  range={dateRange}
                />
              </div>
            </Card>
            <Card className="overflow-hidden flex flex-col justify-center">
              <SectorTreemap holdings={selectedHoldings} isPrivate={isPrivate} />
            </Card>
          </div>

          <div className="mt-10 grid gap-10">
            <Card className="bg-gradient-to-b from-surface-muted/30 to-surface/92" title="Posiciones Abiertas">
               <HoldingsTable 
                  holdings={selectedHoldings} 
                  isPrivate={isPrivate} 
                  totalPortfolioValue={selectedSummary.totalValue}
                />
            </Card>
            <Card className="bg-gradient-to-b from-surface-muted/30 to-surface/92" title="Ventas Cerradas">
               <RealizedTradesTable trades={selectedTrades} isPrivate={isPrivate} />
            </Card>
          </div>
        </div>
      )}
      <AIChat />
    </div>
  );
}
