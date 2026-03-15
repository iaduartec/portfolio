import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-card flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[2rem] px-6 py-14 text-center",
        className
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-text">{title}</h2>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
