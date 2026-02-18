import Link from "next/link";
import { Upload, List, TrendingUp, Sparkles } from "lucide-react";

export function DashboardHero() {
  return (
    <section className="relative overflow-hidden py-10 text-center md:py-16">
      <div className="absolute inset-x-0 top-4 -z-10 mx-auto h-72 max-w-4xl rounded-full bg-primary/20 blur-[120px]" />

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Inteligencia de mercado en tiempo real
        </div>

        <h1 className="section-title text-3xl font-semibold leading-tight text-white md:text-5xl">
          Visualiza tu cartera con una
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> UI clara, moderna y accionable</span>
        </h1>

        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted md:text-lg">
          Consolida posiciones, rendimiento y senales de mercado en un solo panel para tomar decisiones con mas contexto y menos friccion.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/upload"
          className="group inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary/15 px-6 py-3 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/20"
        >
          <Upload className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          Cargar transacciones
        </Link>
        <Link
          href="#holdings-section"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-6 py-3 text-sm font-semibold text-text transition-all hover:-translate-y-0.5 hover:border-accent/45 hover:text-white"
        >
          <List className="h-4 w-4" />
          Ver posiciones
        </Link>
      </div>

      <div className="mt-7 flex items-center justify-center gap-5 text-xs text-muted">
        <div className="inline-flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
          Rendimiento diario y acumulado
        </div>
        <span className="h-1 w-1 rounded-full bg-border" />
        <div className="inline-flex items-center gap-2 text-accent">Analisis AI + TradingView</div>
      </div>
    </section>
  );
}
