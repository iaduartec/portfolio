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
        "rounded-[1.35rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(20,30,49,0.9),rgba(12,19,33,0.82))] p-6 shadow-panel backdrop-blur-xl transition-all duration-300 hover:border-primary/18 hover:shadow-[0_10px_30px_rgba(0,0,0,0.32),0_24px_72px_rgba(0,0,0,0.42),0_0_0_1px_rgba(62,199,255,0.08)]",
        className
      )}
    >
      {(title || subtitle) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-[0.01em] text-text">{title}</h2>}
            {subtitle && <div className="mt-1.5 text-xs leading-relaxed text-muted">{subtitle}</div>}
          </div>
          {footer}
        </header>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}
