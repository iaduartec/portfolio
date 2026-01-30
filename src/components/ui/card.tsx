import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, subtitle, className, children, footer }: CardProps) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-surface/50 backdrop-blur-xl p-6 shadow-2xl", className)}>
      {(title || subtitle) && (
        <header className="mb-3 flex items-center justify-between">
          <div>
            {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
            {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
          </div>
          {footer}
        </header>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}
