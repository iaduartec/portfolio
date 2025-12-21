import { Shell } from "@/components/layout/Shell";
import { AgentsCatalog } from "@/components/ai-agents/AgentsCatalog";
import { Card } from "@/components/ui/card";

export default function AIAgentsPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">AI Agents</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">AI Agents</h1>
      </section>

      <AgentsCatalog />
    </Shell>
  );
}
