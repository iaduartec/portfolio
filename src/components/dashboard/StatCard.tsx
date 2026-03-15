"use client";

import { convertCurrency, formatCurrency, formatPercent, type CurrencyCode } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/metric-card";

type StatVariant = "currency" | "percent";

interface StatCardProps {
  label: string;
  value: number;
  variant?: StatVariant;
  change?: number;
  changeVariant?: StatVariant;
  isLoading?: boolean;
  emphasis?: "default" | "primary";
  hint?: string;
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
  emphasis = "default",
  hint,
}: StatCardProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  const effectiveChangeVariant = changeVariant ?? variant;
  const isPositive = (change ?? 0) >= 0;
  const isPrimary = emphasis === "primary";
  const displayedValue = formatByVariant(
    convertCurrency(value, currency, fxRate, baseCurrency),
    variant,
    currency
  );
  const displayedChange = change !== undefined
    ? formatByVariant(
        convertCurrency(Math.abs(change), currency, fxRate, baseCurrency),
        effectiveChangeVariant,
        currency
      )
    : null;

  if (isLoading) {
    return (
      <div className="surface-panel rounded-[1.5rem] p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-5 h-10 w-32" />
        <Skeleton className="mt-3 h-4 w-24" />
      </div>
    );
  }

  return (
    <MetricCard
      label={label}
      value={<span className={cn("financial-value", isPrimary ? "text-[2.15rem]" : "text-[1.85rem]")}>{displayedValue}</span>}
      change={
        displayedChange ? (
          <span className={cn("inline-flex items-center gap-1.5", isPositive ? "text-success" : "text-danger")}>
            <span aria-hidden="true">{isPositive ? "▲" : "▼"}</span>
            <span>{displayedChange}</span>
            <span className="text-text-tertiary">vs ayer</span>
          </span>
        ) : undefined
      }
      hint={hint}
      tone={isPrimary ? "primary" : "default"}
    />
  );
}
