'use client';

import { useEffect, useMemo, useState } from "react";
import { Holding } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { RevolutTickerIcon } from "@/components/portfolio/RevolutTickerIcon";

type SortKey =
  | "ticker"
  | "averageBuyPrice"
  | "currentPrice"
  | "pnlPercent"
  | "dayChangePercent"
  | "marketValue"
  | "weight";
type SortDirection = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  align?: "left" | "right";
}

const columns: Column[] = [
  { key: "ticker", label: "Símbolo" },
  { key: "averageBuyPrice", label: "Precio medio", align: "right" },
  { key: "currentPrice", label: "Precio actual", align: "right" },
  { key: "pnlPercent", label: "Ganancia %", align: "right" },
  { key: "dayChangePercent", label: "P&L día %", align: "right" },
  { key: "marketValue", label: "Valor de mercado", align: "right" },
  { key: "weight", label: "Peso %", align: "right" },
];

type FundamentalPoint = {
  ticker: string;
  symbol: string;
  pe?: number;
  ps?: number;
  pb?: number;
  evEbitda?: number;
  beta?: number;
  rsi?: number;
};

type BadgeTone = "default" | "success" | "danger" | "warning";
type SignalInfo = { label: string; tone: BadgeTone } | null;
type TechnicalSignalInfo = { label: string; hint: string; tone: BadgeTone } | null;

const formatMetric = (value?: number, digits = 2, fallback = "—") => {
  if (!Number.isFinite(value)) return fallback;
  return value!.toFixed(digits);
};

const getFinancialInfo = (
  fundamental?: FundamentalPoint,
  fmpLimited?: boolean
): SignalInfo => {
  const pe = fundamental?.pe;
  if (pe === undefined && fmpLimited) return null;
  const tone =
    pe === undefined ? "default" : pe >= 30 ? "danger" : pe >= 22 ? "warning" : "success";
  return {
    label: `P/E ${formatMetric(pe, 2)}`,
    tone,
  };
};

const getRiskInfo = (
  fundamental?: FundamentalPoint,
  fmpLimited?: boolean
): SignalInfo => {
  const beta = fundamental?.beta;
  if (beta === undefined && fmpLimited) return null;
  const tone =
    beta === undefined ? "default" : beta >= 1.3 ? "danger" : beta >= 1.1 ? "warning" : "success";
  return {
    label: `Beta ${formatMetric(beta, 2)}`,
    tone,
  };
};

const getTechnicalInfo = (
  fundamental?: FundamentalPoint,
  fmpLimited?: boolean
): TechnicalSignalInfo => {
  const rsi = fundamental?.rsi;
  if (rsi === undefined && fmpLimited) return null;
  const isMissing = rsi === undefined;
  const tone =
    isMissing
      ? "default"
      : rsi >= 75 || rsi <= 25
        ? "danger"
        : rsi >= 70 || rsi <= 30
          ? "warning"
          : "default";
  const hint =
    isMissing
      ? "Sin datos"
      : rsi >= 70
        ? "Sobrecompra"
        : rsi <= 30
          ? "Sobreventa"
          : "Neutral";
  return {
    label: `RSI ${formatMetric(rsi, 0)}`,
    hint,
    tone,
  };
};

const mergeMetric = (nextValue?: number, prevValue?: number) =>
  Number.isFinite(nextValue) ? nextValue : prevValue;

const mergeFundamentals = (
  prev: Record<string, FundamentalPoint>,
  next: Record<string, FundamentalPoint>
) => {
  const merged: Record<string, FundamentalPoint> = { ...prev };
  Object.values(next).forEach((item) => {
    if (!item?.ticker) return;
    const existing = prev[item.ticker];
    merged[item.ticker] = {
      ticker: item.ticker,
      symbol: item.symbol ?? existing?.symbol ?? item.ticker,
      pe: mergeMetric(item.pe, existing?.pe),
      ps: mergeMetric(item.ps, existing?.ps),
      pb: mergeMetric(item.pb, existing?.pb),
      evEbitda: mergeMetric(item.evEbitda, existing?.evEbitda),
      beta: mergeMetric(item.beta, existing?.beta),
      rsi: mergeMetric(item.rsi, existing?.rsi),
    };
  });
  return merged;
};

const maskValue = (value: string, isPrivate: boolean) => (isPrivate ? "••••••" : value);

interface HoldingsTableProps {
  holdings: Holding[];
  selectedTicker?: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect?: (value: string) => void;
  isLoading?: boolean;
  isPrivate?: boolean;
  totalPortfolioValue?: number;
}

