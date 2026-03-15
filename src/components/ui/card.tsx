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
        "surface-card w-full min-w-0 rounded-[1.5rem] p-5 backdrop-blur-xl transition-all duration-300 hover:border-primary/12 md:p-6",
        className
      )}
    >
      {(title || subtitle) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-[0.01em] text-text">{title}</h2>}
            {subtitle && <div className="mt-1.5 text-xs leading-relaxed text-text-tertiary">{subtitle}</div>}
          </div>
          {footer}
        </header>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}
