import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableShellProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TableShell({ title, subtitle, actions, children, className }: TableShellProps) {
  const hasHeader = Boolean(title || subtitle || actions);
  return (
    <div
      className={cn(
        hasHeader ? "surface-card w-full min-w-0 overflow-hidden rounded-[1.5rem]" : "w-full min-w-0 overflow-hidden",
        className
      )}
    >
      {hasHeader ? (
        <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-text">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs leading-relaxed text-text-tertiary">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
