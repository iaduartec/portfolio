import { Shell } from "@/components/layout/Shell";
import { AgentsCatalog } from "@/components/ai-agents/AgentsCatalog";
import { Card } from "@/components/ui/Card";

export default function AIAgentsPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">AI Agents</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">AI Agents</h1>
        <p className="max-w-3xl text-sm text-muted">
          Integración de los agentes open-source de Moon Dev para investigación, backtesting y
          señales. Sigue los pasos para instalarlos localmente y probarlos desde este panel.
        </p>
      </section>

      <Card
        title="Cómo usar estos agentes"
        subtitle="Basados en el repo moon-dev-ai-agents"
        className="space-y-3"
      >
        <ol className="list-decimal space-y-2 pl-4 text-sm text-muted">
          <li>Clona el repo: <code className="rounded bg-surface-muted/60 px-1">git clone https://github.com/moondevonyt/moon-dev-ai-agents</code></li>
          <li>Instala dependencias Python: <code className="rounded bg-surface-muted/60 px-1">pip install -r requirements.txt</code></li>
          <li>Copia <code className="rounded bg-surface-muted/60 px-1">.env_example</code> a <code className="rounded bg-surface-muted/60 px-1">.env</code> y pon tus claves de modelo (Claude, OpenAI, etc).</li>
          <li>Ejecuta el comando que veas en cada agente (desde la carpeta del repo).</li>
          <li>Usa los botones de esta página para disparar ejemplos locales (no se mandan a la nube).</li>
        </ol>
      </Card>

      <AgentsCatalog />
    </Shell>
  );
}
