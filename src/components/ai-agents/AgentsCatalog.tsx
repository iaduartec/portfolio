import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { agents } from "@/data/aiAgents";
import { cn } from "@/lib/utils";

export function AgentsCatalog() {
  const [selected, setSelected] = useState(agents[0]?.id ?? null);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-2">
        {agents.map((agent) => {
          const isActive = agent.id === selected;
          return (
            <button
              key={agent.id}
              onClick={() => setSelected(agent.id)}
              className={cn(
                "w-full rounded-lg border border-border bg-surface px-4 py-3 text-left transition hover:border-accent/50 hover:bg-surface-muted/60",
                isActive && "border-accent/70 bg-surface-muted/70 shadow-panel"
              )}
            >
              <p className="text-sm font-semibold text-text">{agent.name}</p>
              <p className="text-xs text-muted">{agent.category}</p>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-2 space-y-4">
        {agents
          .filter((a) => a.id === selected)
          .map((agent) => (
            <Card
              key={agent.id}
              title={agent.name}
              subtitle={agent.summary}
              className="space-y-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Propósito</p>
                  <p className="text-sm text-text/90">{agent.purpose}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Requisitos</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                    {agent.requirements.map((req) => (
                      <li key={req}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Comando sugerido</p>
                <code className="mt-1 block rounded-lg border border-border bg-surface-muted/60 px-3 py-2 text-sm text-text">
                  {agent.command}
                </code>
                <p className="mt-1 text-xs text-muted">Ejecuta desde la carpeta del repo de agentes.</p>
              </div>

              {agent.notes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Notas</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                    {agent.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
}
