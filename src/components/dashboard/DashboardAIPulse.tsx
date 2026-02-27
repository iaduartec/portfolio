import { Card } from "@/components/ui/card";
import { MarketPulse } from "@/components/ai/MarketPulse";
import { ScenarioBuilder } from "@/components/ai/ScenarioBuilder";
import type { Holding, PortfolioSummary } from "@/types/portfolio";

type DashboardAIPulseProps = {
    holdings: Holding[];
    summary: PortfolioSummary;
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const getSentimentLabel = (score: number) => {
    if (score >= 75) return "Optimismo fuerte";
    if (score >= 60) return "Optimismo cauteloso";
    if (score >= 45) return "Neutral";
    if (score >= 30) return "Riesgo creciente";
    return "Presion bajista";
};

const getPulseInsight = (
    score: number,
    dailyPnlPercent: number,
    coveredCount: number,
    upCount: number
) => {
    if (coveredCount === 0) return "Sin cotizaciones suficientes para medir el pulso en tiempo real.";
    const direction = dailyPnlPercent >= 0 ? "al alza" : "a la baja";
    const breadth = `${upCount}/${coveredCount} valores avanzan`;
    return `Sesion ${direction}: ${breadth}. Pulso agregado ${score}/100.`;
};

export function DashboardAIPulse({ holdings, summary }: DashboardAIPulseProps) {
    const covered = holdings.filter((holding) => Number.isFinite(holding.dayChangePercent));
    const coveredCount = covered.length;
    const upCount = covered.filter((holding) => (holding.dayChangePercent ?? 0) > 0).length;
    const breadthRatio = coveredCount > 0 ? upCount / coveredCount : 0.5;
    const prevValue = summary.totalValue - summary.dailyPnl;
    const dailyPnlPercent =
        prevValue > 0 && Number.isFinite(summary.dailyPnl) ? (summary.dailyPnl / prevValue) * 100 : 0;
    const marketTilt = clamp(dailyPnlPercent * 7, -25, 25);
    const breadthTilt = (breadthRatio - 0.5) * 30;
    const score =
        coveredCount > 0 ? clamp(Math.round(50 + marketTilt + breadthTilt), 0, 100) : 50;
    const sentiment = getSentimentLabel(score);
    const insight = getPulseInsight(score, dailyPnlPercent, coveredCount, upCount);

    return (
        <section className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
            <div className="md:col-span-3 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <MarketPulse sentiment={sentiment} score={score} insight={insight} />
                    <ScenarioBuilder />
                </div>
                <Card title="Analisis de IA" subtitle="Informacion en tiempo real de tu cartera">
                    <p className="text-muted-foreground text-sm p-4">
                        El asistente de IA (esquina inferior) puede analizar tus participaciones concretas. Prueba a
                        preguntar &quot;Como va AAPL?&quot; o &quot;Cual es mi exposicion al riesgo?&quot;. Los widgets de
                        arriba ofrecen chequeos rapidos de &quot;pulso&quot; y planificacion de escenarios.
                    </p>
                </Card>
            </div>
        </section>
    );
}
