import Link from "next/link";
import { Upload, List } from "lucide-react";

export function DashboardHero() {
    return (
        <section className="flex flex-col items-start gap-5 py-6 md:py-10">
            <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    Inteligencia Artificial aplicada al Trading
                </p>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text max-w-2xl leading-[1.1]">
                    Maximiza tu Rentabilidad con <span className="text-accent">Analisis de IA</span>
                </h1>
                <p className="max-w-xl text-balance text-lg text-muted">
                    Analiza tu portafolio en segundos y toma decisiones basadas en datos con nuestros agentes inteligentes.
                    Tus posiciones se calculan automáticamente desde tu CSV.
                </p>
            </div>
            <div className="flex flex-wrap gap-3">
                <Link
                    href="/upload"
                    className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-bold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <Upload className="h-5 w-5" />
                    Analizar mi cartera
                </Link>
                <Link
                    href="#holdings-section"
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-6 py-3 text-base font-semibold text-text transition-all hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <List className="h-5 w-5" />
                    Ver posiciones
                </Link>
            </div>
        </section>
    );
}
