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

  return (
    <>
      <DashboardHero />

      <DashboardStats
        summary={summary}
        realizedTotal={realizedTotal}
        totalPnlPercent={totalPnlPercent}
        isLoading={isLoading}
      />

      <DashboardAIPulse />

      <DashboardHoldings
        holdings={holdings}
        activeTicker={activeTicker}
        onSelectTicker={setSelectedTicker}
        isLoading={isLoading}
      />

      <DashboardTradingView selectedHolding={selectedHolding} />

      <AIChat />
    </>
  );
}
