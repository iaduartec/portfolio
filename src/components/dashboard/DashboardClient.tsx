"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { AllocationChart, ALLOCATION_COLORS } from "@/components/charts/AllocationChart";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioPerformanceChart";
import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { TradingViewSymbolInfo } from "@/components/charts/TradingViewSymbolInfo";
import { TradingViewFundamentals } from "@/components/charts/TradingViewFundamentals";
import { TradingViewTechnicalAnalysis } from "@/components/charts/TradingViewTechnicalAnalysis";
import { TradingViewTopStories } from "@/components/charts/TradingViewTopStories";
import { TradingViewCompanyProfile } from "@/components/charts/TradingViewCompanyProfile";
import { TradingViewAdvancedChart } from "@/components/charts/TradingViewAdvancedChart";
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
          <Card title="Ventas cerradas" subtitle="Registro de entradas y salidas">
            <RealizedTradesTable trades={realizedTrades} />
          </Card>
        </div>
      </section>

      <section>
        <Card title="TradingView" subtitle="Panel financiero completo estilo TradingView">
          {selectedHolding ? (
            <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-8 md:grid-cols-2">
              <section className="md:col-span-2">
                <TradingViewSymbolInfo symbol={selectedHolding.ticker} />
              </section>
              <section className="md:col-span-2 h-[500px]">
                <TradingViewAdvancedChart symbol={selectedHolding.ticker} />
              </section>
              <section className="md:col-span-2 h-[390px]">
                <TradingViewCompanyProfile symbol={selectedHolding.ticker} />
              </section>
              <section className="md:col-span-2 h-[775px]">
                <TradingViewFundamentals symbol={selectedHolding.ticker} />
              </section>
              <section className="h-[425px]">
                <TradingViewTechnicalAnalysis symbol={selectedHolding.ticker} />
              </section>
              <section className="h-[600px]">
                <TradingViewTopStories symbol={selectedHolding.ticker} height="100%" />
              </section>
              <section className="rounded-lg border border-border/60 bg-surface-muted/50 p-4 text-sm text-muted">
                <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted">Powered by TradingView</p>
                <p>
                  Charts and financial information provided by TradingView. Explore more{" "}
                  <a
                    href="https://www.tradingview.com/features/"
                    className="text-accent"
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    advanced features
                  </a>{" "}
                  or{" "}
                  <a
                    href="https://www.tradingview.com/widget/"
                    className="text-accent"
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    grab widgets
                  </a>{" "}
                  for your site.
                </p>
              </section>
            </div>
          ) : (
            <p className="text-sm text-muted">Selecciona un ticker para ver el panel TradingView.</p>
          )}
        </Card>
      </section>
    </>
  );
}
