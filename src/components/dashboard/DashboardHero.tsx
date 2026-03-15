import Link from "next/link";
import { Upload, List, TrendingUp, Sparkles } from "lucide-react";

export function DashboardHero() {
  return (
    <section className="relative overflow-hidden py-8 text-center md:py-14">
      <div className="absolute inset-x-0 top-4 -z-10 mx-auto h-72 max-w-4xl rounded-full bg-primary/20 blur-[120px]" />

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 md:gap-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Control operativo en tiempo real
        </div>

        <h1 className="section-title text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
          Convierte datos dispersos en
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> decisiones de inversión con contexto IA</span>
        </h1>

        <p className="max-w-2xl text-balance text-sm leading-relaxed text-muted sm:text-base md:text-lg">
          Consolida posiciones, rendimiento y señales de mercado en un solo panel para actuar con más confianza y menos fricción.
        </p>
      </div>

      <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/portfolio"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/15 px-6 py-3 text-sm font-semibold text-primary transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 sm:w-auto"
        >
          <Upload className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
          Ver mi portfolio
        </Link>
        <Link
          href="/upload"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/70 px-6 py-3 text-sm font-semibold text-text transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 sm:w-auto"
        >
          <List className="h-4 w-4" aria-hidden="true" />
          Importar movimientos
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted sm:gap-5">
        <div className="inline-flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
          Rendimiento diario y acumulado
        </div>
        <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
        <div className="inline-flex items-center gap-2 text-accent">Análisis IA + paneles locales</div>
      </div>
    </section>
  );
}
