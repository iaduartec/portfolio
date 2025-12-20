'use client';

import { useMemo } from "react";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Shell } from "@/components/layout/Shell";
import { formatPercent } from "@/lib/formatters";
import { usePortfolioData } from "@/hooks/usePortfolioData";

export default function Home() {
  const { holdings, summary, hasTransactions } = usePortfolioData();
  const dailyPnlPercent = summary.totalValue > 0 ? (summary.dailyPnl / summary.totalValue) * 100 : 0;
  const totalPnlPercent = summary.totalValue > 0 ? (summary.totalPnl / summary.totalValue) * 100 : 0;
  const allocation = useMemo(() => {
    if (!holdings.length) return [];
    const total = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
    return holdings.map((holding) => ({
      label: holding.ticker,
      value: total > 0 ? (holding.marketValue / total) * 100 : 0,
    }));
  }, [holdings]);

  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Panel</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Portafolio</h1>
        <p className="max-w-3xl text-sm text-muted">
          Vista inspirada en TradingView: KPIs arriba, tabla de participaciones, y placeholders para gráficos de velas y allocation.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Valor total" value={summary.totalValue} change={summary.totalPnl} />
        <StatCard
          label="P&L diario"
          value={summary.dailyPnl}
          change={dailyPnlPercent}
          changeVariant="percent"
        />
        <StatCard
          label="P&L total"
          value={summary.totalPnl}
          change={totalPnlPercent}
          changeVariant="percent"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="Participaciones"
            subtitle={hasTransactions ? "Datos calculados a partir de tus transacciones" : "Sube tus transacciones para ver posiciones"}
          >
            {holdings.length ? (
              <HoldingsTable holdings={holdings} />
            ) : (
              <p className="text-sm text-muted">No hay participaciones calculadas todavía.</p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Allocation" subtitle="Placeholder para gráfico de torta (Recharts)">
            {allocation.length ? (
              <div className="mt-4 space-y-3">
                {allocation.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-text">{item.label}</span>
                    <span className="text-muted">{formatPercent(item.value / 100)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Sin datos de allocation todavía.</p>
            )}
          </Card>
          <Card title="Gráfico de velas" subtitle="Integrar lightweight-charts al seleccionar un ticker">
            <div className="mt-3 rounded-lg border border-border/60 bg-surface-muted/50 p-4 text-sm text-muted">
              Placeholder para el gráfico de velas (candlestick) de TradingView.
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
