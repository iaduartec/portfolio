"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/portfolio";
import type { InvestmentAccount } from "@/types/transactions";

type DashboardCompositionProps = {
  holdings: Holding[];
  totalValue: number;
  activeTicker: string | null;
  onSelectTicker: (_ticker: string | null) => void;
};

type WeightRow = {
  ticker: string;
  name?: string;
  marketValue: number;
  weight: number;
  pnlPercent: number;
  account?: InvestmentAccount;
};

const accountLabels: Record<InvestmentAccount, string> = {
  BROKERAGE: "Corretaje",
  ROBO_ADVISOR: "Robo advisor",
  UNASSIGNED: "Sin asignar",
};

const buildRiskLabel = (topWeight: number, topThreeWeight: number) => {
  if (topWeight >= 45) return "Dependencia extrema de una sola posición";
  if (topWeight >= 30) return "Concentración alta en la primera posición";
  if (topThreeWeight >= 75) return "Top 3 concentran demasiado riesgo";
  if (topThreeWeight >= 60) return "Diversificación aceptable, pero con sesgo claro";
  return "Concentración controlada";
};

export function DashboardComposition({
  holdings,
  totalValue,
  activeTicker,
  onSelectTicker,
}: DashboardCompositionProps) {
  const weightedHoldings: WeightRow[] = [...holdings]
    .filter((holding) => Number.isFinite(holding.marketValue) && holding.marketValue > 0)
    .map((holding) => ({
      ticker: holding.ticker,
      name: holding.name,
      marketValue: holding.marketValue,
      weight: totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0,
      pnlPercent: holding.pnlPercent,
      account: holding.account,
    }))
    .sort((left, right) => right.marketValue - left.marketValue);

  const topHoldings = weightedHoldings.slice(0, 5);
  const topPosition = weightedHoldings[0];
  const topThreeWeight = weightedHoldings
    .slice(0, 3)
    .reduce((sum, holding) => sum + holding.weight, 0);
  const profitableCount = weightedHoldings.filter((holding) => holding.pnlPercent >= 0).length;
  const profitableRatio = weightedHoldings.length > 0 ? (profitableCount / weightedHoldings.length) * 100 : 0;
  const accountRows = (Object.keys(accountLabels) as InvestmentAccount[])
    .map((account) => {
      const marketValue = weightedHoldings
        .filter((holding) => (holding.account ?? "UNASSIGNED") === account)
        .reduce((sum, holding) => sum + holding.marketValue, 0);
      return {
        account,
        label: accountLabels[account],
        marketValue,
        weight: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
      };
    })
    .filter((row) => row.marketValue > 0)
    .sort((left, right) => right.marketValue - left.marketValue);

  if (weightedHoldings.length === 0) return null;

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
      <Card
        title="Mapa de concentración"
        subtitle="Qué posiciones explican la mayor parte del riesgo y del valor"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.95fr)]">
          <div className="space-y-3">
            {topHoldings.map((holding) => {
              const isSelected = activeTicker === holding.ticker;
              return (
                <button
                  key={holding.ticker}
                  type="button"
                  onClick={() => onSelectTicker(holding.ticker)}
                  className={cn(
                    "w-full rounded-2xl border border-border/70 bg-surface-muted/20 p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary/55 bg-primary/10"
                      : "hover:border-primary/35 hover:bg-surface-muted/35",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {holding.name || holding.ticker}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {holding.ticker}
                        {holding.account ? ` · ${accountLabels[holding.account]}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatPercent(holding.weight / 100)}</p>
                      <p className="text-[11px] text-muted">{formatCurrency(holding.marketValue, "EUR")}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface/80">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        holding.pnlPercent >= 0 ? "bg-emerald-400/80" : "bg-rose-400/80",
                      )}
                      style={{ width: `${Math.min(holding.weight, 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-border/70 bg-surface-muted/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Mayor peso</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {topPosition ? formatPercent(topPosition.weight / 100) : "0,00 %"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {topPosition ? `${topPosition.name || topPosition.ticker}` : "Sin posición dominante"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-muted/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Top 3</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(topThreeWeight / 100)}</p>
              <p className="mt-1 text-sm text-muted">{buildRiskLabel(topPosition?.weight ?? 0, topThreeWeight)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-muted/25 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Posiciones en verde</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(profitableRatio / 100)}</p>
              <p className="mt-1 text-sm text-muted">
                {profitableCount} de {weightedHoldings.length} posiciones abiertas en beneficio
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Exposición operativa"
        subtitle="Cómo se reparte el capital entre cuentas y dónde está el sesgo real"
      >
        <div className="space-y-4">
          {accountRows.map((row) => (
            <div key={row.account}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-text">{row.label}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatPercent(row.weight / 100)}</p>
                  <p className="text-[11px] text-muted">{formatCurrency(row.marketValue, "EUR")}</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface/80">
                <div
                  className={cn(
                    "h-full rounded-full",
                    row.account === "BROKERAGE"
                      ? "bg-sky-400/85"
                      : row.account === "ROBO_ADVISOR"
                        ? "bg-amber-400/85"
                        : "bg-slate-400/85",
                  )}
                  style={{ width: `${Math.min(row.weight, 100)}%` }}
                />
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border/70 bg-surface-muted/25 p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Lectura rápida</p>
            <p className="mt-2 text-sm leading-relaxed text-text/90">
              {topPosition && topPosition.weight >= 30
                ? `La cartera depende bastante de ${topPosition.name || topPosition.ticker}; cualquier sorpresa en esa posición dominará el comportamiento del conjunto.`
                : `El riesgo está más repartido y ninguna posición domina por sí sola el comportamiento total.`}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
