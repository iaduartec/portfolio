import { Card } from "@/components/ui/card";
import { Activity, Zap } from "lucide-react";

type MarketPulseProps = {
    sentiment: string;
    score: number;
    insight: string;
};

export function MarketPulse({ sentiment, score, insight }: MarketPulseProps) {
    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

    return (
        <Card className="surface-card-muted p-5">
            <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl border border-primary/18 bg-primary/10 p-2 text-primary">
                    <Activity size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text">Pulso de mercado</h3>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Lectura agregada</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-4">
                    <div className="flex flex-col">
                        <span className="financial-label">Sentimiento dominante</span>
                        <span className="mt-2 text-xl font-semibold text-text">{sentiment}</span>
                    </div>
                    <div className="text-right">
                        <span className="financial-value text-2xl font-semibold text-primary">{normalizedScore}</span>
                        <span className="ml-1 text-[10px] font-semibold text-text-tertiary">/100</span>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface/80">
                        <div
                            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                            style={{ width: `${normalizedScore}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                        <span>Bajista</span>
                        <span>Neutral</span>
                        <span>Alcista</span>
                    </div>
                </div>

                <div className="flex items-start gap-2 rounded-[1.1rem] border border-primary/14 bg-primary/[0.07] p-3">
                    <Zap size={12} className="text-primary" />
                    <p className="text-[11px] font-medium leading-relaxed text-text-secondary">
                        {insight}
                    </p>
                </div>
            </div>
        </Card>
    );
}
