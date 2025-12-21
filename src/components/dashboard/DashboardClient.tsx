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

import { AIChat } from "@/components/ai/AIChat";
import { MarketPulse } from "@/components/ai/MarketPulse";
import { ScenarioBuilder } from "@/components/ai/ScenarioBuilder";

export function DashboardClient() {
  const { holdings, summary, realizedTrades, isLoading } = usePortfolioData();
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
      <section className="flex flex-col items-start gap-5 py-6 md:py-10">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Inteligencia Artificial aplicada al Trading</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text max-w-2xl leading-[1.1]">
            Maximiza tu Rentabilidad con <span className="text-accent">Insights de IA</span>
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted">
            Analiza tu portafolio en segundos y toma decisiones basadas en datos con nuestros agentes inteligentes. Tus posiciones se calculan automáticamente desde tu CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.location.href = '/upload'}
            className="rounded-lg bg-accent px-6 py-3 text-base font-bold text-white shadow-lg shadow-accent/20 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
          >
            Analizar Mi Cartera
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('holdings-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="rounded-lg border border-border bg-surface/50 px-6 py-3 text-base font-semibold text-text transition-all hover:bg-surface-muted"
          >
            Ver Posiciones
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Valor total" value={summary.totalValue} isLoading={isLoading} />
        <StatCard
          label="P&amp;L abierto"
          value={summary.totalPnl}
          change={totalPnlPercent}
          changeVariant="percent"
          isLoading={isLoading}
        />
        <StatCard label="P&amp;L realizado" value={realizedTotal} isLoading={isLoading} />
      </section>

      <section className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
        <div className="md:col-span-1">
          <AIChat />
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MarketPulse />
            <ScenarioBuilder />
          </div>
          <Card title="AI Analysis" subtitle="Real-time insights on your portfolio">
            <p className="text-muted-foreground text-sm p-4">
              The AI Assistant (left) can analyze your specific holdings. Try asking "How is AAPL performing?" or "What is my risk exposure?".
              The widgets above provide quick "pulse" checks and scenario planning.
            </p>
          </Card>
        </div>
      </section>

      <section id="holdings-section" className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <Card title="Participaciones" subtitle="Solo posiciones abiertas con su precio promedio">
            {(holdings.length > 0 || isLoading) ? (
              <HoldingsTable
                holdings={holdings}
                selectedTicker={activeTicker}
                onSelect={setSelectedTicker}
                isLoading={isLoading}
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
