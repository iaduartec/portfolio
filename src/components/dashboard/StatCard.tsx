"use client";

import { Badge } from "@/components/ui/badge";
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
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-surface/30 p-5 backdrop-blur-md transition-all hover:bg-surface/50 hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      {/* Decorative Gradient Glow */}
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 blur-3xl transition-opacity opacity-0 group-hover:opacity-20",
        isPositive ? "bg-green-500" : "bg-red-500"
      )} />

      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{label}</p>

      <div className="mt-3 flex items-end justify-between">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 bg-white/5" />
            <Skeleton className="h-4 w-16 bg-white/5" />
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <p className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">
                {formatByVariant(
                  convertCurrency(value, currency, fxRate, baseCurrency),
                  variant,
                  currency
                )}
              </p>
              {change !== undefined && (
                <div className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-bold",
                  isPositive ? "text-green-400" : "text-red-400"
                )}>
                  <span>{isPositive ? "↑" : "↓"}</span>
                  <span>
                    {formatByVariant(
                      convertCurrency(Math.abs(change), currency, fxRate, baseCurrency),
                      effectiveChangeVariant,
                      currency
                    )}
                  </span>
                  <span className="text-muted-foreground/40 font-medium">vs ayer</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
