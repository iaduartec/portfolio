'use client';

import { useMemo, useState } from "react";
import { Holding } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

type SortKey = "ticker" | "averageBuyPrice" | "currentPrice" | "pnlPercent" | "marketValue";
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
  { key: "marketValue", label: "Valor de mercado", align: "right" },
];

const compare = (a: Holding, b: Holding, key: SortKey, direction: SortDirection) => {
  const factor = direction === "asc" ? 1 : -1;
  if (key === "ticker") {
    return a.ticker.localeCompare(b.ticker) * factor;
  }
  return (a[key] - b[key]) * factor;
};

interface HoldingsTableProps {
  holdings: Holding[];
  selectedTicker?: string | null;
  // eslint-disable-next-line no-unused-vars
  onSelect?: (value: string) => void;
}

export function HoldingsTable({ holdings, selectedTicker, onSelect }: HoldingsTableProps) {
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
        <table className="min-w-full divide-y divide-border/70">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {sortedHoldings.map((holding) => {
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
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-text">
                    {formatCurrency(holding.marketValue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
