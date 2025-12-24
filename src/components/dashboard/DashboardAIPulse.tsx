import { Card } from "@/components/ui/card";
import { MarketPulse } from "@/components/ai/MarketPulse";
import { ScenarioBuilder } from "@/components/ai/ScenarioBuilder";

export function DashboardAIPulse() {
    return (
        <section className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
            <div className="md:col-span-3 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <MarketPulse />
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
