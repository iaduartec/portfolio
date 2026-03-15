import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "primary" | "success" | "danger" | "warning";
  className?: string;
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "border-border/80 bg-surface/80",
  primary: "border-primary/18 bg-primary/[0.08]",
  success: "border-success/20 bg-success/[0.08]",
  danger: "border-danger/18 bg-danger/[0.08]",
  warning: "border-warning/20 bg-warning/[0.08]",
};

export function MetricCard({
  label,
  value,
  change,
  hint,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "surface-panel flex min-h-[148px] flex-col justify-between rounded-[1.5rem] p-5",
        toneClasses[tone],
        className
      )}
    >
      <div>
        <p className="financial-label">{label}</p>
        <div className="financial-value mt-3 text-3xl font-semibold text-text">{value}</div>
      </div>
      <div className="mt-4 space-y-2">
        {change ? <div className="text-sm font-medium text-text-secondary">{change}</div> : null}
        {hint ? <p className="text-xs leading-relaxed text-text-tertiary">{hint}</p> : null}
      </div>
    </div>
  );
}
