import { Card } from "@/components/ui/card";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { Holding } from "@/types/portfolio";

interface DashboardHoldingsProps {
    holdings: Holding[];
    activeTicker: string | null;
    onSelectTicker: (_ticker: string | null) => void;
    fundTotal: number;
    isLoading: boolean;
}

export function DashboardHoldings({
    holdings,
    activeTicker,
    onSelectTicker,
    fundTotal,
    isLoading
}: DashboardHoldingsProps) {
    const totalFundLabel = Number.isFinite(fundTotal)
        ? `${fundTotal >= 0 ? "+" : ""}${Math.round(fundTotal)}`
        : "+0";

    return (
        <section id="holdings-section" className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-3">
                <Card
                    title="Participaciones"
                    subtitle="Solo posiciones abiertas con su precio promedio"
                    footer={
                        <div className="text-right">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Total del fondo</p>
                            <p className="text-sm font-semibold text-success">{totalFundLabel}</p>
                        </div>
                    }
                >
                    {(holdings.length > 0 || isLoading) ? (
                        <HoldingsTable
                            holdings={holdings}
                            selectedTicker={activeTicker}
                            onSelect={onSelectTicker}
                            isLoading={isLoading}
                        />
                    ) : (
                        <p className="text-sm leading-relaxed text-muted">
                            No hay posiciones abiertas todavia. Sube un CSV para calcularlas.
                        </p>
                    )}
                </Card>
            </div>
        </section>
    );
}
