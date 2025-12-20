"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/Card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { formatPercent } from "@/lib/formatters";

export function DashboardClient() {
  const { holdings, summary, realizedTrades } = usePortfolioData();
  const totalPnlPercent =
    summary.totalValue - summary.totalPnl > 0
      ? (summary.totalPnl / (summary.totalValue - summary.totalPnl)) * 100
      : 0;
  const realizedTotal = realizedTrades.reduce((sum, trade) => sum + trade.pnlValue, 0);
  const allocation = holdings
    .map((holding) => ({
      label: holding.ticker,
      value: summary.totalValue > 0 ? holding.marketValue / summary.totalValue : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

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

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Participaciones" subtitle="Solo posiciones abiertas con su precio promedio">
            {holdings.length > 0 ? (
              <HoldingsTable holdings={holdings} />
            ) : (
              <p className="text-sm text-muted">
                No hay posiciones abiertas todavia. Sube un CSV para calcularlas.
              </p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Allocation" subtitle="Peso por ticker (top 6)">
            <div className="mt-4 space-y-3">
              {allocation.length > 0 ? (
                allocation.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-text">{item.label}</span>
                    <span className="text-muted">{formatPercent(item.value)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Sin allocation todavia.</p>
              )}
            </div>
          </Card>
          <Card title="Ventas cerradas" subtitle="Registro de entradas y salidas">
            <RealizedTradesTable trades={realizedTrades} />
          </Card>
        </div>
      </section>
    </>
  );
}
