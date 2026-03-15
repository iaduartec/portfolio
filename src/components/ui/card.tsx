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
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-gradient-to-b from-surface/80 to-surface/40 p-6 shadow-panel backdrop-blur-xl transition-all hover:border-white/10",
        className
      )}
    >
      {(title || subtitle) && (
        <header className="mb-4 flex items-center justify-between">
          <div>
            {title && <h2 className="text-base font-semibold text-text">{title}</h2>}
            {subtitle && <div className="mt-1 text-xs text-muted">{subtitle}</div>}
          </div>
          {footer}
        </header>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}
