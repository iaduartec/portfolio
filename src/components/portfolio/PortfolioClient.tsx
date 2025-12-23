"use client";

import { useMemo } from "react";
import { AllocationChart, ALLOCATION_COLORS } from "@/components/charts/AllocationChart";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioPerformanceChart";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { formatPercent } from "@/lib/formatters";

export function PortfolioClient() {
  const { holdings, realizedTrades, summary } = usePortfolioData();
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
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Portafolio</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Participaciones</h1>
        <p className="max-w-3xl text-sm text-muted">
          Detalle de holdings y ventas cerradas calculadas desde tu CSV.
        </p>
      </div>

      <Card title="Rendimiento de la cartera" subtitle="Evolución del valor (mock hasta tener histórico)">
        <PortfolioPerformanceChart data={performanceSeries} />
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <Card title="Participaciones" subtitle="Solo posiciones abiertas">
            {holdings.length ? (
              <HoldingsTable holdings={holdings} />
            ) : (
              <p className="text-sm text-muted">No hay posiciones abiertas todavia.</p>
            )}
          </Card>
        </div>
        <div className="grid gap-4 lg:col-span-3 lg:grid-cols-[minmax(240px,320px)_1fr]">
          <Card title="Distribucion" subtitle="Peso por ticker (top 6)" className="max-w-sm">
            {allocation.length > 0 ? (
              <>
                <AllocationChart data={allocation} />
                <div className="mt-3 grid gap-1.5 text-xs">
                  {allocation.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
                        />
                        <span className="truncate text-text" title={item.label}>
                          {item.label}
                        </span>
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
          <Card title="Ventas cerradas" subtitle="Entradas, salidas y P&amp;L realizado" className="w-full">
            <RealizedTradesTable trades={realizedTrades} />
          </Card>
        </div>
      </section>
    </>
  );
}
