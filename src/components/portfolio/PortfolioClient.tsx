"use client";

import { useMemo } from "react";
import { AllocationChart, ALLOCATION_COLORS } from "@/components/charts/AllocationChart";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioPerformanceChart";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { formatPercent, formatCurrency, convertCurrency } from "@/lib/formatters";
import { AIChat } from "@/components/ai/AIChat";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { cn } from "@/lib/utils";

export function PortfolioClient() {
  const { holdings, realizedTrades, summary } = usePortfolioData();
  const { currency, baseCurrency, fxRate } = useCurrency();
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
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center text-center gap-4 py-6 md:py-10">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent/80">Gestión de Inversiones</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-text">Mi Portfolio</h1>
          <p className="max-w-2xl text-lg text-muted mx-auto leading-relaxed">
            Consulte la distribución de sus activos, el rendimiento histórico y el detalle de sus posiciones abiertas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-8 bg-accent/5 border-accent/10">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Valor de Cartera</p>
          <p className="text-3xl font-bold text-text">
            {formatCurrency(convertCurrency(summary.totalValue, currency, fxRate, baseCurrency), currency)}
          </p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-8">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Diario</p>
          <p className={cn("text-3xl font-bold", summary.dailyPnl >= 0 ? "text-success" : "text-danger")}>
            {formatCurrency(convertCurrency(summary.dailyPnl, currency, fxRate, baseCurrency), currency)}
          </p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-8">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Total</p>
          <p className={cn("text-3xl font-bold", summary.totalPnl >= 0 ? "text-success" : "text-danger")}>
            {formatCurrency(convertCurrency(summary.totalPnl, currency, fxRate, baseCurrency), currency)}
          </p>
        </Card>
      </div>

      <Card title="Rendimiento de la cartera" subtitle="Evolución del valor (mock hasta tener histórico)">
        <PortfolioPerformanceChart data={performanceSeries} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card title="Distribucion" subtitle="Peso por ticker (top 6)">
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
        <Card title="Ventas cerradas" subtitle="Entradas, salidas y P&amp;L realizado">
          <RealizedTradesTable trades={realizedTrades} />
        </Card>
      </div>

      <Card title="Participaciones" subtitle="Solo posiciones abiertas">
        {holdings.length ? (
          <HoldingsTable holdings={holdings} />
        ) : (
          <p className="text-sm text-muted">No hay posiciones abiertas todavia.</p>
        )}
      </Card>
      <AIChat />
    </div>
  );
}
