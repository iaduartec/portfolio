"use client";

import { convertCurrency, formatCurrency, formatPercent, type CurrencyCode } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Skeleton } from "@/components/ui/skeleton";

type StatVariant = "currency" | "percent";

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
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-surface/80 p-5 backdrop-blur-md transition-all hover:border-primary/45 hover:bg-surface">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-80" />

      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>

      <div className="mt-3 flex items-end justify-between">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 bg-white/10" />
            <Skeleton className="h-4 w-16 bg-white/10" />
          </div>
        ) : (
          <div className="flex flex-col">
            <p className="text-2xl font-semibold tracking-tight text-white transition-colors group-hover:text-primary">
              {formatByVariant(
                convertCurrency(value, currency, fxRate, baseCurrency),
                variant,
                currency
              )}
            </p>
            {change !== undefined && (
              <div
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                  isPositive ? "text-success" : "text-danger"
                )}
              >
                <span>{isPositive ? "▲" : "▼"}</span>
                <span>
                  {formatByVariant(
                    convertCurrency(Math.abs(change), currency, fxRate, baseCurrency),
                    effectiveChangeVariant,
                    currency
                  )}
                </span>
                <span className="text-muted">vs ayer</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
