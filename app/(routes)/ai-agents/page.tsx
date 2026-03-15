import { Shell } from "@/components/layout/Shell";
import { AgentsCatalog } from "@/components/ai-agents/AgentsCatalog";
import { PageIntro } from "@/components/ui/page-intro";

export default function AIAgentsPage() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Agentes de IA"
        title="Agentes para revisar tu cartera"
        description="Lanza recomendaciones por posición, compara tonos de señal y obtén lecturas accionables sin salir del workspace."
      />

      <AgentsCatalog />
    </Shell>
  );
}
