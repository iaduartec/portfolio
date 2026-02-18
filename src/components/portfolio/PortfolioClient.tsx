"use client";

import { useEffect, useMemo, useState } from "react";
import { AllocationChart, ALLOCATION_COLORS } from "@/components/charts/AllocationChart";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioPerformanceChart";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { formatPercent, formatCurrency, convertCurrency, convertCurrencyFrom } from "@/lib/formatters";
import { AIChat } from "@/components/ai/AIChat";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { cn } from "@/lib/utils";

const RESIDUAL_ALLOCATION_THRESHOLD = 0.015;

type SectorPoint = {
  ticker: string;
  sector?: string;
};

type AllocationItem = {
  key: string;
  label: string;
  displayLabel: string;
  value: number;
  percent: number;
};

const groupResidualAllocation = (items: AllocationItem[]) => {
  const major = items.filter((item) => item.percent >= RESIDUAL_ALLOCATION_THRESHOLD);
  const residual = items.filter((item) => item.percent < RESIDUAL_ALLOCATION_THRESHOLD);

  if (residual.length === 0) return items;

  const residualValue = residual.reduce((sum, item) => sum + item.value, 0);
  const residualPercent = residual.reduce((sum, item) => sum + item.percent, 0);

  return [
    ...major,
    {
      key: "OTHERS",
      label: "Otros",
      displayLabel: "Otros",
      value: residualValue,
      percent: residualPercent,
    },
  ];
};

export function PortfolioClient() {
  const { holdings, realizedTrades, summary, transactions } = usePortfolioData();
  const { currency, baseCurrency, fxRate } = useCurrency();
  const [sectorByTicker, setSectorByTicker] = useState<Record<string, string>>({});

  useEffect(() => {
    const tickers = holdings.map((holding) => holding.ticker).filter(Boolean);
    if (tickers.length === 0) return;

    const controller = new AbortController();
    fetch(`/api/fundamentals?tickers=${encodeURIComponent(tickers.join(","))}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((payload) => {
        const data = Array.isArray(payload?.data) ? (payload.data as SectorPoint[]) : [];
        const next: Record<string, string> = {};
        data.forEach((item) => {
          if (item?.ticker && item?.sector) {
            next[item.ticker] = item.sector;
          }
        });
        setSectorByTicker(next);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [holdings]);

  const assetAllocation = useMemo(
    () => {
      const items = holdings
        .map((holding) => ({
          key: holding.ticker,
          label: holding.ticker,
          displayLabel: holding.name || holding.ticker,
          value: holding.marketValue,
          percent: summary.totalValue > 0 ? holding.marketValue / summary.totalValue : 0,
        }))
        .sort((a, b) => b.value - a.value);
      return groupResidualAllocation(items);
    },
    [holdings, summary.totalValue]
  );

  const sectorAllocation = useMemo(
    () => {
      const sectorTotals = holdings.reduce(
        (acc, holding) => {
          const sector = sectorByTicker[holding.ticker] || "Sin sector";
          acc[sector] = (acc[sector] ?? 0) + holding.marketValue;
          return acc;
        },
        {} as Record<string, number>
      );

      const items = Object.entries(sectorTotals)
        .map(([sector, value]) => ({
          key: sector,
          label: sector,
          displayLabel: sector,
          value,
          percent: summary.totalValue > 0 ? value / summary.totalValue : 0,
        }))
        .sort((a, b) => b.value - a.value);
      return groupResidualAllocation(items);
    },
    [holdings, summary.totalValue, sectorByTicker]
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

  const dividendsCollected = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "DIVIDEND")
      .reduce((sum, tx) => {
        const txCurrency = tx.currency ?? baseCurrency;
        const gross = tx.quantity !== 0 ? tx.quantity * tx.price : tx.price;
        const net = gross - (tx.fee ?? 0);
        const amount = convertCurrencyFrom(net, txCurrency, baseCurrency, fxRate, baseCurrency);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
  }, [transactions, fxRate, baseCurrency]);

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
        <Card title="Distribucion" subtitle="Peso por activo (residuales agrupados en Otros)">
          {assetAllocation.length > 0 ? (
            <>
              <AllocationChart data={assetAllocation} />
              <div className="mt-3 grid gap-1.5 text-xs">
                {assetAllocation.map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-text" title={item.displayLabel}>
                          {item.displayLabel}
                        </span>
                        {item.displayLabel !== item.label ? (
                          <span className="truncate text-[11px] text-muted" title={item.label}>
                            {item.label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-muted">{formatPercent(item.percent)}</span>
                  </div>
                ))}
              </div>
              {sectorAllocation.length > 0 ? (
                <div className="mt-5 border-t border-border/60 pt-4">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                    Agrupado por sector
                  </p>
                  <div className="grid gap-1.5 text-xs">
                    {sectorAllocation.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-2">
                        <span className="truncate text-text" title={item.label}>
                          {item.label}
                        </span>
                        <span className="text-muted">{formatPercent(item.percent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Sin allocation todavia.</p>
          )}
        </Card>
        <div className="flex flex-col gap-6">
          <Card title="Ventas cerradas" subtitle="Entradas, salidas y P&amp;L realizado">
            <RealizedTradesTable trades={realizedTrades} />
          </Card>
          <Card title="Dividendos cobrados" subtitle="Total acumulado de dividendos">
            <p className="text-3xl font-bold text-success">
              {formatCurrency(convertCurrency(dividendsCollected, currency, fxRate, baseCurrency), currency)}
            </p>
          </Card>
        </div>
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
