"use client";

import { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { TradingViewSymbolInfo } from "@/components/charts/TradingViewSymbolInfo";
import { TradingViewFundamentals } from "@/components/charts/TradingViewFundamentals";
import { TradingViewTechnicalAnalysis } from "@/components/charts/TradingViewTechnicalAnalysis";
import { TradingViewTopStories } from "@/components/charts/TradingViewTopStories";
import { TradingViewCompanyProfile } from "@/components/charts/TradingViewCompanyProfile";
import { TradingViewAdvancedChart } from "@/components/charts/TradingViewAdvancedChart";
import { Card } from "@/components/ui/Card";
import { usePortfolioData } from "@/hooks/usePortfolioData";

export function DashboardClient() {
  const { holdings, summary, realizedTrades } = usePortfolioData();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const totalPnlPercent =
    summary.totalValue - summary.totalPnl > 0
      ? (summary.totalPnl / (summary.totalValue - summary.totalPnl)) * 100
      : 0;
  const realizedTotal = realizedTrades.reduce((sum, trade) => sum + trade.pnlValue, 0);
  const activeTicker = selectedTicker ?? holdings[0]?.ticker ?? null;
  const selectedHolding = holdings.find((holding) => holding.ticker === activeTicker);

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
      </section>

      <section>
        <Card title="TradingView" subtitle="Panel financiero completo estilo TradingView">
          {selectedHolding ? (
            <div className="tv-dark-scope mx-auto grid w-full max-w-[960px] grid-cols-1 gap-8 md:grid-cols-2">
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
