import Link from "next/link";
import { Upload, List, TrendingUp, Cpu } from "lucide-react";

export function DashboardHero() {
  return (
    <section className="relative overflow-hidden py-12 text-center md:py-20">
      <div className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px] animate-pulse-soft" />

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
          <Cpu className="h-3 w-3" />
          AI ARCADE ENGINE
        </div>

        <h1 className="retro-title max-w-4xl text-2xl leading-[1.5] text-white md:text-4xl lg:text-5xl">
          Retro Gaming Portfolio
          <span className="block mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Ready Player Investor
          </span>
        </h1>

        <p className="max-w-2xl text-balance text-xl leading-relaxed text-muted md:text-2xl">
          Dashboard neon con IA en tiempo real, analitica de cartera y una interfaz inspirada en salas arcade.
        </p>
      </div>

      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/upload"
          className="group flex items-center gap-2 rounded-md border border-primary/45 bg-primary/15 px-8 py-4 text-base uppercase tracking-[0.16em] text-primary shadow-[0_0_20px_rgba(73,231,255,0.24)] transition-all hover:-translate-y-1 hover:bg-primary/25"
        >
          <Upload className="h-5 w-5 transition-transform group-hover:-translate-y-1" />
          Insert Coin (CSV)
        </Link>
        <Link
          href="#holdings-section"
          className="flex items-center gap-2 rounded-md border border-accent/45 bg-accent/10 px-8 py-4 text-base uppercase tracking-[0.16em] text-accent transition-all hover:-translate-y-1 hover:bg-accent/18"
        >
          <List className="h-5 w-5" />
          Load Inventory
        </Link>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6 text-[11px] uppercase tracking-[0.2em] text-muted">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-warning" />
          Score Multiplier
        </div>
        <div className="h-1 w-1 rounded-full bg-primary/60" />
        <div className="flex items-center gap-2 text-primary">
          <Cpu className="h-3 w-3" />
          Llama 3 + Claude 3.5
        </div>
      </div>
    </section>
  );
}