export function HoldingsTable({ 
  holdings, 
  onSelect, 
  isLoading, 
  isPrivate = false,
  totalPortfolioValue = 0 
}: HoldingsTableProps) {
  const { currency } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [fundamentals, setFundamentals] = useState<Record<string, FundamentalPoint>>({});
  const [fmpLimited, setFmpLimited] = useState(false);

  const compare = (a: Holding, b: Holding, key: SortKey, direction: SortDirection) => {
    const factor = direction === "asc" ? 1 : -1;
    if (key === "ticker") {
      return a.ticker.localeCompare(b.ticker) * factor;
    }
    const internalKey = (key === "weight" ? "marketValue" : key) as keyof Holding;
    const valueA = (a[internalKey] as number) ?? 0;
    const valueB = (b[internalKey] as number) ?? 0;
    return (valueA - valueB) * factor;
  };

const quantityFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 4,
});

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => compare(a, b, sortKey, sortDirection));
  }, [holdings, sortKey, sortDirection]);

  useEffect(() => {
    const fetchFundamentals = async () => {
      try {
        const tickers = holdings.map((h) => h.ticker).filter(Boolean);
        if (tickers.length === 0) return;
        const res = await fetch(`/api/fundamentals?tickers=${encodeURIComponent(tickers.join(","))}`);
        const data = await res.json();
        const payload = Array.isArray(data?.data) ? data.data : [];
        const next = payload.reduce((acc: Record<string, FundamentalPoint>, item: FundamentalPoint) => {
          if (item?.ticker) acc[item.ticker] = item;
          return acc;
        }, {});
        setFundamentals((prev) => mergeFundamentals(prev, next));
        setFmpLimited(Boolean(data?.meta?.fmpLimited));
      } catch (err) {
        console.error("Failed to fetch fundamentals:", err);
      }
    };
    fetchFundamentals();
  }, [holdings.length]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/75 bg-gradient-to-b from-surface-muted/30 to-surface/90 shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-[1240px] w-full table-auto divide-y divide-border/70 text-left text-sm">
          <thead className="bg-surface-muted/70 text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "cursor-pointer px-4 py-3.5 font-semibold transition-colors hover:text-text",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={cn("flex items-center gap-1", col.align === "right" && "justify-end")}>
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3.5 font-semibold text-right">Análisis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-text">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col, j) => (
                    <td key={j} className="px-4 py-4">
                      <Skeleton className="h-4 w-full opacity-20" />
                    </td>
                  ))}
                  <td className="px-4 py-4"></td>
                </tr>
              ))
            ) : (
              sortedHoldings.map((holding) => {
                const isPositive = holding.pnlPercent >= 0;
                const fundamental = fundamentals[holding.ticker];
                const financialInfo = getFinancialInfo(fundamental, fmpLimited);
                const riskInfo = getRiskInfo(fundamental, fmpLimited);
                const technicalInfo = getTechnicalInfo(fundamental, fmpLimited);
                const weight = totalPortfolioValue > 0 ? (holding.marketValue / totalPortfolioValue) * 100 : 0;

                return (
                  <tr
                    key={holding.ticker}
                    className="group cursor-pointer transition-all duration-200 hover:bg-white/[0.03] active:bg-white/[0.05]"
                    onClick={() => onSelect?.(holding.ticker)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <RevolutTickerIcon ticker={holding.ticker} className="h-8 w-8 shrink-0 shadow-glow transition-transform group-hover:scale-110" />
                        <div className="flex flex-col">
                          <span className="max-w-[180px] truncate font-bold text-text">
                            {holding.ticker}
                          </span>
                          <span className="max-w-[180px] truncate text-xs text-muted/60">
                            {maskValue(quantityFormatter.format(holding.totalQuantity), isPrivate)} {holding.ticker.includes(":") ? "acciones" : "unidades"} · {holding.name || holding.ticker}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right text-muted">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold text-text">
                          {maskValue(formatCurrency(holding.averageBuyPrice, currency), isPrivate)}
                        </span>
                        {holding.averageBuyPriceRaw !== undefined && holding.currency !== currency && (
                           <span className="text-[10px] text-muted/50 font-mono">
                             {maskValue(formatCurrency(holding.averageBuyPriceRaw, holding.currency), isPrivate)}
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right text-text">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold text-text">
                          {maskValue(formatCurrency(holding.currentPrice, currency), isPrivate)}
                        </span>
                        {holding.currentPriceRaw !== undefined && holding.currency !== currency && (
                           <span className="text-[10px] text-muted/50 font-mono">
                             {maskValue(formatCurrency(holding.currentPriceRaw, holding.currency), isPrivate)}
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={isPositive ? "success" : "danger"}>
                          {maskValue(formatPercent(holding.pnlPercent / 100), isPrivate)}
                        </Badge>
                        {holding.pnlStockValue !== undefined && holding.pnlFxValue !== undefined && (
                          <div className="flex flex-col items-end text-[10px] leading-tight text-muted font-mono">
                            <span className={holding.pnlStockValue >= 0 ? "text-emerald-500/80" : "text-rose-500/80"}>
                              P: {maskValue(formatCurrency(holding.pnlStockValue, currency), isPrivate)}
                            </span>
                            <span className={holding.pnlFxValue >= 0 ? "text-emerald-500/80" : "text-rose-500/80"}>
                              FX: {maskValue(formatCurrency(holding.pnlFxValue, currency), isPrivate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      {holding.dayChangePercent !== undefined ? (
                        <Badge tone={holding.dayChangePercent >= 0 ? "success" : "danger"}>
                          {formatPercent(holding.dayChangePercent / 100)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-text">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold text-text">
                          {maskValue(formatCurrency(holding.marketValue, currency), isPrivate)}
                        </span>
                        {holding.marketValueRaw !== undefined && holding.currency !== currency && (
                           <span className="text-[10px] text-muted/50 font-mono">
                             {maskValue(formatCurrency(holding.marketValueRaw, holding.currency), isPrivate)}
                           </span>
                        )}
                      </div>
                    </td>
                     <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-sm text-primary/90">
                        {formatPercent(weight / 100)}
                     </td>
                     <td className="px-4 py-3.5">
                       <div className="flex flex-wrap items-center justify-end gap-2">
                         {financialInfo ? <Badge tone={financialInfo.tone}>{financialInfo.label}</Badge> : null}
                         {riskInfo ? <Badge tone={riskInfo.tone}>{riskInfo.label}</Badge> : null}
                        {technicalInfo ? (
                          <Badge tone={technicalInfo.tone}>
                            {technicalInfo.label}
                            {technicalInfo.hint ? (
                              <span className="text-[10px] ml-1 uppercase tracking-[0.08em] text-muted/60 font-semibold">
                                ({technicalInfo.hint})
                              </span>
                            ) : null}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
