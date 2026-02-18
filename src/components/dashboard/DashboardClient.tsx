"use client";

import { useMemo, useState } from "react";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { AIChat } from "@/components/ai/AIChat";

import { DashboardHero } from "./DashboardHero";
import { DashboardStats } from "./DashboardStats";
import { DashboardAIPulse } from "./DashboardAIPulse";
import { DashboardHoldings } from "./DashboardHoldings";
import { DashboardTradingView } from "./DashboardTradingView";

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

  return (
    <div className="flex flex-col gap-10 pb-20">
      <DashboardHero />

      <div className="flex flex-col gap-12">
        <section>
          <DashboardStats
            summary={summary}
            realizedTotal={realizedTotal}
            totalPnlPercent={totalPnlPercent}
            dailyPnlPercent={dailyPnlPercent}
            isLoading={isLoading}
          />
        </section>

        <section>
          <DashboardAIPulse />
        </section>

        <section id="holdings-section" className="scroll-mt-20">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="retro-title text-sm text-white md:text-base">Tu Cartera</h2>
          </div>
          <DashboardHoldings
            holdings={holdings}
            activeTicker={activeTicker}
            onSelectTicker={setSelectedTicker}
            isLoading={isLoading}
          />
        </section>

        <section className="min-h-[600px] overflow-hidden rounded-xl border border-primary/25 bg-surface/70 p-1">
          <DashboardTradingView selectedHolding={selectedHolding} />
        </section>
      </div>

      <AIChat />
    </div>
  );
}
