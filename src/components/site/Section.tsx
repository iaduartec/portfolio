import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/site/Container";

interface SectionProps {
  id?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function Section({
  id,
  title,
  eyebrow,
  description,
  className,
  contentClassName,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn("py-14 sm:py-16 lg:py-20", className)} aria-labelledby={id ? `${id}-title` : undefined}>
      <Container>
        <header className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/90">{eyebrow}</p>
          ) : null}
          <h2 id={id ? `${id}-title` : undefined} className="mt-2 text-2xl font-semibold leading-tight text-text sm:text-3xl">
            {title}
          </h2>
          {description ? <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{description}</p> : null}
        </header>
        <div className={cn("mt-8", contentClassName)}>{children}</div>
      </Container>
    </section>
  );
}
