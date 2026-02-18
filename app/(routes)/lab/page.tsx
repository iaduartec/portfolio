import { Shell } from "@/components/layout/Shell";
import { PortfolioChartsGrid } from "@/components/charts/PortfolioChartsGrid";
import { AITechnicalAnalysis } from "@/components/ai/AITechnicalAnalysis";
import { LabGlobalAnalyzer } from "@/components/charts/LabGlobalAnalyzer";

export default function PatternLabPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2 mb-8">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Laboratorio Avanzado</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Análisis Técnico y Estratégico</h1>
        <p className="text-sm text-muted max-w-2xl">
          Herramientas profesionales para el análisis de mercados. Busca cualquier ticker en el analizador global,
          revisa el estado técnico de tu cartera y obtén recomendaciones detalladas generadas por IA.
        </p>
      </section>

      <div className="flex flex-col gap-10">
        <LabGlobalAnalyzer />

        {/* Block 2: Portfolio Analysis */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-text">Estado de Cartera</h2>
            <p className="text-sm text-muted">Gráficos individuales con detección automática de patrones relevantes.</p>
          </div>
          <PortfolioChartsGrid />
        </section>

        {/* Block 3: AI Strategic Analysis */}
        <AITechnicalAnalysis />
      </div>
    </Shell>
  );
}
