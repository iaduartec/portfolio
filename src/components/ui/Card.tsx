import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, subtitle, className, children, footer }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 card-glow", className)}>
      {(title || subtitle) && (
        <header className="mb-3 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-text">{title}</h3>}
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
          {footer}
        </header>
      )}
      <div>{children}</div>
    </div>
  );
}
