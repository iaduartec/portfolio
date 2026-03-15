"use client";

import { useMemo, useState } from "react";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { AIChat } from "@/components/ai/AIChat";

import { DashboardHero } from "./DashboardHero";
import { DashboardStats } from "./DashboardStats";
import { DashboardComposition } from "./DashboardComposition";
import { DashboardMarketBoard } from "./DashboardMarketBoard";
import { DashboardFuturesRadar } from "./DashboardFuturesRadar";
import { DashboardAIPulse } from "./DashboardAIPulse";
import { DashboardHoldings } from "./DashboardHoldings";
import { DashboardTradingView } from "./DashboardTradingView";
import { DashboardSkillIntel } from "./DashboardSkillIntel";
import { DashboardNewsFeed } from "./DashboardNewsFeed";

export function DashboardClient() {
  const { holdings, summary, realizedTrades, isLoading } = usePortfolioData();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const totalPnlPercent = useMemo(() => {
    const denominator = summary.totalValue - summary.totalPnl;
    return denominator > 0 ? (summary.totalPnl / denominator) * 100 : 0;
  }, [summary.totalValue, summary.totalPnl]);

  const realizedTotal = useMemo(
    () => realizedTrades.reduce((sum, trade) => sum + trade.pnlValue, 0),
    [realizedTrades]
  );

  const activeTicker = selectedTicker ?? holdings[0]?.ticker ?? null;

  const selectedHolding = useMemo(
    () => holdings.find((holding) => holding.ticker === activeTicker),
    [holdings, activeTicker]
  );

  const dailyPnlPercent = useMemo(() => {
    const prevValue = summary.totalValue - summary.dailyPnl;
    return prevValue > 0 ? (summary.dailyPnl / prevValue) * 100 : 0;
  }, [summary.totalValue, summary.dailyPnl]);

  const portfolioTickers = useMemo(
    () => holdings.map((holding) => holding.ticker),
    [holdings]
  );

  const topHoldingWeight = useMemo(() => {
    if (!holdings.length || summary.totalValue <= 0) return 0;
    const topValue = Math.max(...holdings.map((holding) => holding.marketValue || 0));
    return (topValue / summary.totalValue) * 100;
  }, [holdings, summary.totalValue]);

  const marketTone = dailyPnlPercent >= 0 ? "sesgo favorable" : "sesgo defensivo";

  return (
    <div className="flex flex-col gap-8 pb-16 md:gap-10 md:pb-20">
      <DashboardHero />

      <div className="flex flex-col gap-10 md:gap-12">
        <section className="grid gap-4 md:gap-5">
          <SectionHeading
            eyebrow="Resumen ejecutivo"
            title="Capital, riesgo y enfoque"
            description="Visión general del valor de la cartera, P&L absoluto y diario, y el peso de tu posición principal."
          />
          <DashboardStats
            summary={summary}
            realizedTotal={realizedTotal}
            totalPnlPercent={totalPnlPercent}
            dailyPnlPercent={dailyPnlPercent}
            isLoading={isLoading}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <DashboardComposition
            holdings={holdings}
            totalValue={summary.totalValue}
            activeTicker={activeTicker}
            onSelectTicker={setSelectedTicker}
          />
          <aside className="rounded-2xl border border-border/80 bg-surface/70 p-4 shadow-panel backdrop-blur-xl md:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Prioridad de lectura
            </p>
            <div className="mt-3 grid gap-3 md:mt-4">
              <PriorityItem
                step="1"
                title="Riesgo de concentración"
                description={`Tu primera posición concentra un ${topHoldingWeight.toFixed(1)}% del valor total de la cartera. Actúa como el principal vector de riesgo.`}
              />
              <PriorityItem
                step="2"
                title="Foco de análisis"
                description={
                  selectedHolding
                    ? `El panel técnico inferior está mostrando datos de ${selectedHolding.ticker}. Puedes rotar el foco pulsando otros activos.`
                    : "Selecciona una posición del anillo para desplegar su panel técnico."
                }
              />
              <PriorityItem
                step="3"
                title="Contexto macro"
                description={`El sesgo de sesión actual es ${marketTone.replace("sesgo ", "")}. Contrasta este rendimiento con los futuros y la salud macro del mercado.`}
              />
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:gap-5">
          <SectionHeading
            eyebrow="Análisis activo"
            title="Panel técnico de la posición prioritaria"
            description="Gráfico avanzado con soporte para indicadores técnicos y acción de precio en vivo del activo seleccionado."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">
            <div className="min-h-[520px] overflow-hidden rounded-2xl border border-border/80 bg-surface/70 p-1 md:min-h-[600px]">
              <DashboardTradingView selectedHolding={selectedHolding} />
            </div>
            <div className="min-h-[520px] md:min-h-[600px]">
              <DashboardNewsFeed activeTicker={activeTicker} />
            </div>
          </div>
        </section>

        <section id="holdings-section" className="scroll-mt-20 grid gap-4 md:gap-5">
          <SectionHeading
            eyebrow="Posiciones"
            title="Detalle de cartera"
            description="Desglose de posiciones actuales, con opciones de ordenación por peso, rentabilidad acumulada e impacto diario."
          />
          <DashboardHoldings
            holdings={holdings}
            activeTicker={activeTicker}
            onSelectTicker={setSelectedTicker}
            fundTotal={summary.totalValue}
            isLoading={isLoading}
          />
        </section>

        <section className="grid gap-4 md:gap-5">
          <SectionHeading
            eyebrow="Mercado"
            title="Tono de sesión y macro"
            description="Contexto global de la jornada: apertura de grandes índices, amplitud temporal de mercado y mapa de futuros."
          />
          <div className="grid gap-5 md:gap-6">
            <DashboardMarketBoard holdings={holdings} />
            <DashboardFuturesRadar />
          </div>
        </section>

        <section className="grid gap-4 md:gap-5">
          <SectionHeading
            eyebrow="Inteligencia"
            title="Señales y monitoreo IA"
            description="Capa paramétrica y de inteligencia artificial diseñada para validar hipótesis y auditar la salud general del entorno."
          />
          <DashboardAIPulse />
          <DashboardSkillIntel portfolioTickers={portfolioTickers} />
        </section>
      </div>

      <AIChat />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-l border-primary/20 pl-4 md:pl-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/85">{eyebrow}</p>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="section-title text-lg font-semibold text-white md:text-xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted md:max-w-3xl">{description}</p>
        </div>
      </div>
    </div>
  );
}

function PriorityItem({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-muted/30 p-3.5 md:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm font-semibold text-primary">
          {step}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-text/85">{description}</p>
        </div>
      </div>
    </div>
  );
}
