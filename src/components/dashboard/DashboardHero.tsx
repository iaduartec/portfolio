import Link from "next/link";
import { Upload, List, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHero() {
  return (
    <section className="surface-card relative overflow-hidden rounded-[2rem] px-6 py-8 md:px-10 md:py-10">
      <div className="absolute inset-x-0 top-2 -z-10 mx-auto h-72 max-w-4xl rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-4 text-left md:gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary md:text-xs">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Control operativo en tiempo real
        </div>

        <h1 className="section-title max-w-4xl text-balance text-[2rem] font-semibold leading-[1.02] text-white sm:text-[3rem] md:text-[3.5rem]">
          Lee tu cartera con
          <span className="text-primary"> claridad</span>.
        </h1>

        <p className="max-w-2xl text-balance text-sm leading-relaxed text-text-secondary sm:text-base md:text-[1.05rem]">
          Posiciones, rentabilidad y riesgo en un panel hecho para trabajar con datos reales.
        </p>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button asChild size="lg">
            <Link href="/portfolio" className="gap-2">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Ver mi cartera
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/upload" className="gap-2">
              <List className="h-4 w-4" aria-hidden="true" />
              Importar movimientos
            </Link>
          </Button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-tertiary sm:gap-5">
          <div className="inline-flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-success" />
            Rendimiento diario y acumulado
          </div>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <div className="inline-flex items-center gap-2 text-accent">Análisis IA + paneles propios</div>
        </div>
      </div>
    </section>
  );
}
