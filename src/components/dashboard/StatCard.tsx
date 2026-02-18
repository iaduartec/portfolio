"use client";

import { convertCurrency, formatCurrency, formatPercent, type CurrencyCode } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type StatVariant = "currency" | "percent";

import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number;
  variant?: StatVariant;
  change?: number;
  changeVariant?: StatVariant;
  isLoading?: boolean;
}

const formatByVariant = (value: number, variant: StatVariant, currency: CurrencyCode) =>
  variant === "percent" ? formatPercent(value / 100) : formatCurrency(value, currency);

export function StatCard({
  label,
  value,
  variant = "currency",
  change,
  changeVariant,
  isLoading,
}: StatCardProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  const effectiveChangeVariant = changeVariant ?? variant;
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="group retro-scan relative overflow-hidden rounded-lg border border-primary/30 bg-surface/70 p-5 backdrop-blur-md transition-all hover:border-accent/50 hover:bg-surface">
      <div
        className={cn(
          "absolute -right-5 -top-5 h-24 w-24 blur-3xl opacity-0 transition-opacity group-hover:opacity-25",
          isPositive ? "bg-success" : "bg-danger"
        )}
      />

      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>

      <div className="mt-3 flex items-end justify-between">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 bg-primary/15" />
            <Skeleton className="h-4 w-16 bg-primary/15" />
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <p className="text-3xl tracking-tight text-white transition-colors group-hover:text-primary">
                {formatByVariant(
                  convertCurrency(value, currency, fxRate, baseCurrency),
                  variant,
                  currency
                )}
              </p>
              {change !== undefined && (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1 text-xs uppercase tracking-[0.12em]",
                    isPositive ? "text-success" : "text-danger"
                  )}
                >
                  <span>{isPositive ? "↑" : "↓"}</span>
                  <span>
                    {formatByVariant(
                      convertCurrency(Math.abs(change), currency, fxRate, baseCurrency),
                      effectiveChangeVariant,
                      currency
                    )}
                  </span>
                  <span className="font-medium text-muted">vs ayer</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
