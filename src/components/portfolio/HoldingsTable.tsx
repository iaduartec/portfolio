'use client';

import { useEffect, useMemo, useState } from "react";
import { Holding } from "@/types/portfolio";
import { convertCurrency, formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type SortKey =
  | "ticker"
  | "averageBuyPrice"
  | "currentPrice"
  | "pnlPercent"
  | "dayChangePercent"
  | "marketValue";
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

const formatMetric = (value?: number, digits = 2, fallback = "—") => {
  if (!Number.isFinite(value)) return fallback;
  return value!.toFixed(digits);
};

const getFinancialInfo = (
  fundamental?: FundamentalPoint,
  fmpLimited?: boolean
): { label: string; tone: BadgeTone } => {
  const pe = fundamental?.pe;
  const tone =
    pe === undefined ? "default" : pe >= 30 ? "danger" : pe >= 22 ? "warning" : "success";
  return {
    label: `P/E ${formatMetric(pe, 2, fmpLimited ? "Cuota FMP alcanzada" : "—")}`,
    tone,
  };
};

const getRiskInfo = (
  fundamental?: FundamentalPoint,
  fmpLimited?: boolean
): { label: string; tone: BadgeTone } => {
  const beta = fundamental?.beta;
  const tone =
    beta === undefined ? "default" : beta >= 1.3 ? "danger" : beta >= 1.1 ? "warning" : "success";
  return {
    label: `Beta ${formatMetric(beta, 2, fmpLimited ? "Cuota FMP alcanzada" : "—")}`,
    tone,
  };
};

const getTechnicalInfo = (
  fundamental?: FundamentalPoint,
  fmpLimited?: boolean
): { label: string; hint: string; tone: BadgeTone } => {
  const rsi = fundamental?.rsi;
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
      ? fmpLimited
        ? ""
        : "Sin datos"
      : rsi >= 70
        ? "Sobrecompra"
        : rsi <= 30
          ? "Sobreventa"
          : "Neutral";
  return {
    label: `RSI ${formatMetric(rsi, 0, fmpLimited ? "Cuota FMP alcanzada" : "—")}`,
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

const compare = (a: Holding, b: Holding, key: SortKey, direction: SortDirection) => {
  const factor = direction === "asc" ? 1 : -1;
  if (key === "ticker") {
    return a.ticker.localeCompare(b.ticker) * factor;
  }
  const valueA = a[key] ?? 0;
  const valueB = b[key] ?? 0;
  return (valueA - valueB) * factor;
};

import { Skeleton } from "@/components/ui/skeleton";

interface HoldingsTableProps {
  holdings: Holding[];
  selectedTicker?: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect?: (value: string) => void;
  isLoading?: boolean;
}

export function HoldingsTable({ holdings, selectedTicker, onSelect, isLoading }: HoldingsTableProps) {
  const { fxRate } = useCurrency();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "marketValue",
    direction: "desc",
  });
  const cacheKey = "portfolio.fundamentals.cache.v1";
  const [fundamentals, setFundamentals] = useState<Record<string, FundamentalPoint>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, FundamentalPoint>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // ignore cache parse errors
    }
    return {};
  });
  const [fmpLimited, setFmpLimited] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(fundamentals));
    } catch {
      // ignore cache write errors
    }
  }, [cacheKey, fundamentals]);

  useEffect(() => {
    const tickers = holdings.map((holding) => holding.ticker).filter(Boolean);
    if (tickers.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/fundamentals?tickers=${encodeURIComponent(tickers.join(","))}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((payload) => {
        const data = Array.isArray(payload?.data) ? payload.data : [];
        const next = data.reduce((acc: Record<string, FundamentalPoint>, item: FundamentalPoint) => {
          if (item?.ticker) acc[item.ticker] = item;
          return acc;
        }, {});
        setFundamentals((prev) => mergeFundamentals(prev, next));
        setFmpLimited(Boolean(payload?.meta?.fmpLimited));
      })
      .catch(() => { });
    return () => controller.abort();
  }, [holdings]);

  const sortedHoldings = useMemo(
    () => [...holdings].sort((a, b) => compare(a, b, sort.key, sort.direction)),
    [holdings, sort]
  );

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: key === "ticker" ? "asc" : "desc" };
    });
  };

  return (
    <div className="card-glow overflow-hidden rounded-xl border border-border/80 bg-surface/85">
      <div className="overflow-x-auto">
        <table className="w-full table-auto divide-y divide-border/70">
          <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              {columns.map((column) => {
                const isActive = sort.key === column.key;
                const directionIcon = sort.direction === "asc" ? "↑" : "↓";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "cursor-pointer px-4 py-3 text-left font-semibold",
                      column.align === "right" && "text-right",
                      isActive && "text-text"
                    )}
                    onClick={() => handleSort(column.key)}
                  >
                    <span className="inline-flex items-center gap-2">
                      {column.label}
                      <span className={cn("text-[10px]", isActive ? "opacity-100" : "opacity-40")}>
                        {directionIcon}
                      </span>
                    </span>
                  </th>
                );
              })}
              <th className="px-4 py-3 text-left font-semibold">Señales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24 ml-auto" /></td>
                  <td className="px-4 py-3" colSpan={3}><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : (
              sortedHoldings.map((holding) => {
                const isPositive = holding.pnlValue >= 0;
                const isSelected = selectedTicker === holding.ticker;
                const fundamental = fundamentals[holding.ticker];
                const financialInfo = getFinancialInfo(fundamental, fmpLimited);
                const riskInfo = getRiskInfo(fundamental, fmpLimited);
                const technicalInfo = getTechnicalInfo(fundamental, fmpLimited);
                return (
                  <tr
                    key={holding.ticker}
                    className={cn(
                      "cursor-pointer hover:bg-surface-muted/45",
                      isSelected && "bg-surface-muted/70 ring-1 ring-primary/20"
                    )}
                    onClick={() => onSelect?.(holding.ticker)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-text">
                      <div className="flex flex-col">
                        <span className="text-base text-text">
                          {holding.name || holding.ticker}
                        </span>
                        {holding.name && (
                          <span className="text-xs text-muted font-normal">{holding.ticker}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold text-text">
                          {formatCurrency(holding.averageBuyPrice, "EUR")}
                        </span>
                        <span className="text-xs text-muted">
                          {formatCurrency(
                            convertCurrency(holding.averageBuyPrice, "USD", fxRate, "EUR"),
                            "USD"
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-text">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold text-text">
                          {formatCurrency(holding.currentPrice, "EUR")}
                        </span>
                        <span className="text-xs text-muted">
                          {formatCurrency(
                            convertCurrency(holding.currentPrice, "USD", fxRate, "EUR"),
                            "USD"
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Badge tone={isPositive ? "success" : "danger"}>
                        {formatPercent(holding.pnlPercent / 100)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {holding.dayChangePercent !== undefined ? (
                        <Badge tone={holding.dayChangePercent >= 0 ? "success" : "danger"}>
                          {formatPercent(holding.dayChangePercent / 100)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-text">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-semibold text-text">
                          {formatCurrency(holding.marketValue, "EUR")}
                        </span>
                        <span className="text-xs text-muted">
                          {formatCurrency(
                            convertCurrency(holding.marketValue, "USD", fxRate, "EUR"),
                            "USD"
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={financialInfo.tone}>{financialInfo.label}</Badge>
                        <Badge tone={riskInfo.tone}>{riskInfo.label}</Badge>
                        <Badge tone={technicalInfo.tone}>
                          {technicalInfo.label}
                          {technicalInfo.hint ? (
                            <span className="text-[10px] uppercase tracking-[0.08em] text-muted">
                              {technicalInfo.hint}
                            </span>
                          ) : null}
                        </Badge>
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
