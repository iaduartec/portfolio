import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageIntroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageIntroProps) {
  return (
    <section
      className={cn(
        "surface-card relative overflow-hidden rounded-[2rem] px-6 py-8 md:px-10 md:py-10",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-3 inline-flex items-center rounded-full border border-primary/18 bg-primary/8 px-3 py-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">{eyebrow}</p>
            </div>
          ) : null}
          <h1 className="section-title text-balance text-3xl font-semibold tracking-tight text-text md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary md:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
