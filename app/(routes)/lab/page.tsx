import { Shell } from "@/components/layout/Shell";
import { PortfolioChartsGrid } from "@/components/charts/PortfolioChartsGrid";
import { AITechnicalAnalysis } from "@/components/ai/AITechnicalAnalysis";
import { LabGlobalAnalyzer } from "@/components/charts/LabGlobalAnalyzer";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import Link from "next/link";

export default function PatternLabPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2 mb-8">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Laboratorio de investigación</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-text">Lab de Análisis Técnico y Estratégico</h1>
        <p className="text-sm text-muted max-w-2xl">
          Explora hipótesis con datos de mercado y detección de patrones. Usa este espacio para investigar y luego pasar a ejecución en Portfolio.
        </p>
        <div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-lg border border-accent/45 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors duration-200 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
          >
            Aplicar insight al Portfolio
          </Link>
        </div>
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

        {/* Block 3: Correlation Heatmap */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-text">Correlación entre activos</h2>
            <p className="text-sm text-muted">
              Identifica cuánto se mueven juntos los activos de tu cartera — clave para diversificación real.
            </p>
          </div>
          <CorrelationHeatmap />
        </section>

        {/* Block 4: AI Strategic Analysis */}
        <AITechnicalAnalysis />
      </div>
    </Shell>
  );
}
