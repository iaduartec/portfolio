import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
  className?: string;
}

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "bg-surface-muted text-text border-border",
  success: "bg-emerald-500/10 text-success border-emerald-500/30",
  danger: "bg-red-500/10 text-danger border-red-500/30",
  warning: "bg-amber-500/10 text-warning border-amber-500/30",
};

export function Badge({ children, tone = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
