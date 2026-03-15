import { Shell } from "@/components/layout/Shell";
import { PortfolioChartsGrid } from "@/components/charts/PortfolioChartsGrid";
import { AITechnicalAnalysis } from "@/components/ai/AITechnicalAnalysis";
import { LabGlobalAnalyzer } from "@/components/charts/LabGlobalAnalyzer";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { MontecarloCalculator } from "@/components/charts/MontecarloCalculator";
import Link from "next/link";
import { PageIntro } from "@/components/ui/page-intro";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

export default function PatternLabPage() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Laboratorio de investigación"
        title="Lab de análisis técnico y estratégico"
        description="Explora hipótesis con datos de mercado, pruebas de reglas y detección de patrones antes de pasar a ejecución en portfolio."
        actions={
          <Button asChild variant="secondary">
            <Link href="/portfolio">Aplicar insight al portfolio</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-10">
        <LabGlobalAnalyzer />

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Estado de cartera"
            description="Gráficos individuales con detección automática de patrones relevantes."
          />
          <PortfolioChartsGrid />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Correlación entre activos"
            description="Identifica cuánto se mueven juntos los activos de tu cartera, una señal clave para diversificación real."
          />
          <CorrelationHeatmap />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Proyección Montecarlo"
            description="Simulación estocástica del valor potencial de la cartera usando volatilidad estimada y rentabilidad actual ajustada."
          />
          <MontecarloCalculator />
        </section>

        <AITechnicalAnalysis />
      </div>
    </Shell>
  );
}
