'use client';

import { useMemo, useState } from "react";
import { Holding } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

const hashTicker = (ticker: string) =>
  ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

const getFinancialInfo = (ticker: string) => {
  const seed = hashTicker(ticker);
  const pe = 10 + (seed % 35);
  return `P/E ${pe}`;
};

const getRiskInfo = (ticker: string) => {
  const seed = hashTicker(ticker);
  const beta = 0.6 + (seed % 120) / 100;
  return `Beta ${beta.toFixed(2)}`;
};

const getTechnicalInfo = (ticker: string) => {
  const seed = hashTicker(ticker);
  const rsi = 35 + (seed % 40);
  return `RSI ${rsi}`;
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
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "marketValue",
    direction: "desc",
  });

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
    <div className="overflow-hidden rounded-xl border border-border bg-surface card-glow">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-border/70">
          <thead className="bg-surface-muted/50 text-xs uppercase tracking-[0.08em] text-muted">
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
              <th className="px-4 py-3 text-left font-semibold">Información financiera</th>
              <th className="px-4 py-3 text-left font-semibold">Riesgo</th>
              <th className="px-4 py-3 text-left font-semibold">Datos técnicos</th>
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
                return (
                  <tr
                    key={holding.ticker}
                    className={cn(
                      "cursor-pointer hover:bg-surface-muted/50",
                      isSelected && "bg-surface-muted/70"
                    )}
                    onClick={() => onSelect?.(holding.ticker)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-text">
                      {holding.ticker}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted">
                      {formatCurrency(holding.averageBuyPrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-text">
                      {formatCurrency(holding.currentPrice)}
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
                      {formatCurrency(holding.marketValue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {getFinancialInfo(holding.ticker)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {getRiskInfo(holding.ticker)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {getTechnicalInfo(holding.ticker)}
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
