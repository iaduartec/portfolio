import Link from "next/link";
import { Upload, List, TrendingUp, Cpu } from "lucide-react";

export function DashboardHero() {
    return (
        <section className="relative flex flex-col items-center text-center gap-6 py-12 md:py-20 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-[400px] bg-primary/10 blur-[120px] -z-10 rounded-full animate-pulse-soft" />

            <div className="flex flex-col items-center gap-4 z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary">
                    <Cpu className="w-3 h-3" />
                    Inteligencia Artificial Proactiva
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.05]">
                    El Futuro de tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Patrimonio</span> es Inteligente
                </h1>
                <p className="max-w-2xl text-balance text-lg md:text-xl text-muted-foreground">
                    Analiza, predice y optimiza tu cartera con algoritmos de grado institucional.
                    Visualización en tiempo real y asesoramiento por IA 24/7.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 z-10">
                <Link
                    href="/upload"
                    className="group relative flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(41,98,255,0.3)] transition-all hover:scale-[1.05] active:scale-[0.95]"
                >
                    <Upload className="h-5 w-5 transition-transform group-hover:-translate-y-1" />
                    Ingestar Cartera
                </Link>
                <Link
                    href="#holdings-section"
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
                >
                    <List className="h-5 w-5" />
                    Ver Posiciones
                </Link>
            </div>

            <div className="flex items-center gap-6 mt-8 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Análisis Cuitativo
                </div>
                <div className="w-1 h-1 rounded-full bg-border" />
                <div className="flex items-center gap-2 text-primary/60">
                    <Cpu className="w-3 h-3" />
                    Llama 3 & Claude 3.5
                </div>
            </div>
        </section>
    );
}
