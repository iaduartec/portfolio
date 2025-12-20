"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { AllocationChart, ALLOCATION_COLORS } from "@/components/charts/AllocationChart";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioPerformanceChart";
import { Card } from "@/components/ui/Card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { formatPercent } from "@/lib/formatters";

export function DashboardClient() {
  const { holdings, summary, realizedTrades } = usePortfolioData();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const totalPnlPercent =
    summary.totalValue - summary.totalPnl > 0
      ? (summary.totalPnl / (summary.totalValue - summary.totalPnl)) * 100
      : 0;
  const realizedTotal = realizedTrades.reduce((sum, trade) => sum + trade.pnlValue, 0);
  const allocation = useMemo(
    () =>
      holdings
        .map((holding) => ({
          label: holding.ticker,
          value: holding.marketValue,
          percent: summary.totalValue > 0 ? holding.marketValue / summary.totalValue : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [holdings, summary.totalValue]
  );
  const activeTicker = selectedTicker ?? holdings[0]?.ticker ?? null;
  const selectedHolding = holdings.find((holding) => holding.ticker === activeTicker);
  const performanceSeries = useMemo(() => {
    const base = summary.totalValue || 1;
    const points = [
      { label: "Ene", value: base * 0.82 },
      { label: "Feb", value: base * 0.9 },
      { label: "Mar", value: base * 0.88 },
      { label: "Abr", value: base * 0.95 },
      { label: "May", value: base * 1.02 },
      { label: "Jun", value: base * 1.08 },
    ];
    return points.map((point) => ({
      ...point,
      value: Number(point.value.toFixed(2)),
    }));
  }, [summary.totalValue]);

  return (
    <>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Panel</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Portafolio</h1>
        <p className="max-w-3xl text-sm text-muted">
          Tus posiciones abiertas se calculan desde el CSV. Las ventas se guardan como P&amp;L realizado.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Valor total" value={summary.totalValue} />
        <StatCard
          label="P&amp;L abierto"
          value={summary.totalPnl}
          change={totalPnlPercent}
          changeVariant="percent"
        />
        <StatCard label="P&amp;L realizado" value={realizedTotal} />
      </section>

      <section>
        <Card title="Rendimiento de la cartera" subtitle="Evolución del valor (mock hasta tener histórico)">
          <PortfolioPerformanceChart data={performanceSeries} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Participaciones" subtitle="Solo posiciones abiertas con su precio promedio">
            {holdings.length > 0 ? (
              <HoldingsTable
                holdings={holdings}
                selectedTicker={activeTicker}
                onSelect={setSelectedTicker}
              />
            ) : (
              <p className="text-sm text-muted">
                No hay posiciones abiertas todavia. Sube un CSV para calcularlas.
              </p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Allocation" subtitle="Peso por ticker (top 6)">
            {allocation.length > 0 ? (
              <>
                <AllocationChart data={allocation} />
                <div className="mt-4 space-y-3">
                  {allocation.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
                        />
                        <span className="text-text">{item.label}</span>
                      </div>
                      <span className="text-muted">{formatPercent(item.percent)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Sin allocation todavia.</p>
            )}
          </Card>
          <Card title="Gráfico de velas" subtitle="Selecciona un activo en la tabla">
            {selectedHolding ? (
              <CandlestickChart
                ticker={selectedHolding.ticker}
                price={selectedHolding.currentPrice}
              />
            ) : (
              <p className="text-sm text-muted">Selecciona un ticker para ver su gráfico.</p>
            )}
          </Card>
          <Card title="Ventas cerradas" subtitle="Registro de entradas y salidas">
            <RealizedTradesTable trades={realizedTrades} />
          </Card>
        </div>
      </section>
    </>
  );
}
