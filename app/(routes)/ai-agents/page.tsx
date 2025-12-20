import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/Card";

export default function AIAgentsPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">AI Agents</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">AI Agents</h1>
        <p className="max-w-3xl text-sm text-muted">
          Centro de agentes inteligentes para análisis, alertas y automatizaciones del portafolio.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card
          title="Agente de Señales"
          subtitle="Detecta oportunidades y riesgos en tus posiciones"
        >
          <p className="text-sm text-muted">
            Próximamente: alertas basadas en cambios de precio, volumen y niveles técnicos.
          </p>
        </Card>
        <Card
          title="Agente de Informes"
          subtitle="Resúmenes automáticos de rendimiento"
        >
          <p className="text-sm text-muted">
            Próximamente: reportes diarios con P&amp;L, allocation y eventos relevantes.
          </p>
        </Card>
      </section>
    </Shell>
  );
}
