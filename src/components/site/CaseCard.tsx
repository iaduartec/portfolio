import { ArrowUpRight } from "lucide-react";

interface CaseCardProps {
  title: string;
  clientType: string;
  scope: string[];
  result: string;
}

export function CaseCard({ title, clientType, scope, result }: CaseCardProps) {
  return (
    <article className="rounded-2xl border border-border/70 bg-surface/65 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted">{clientType}</p>
          <h3 className="mt-1 text-lg font-semibold text-text">{title}</h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </div>

      <ul className="mt-4 space-y-2">
        {scope.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-muted">
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg border border-success/35 bg-success/10 px-3 py-2 text-sm font-medium text-success">
        Resultado: {result}
      </p>
    </article>
  );
}
