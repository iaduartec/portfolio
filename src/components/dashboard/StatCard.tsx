import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type StatVariant = "currency" | "percent";

interface StatCardProps {
  label: string;
  value: number;
  variant?: StatVariant;
  change?: number;
  changeVariant?: StatVariant;
}

const formatByVariant = (value: number, variant: StatVariant) =>
  variant === "percent" ? formatPercent(value / 100) : formatCurrency(value);

export function StatCard({
  label,
  value,
  variant = "currency",
  change,
  changeVariant,
}: StatCardProps) {
  const effectiveChangeVariant = changeVariant ?? variant;
  const isPositive = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-2xl font-semibold text-text">{formatByVariant(value, variant)}</p>
        {change !== undefined && (
          <Badge tone={isPositive ? "success" : "danger"}>
            <span className={cn(isPositive ? "text-success" : "text-danger")}>
              {formatByVariant(change, effectiveChangeVariant)}
            </span>
          </Badge>
        )}
      </div>
    </div>
  );
}
