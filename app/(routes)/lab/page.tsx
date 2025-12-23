import { PatternAnalysisLab } from "@/components/charts/PatternAnalysisLab";
import { Shell } from "@/components/layout/Shell";

export default function PatternLabPage() {
  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Laboratorio</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">IA de patrones tecnicos</h1>
        <p className="text-sm text-muted">
          Pestaña de pruebas para analisis tecnico. La IA simula patrones, los detecta y los dibuja
          sobre el grafico.
        </p>
      </section>

      <PatternAnalysisLab />
    </Shell>
  );
}
