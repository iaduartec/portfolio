import { Card } from "@/components/ui/card";
import { Activity, Zap } from "lucide-react";

export function MarketPulse() {
    // Static data for now, would be dynamic with AI
    const sentiment = "Optimismo cauteloso";
    const score = 65; // 0-100

    return (
        <Card className="relative overflow-hidden border-white/5 bg-surface/30 backdrop-blur-md p-5 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -z-10" />

            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <Activity size={18} />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Pulso de mercado</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
                        <span className="text-[10px] text-muted-foreground font-bold">LIVE ANALYSIS</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">Sentimiento Dominante</span>
                        <span className="text-xl font-bold text-white group-hover:text-primary transition-colors">{sentiment}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-primary">{score}</span>
                        <span className="text-[10px] text-muted-foreground font-bold ml-1">/100</span>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-primary to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${score}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                        <span>Bajista</span>
                        <span>Neutral</span>
                        <span>Alcista</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <Zap size={12} className="text-primary" />
                    <p className="text-[10px] text-primary/80 leading-tight font-medium">
                        Alta correlación detectada con movimientos de bonos.
                    </p>
                </div>
            </div>
        </Card>
    );
}
