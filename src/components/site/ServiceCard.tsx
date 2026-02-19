import { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

interface ServiceCardProps {
  title: string;
  summary: string;
  outcome: string;
  icon?: ReactNode;
}

export function ServiceCard({ title, summary, outcome, icon }: ServiceCardProps) {
  return (
    <article className="group rounded-2xl border border-border/70 bg-surface/70 p-5 shadow-panel transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 sm:p-6">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{summary}</p>
      <div className="mt-4 flex items-start gap-2 text-sm text-text">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <p>{outcome}</p>
      </div>
    </article>
  );
}
