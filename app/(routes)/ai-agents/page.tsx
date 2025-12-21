import { Shell } from "@/components/layout/Shell";
import { AgentsCatalog } from "@/components/ai-agents/AgentsCatalog";

export default function AIAgentsPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Agentes de IA</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Agentes de IA</h1>
      </section>

      <AgentsCatalog />
    </Shell>
  );
}
