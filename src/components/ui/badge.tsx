import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
  className?: string;
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "bg-surface-muted/70 text-text-secondary border-border/80",
  success: "bg-success/10 text-success border-success/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  warning: "bg-warning/10 text-warning border-warning/25",
};

export function Badge({ children, tone = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.02em]",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
