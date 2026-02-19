"use client";

import { useEffect, useMemo, useState } from "react";
import { AllocationChart, ALLOCATION_COLORS } from "@/components/charts/AllocationChart";
import { PortfolioPerformanceChart } from "@/components/charts/PortfolioPerformanceChart";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import {
  formatPercent,
  formatCurrency,
  convertCurrency,
  convertCurrencyFrom,
  inferCurrencyFromTicker,
  type CurrencyCode,
} from "@/lib/formatters";
import { AIChat } from "@/components/ai/AIChat";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { cn } from "@/lib/utils";
import { isFundTicker } from "@/lib/portfolioGroups";
import type { Holding } from "@/types/portfolio";
import type { Transaction } from "@/types/transactions";

const RESIDUAL_ALLOCATION_THRESHOLD = 0.015;
const ROBOADVISOR_NAME = "Roboadvisor Revolut";
const METRIC_CARD_CLASS =
  "flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-gradient-to-b from-surface-muted/55 to-surface/85 py-8 shadow-panel backdrop-blur-xl";

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

type PortfolioTab = "stocks" | "etf";
type PerformancePoint = { label: string; value: number };

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const toTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!isoDate) return null;
  const [, year, month, day] = isoDate;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

const getMonthStart = (timestamp: number) => {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

const getNextMonthStart = (monthStart: number) => {
  const date = new Date(monthStart);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
};

const getMonthEnd = (monthStart: number) => getNextMonthStart(monthStart) - 1;

const formatMonthLabel = (monthStart: number, includeYear: boolean) => {
  const date = new Date(monthStart);
  const month = MONTH_LABELS[date.getUTCMonth()];
  if (!includeYear) return month;
  return `${month} ${String(date.getUTCFullYear()).slice(-2)}`;
};

const buildPerformanceSeries = (
  transactions: Transaction[],
  fxRate: number,
  baseCurrency: CurrencyCode,
  latestValue: number
): PerformancePoint[] => {
  const ordered = transactions
    .filter((tx) => tx.ticker && (tx.type === "BUY" || tx.type === "SELL"))
    .map((tx) => {
      const timestamp = toTimestamp(tx.date);
      if (!Number.isFinite(timestamp)) return null;
      return { tx, timestamp: timestamp as number };
    })
    .filter((entry): entry is { tx: Transaction; timestamp: number } => entry !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (ordered.length === 0) {
    const fallback = Number.isFinite(latestValue) && latestValue > 0 ? Number(latestValue.toFixed(2)) : 0;
    return fallback > 0 ? [{ label: formatMonthLabel(getMonthStart(Date.now()), false), value: fallback }] : [];
  }

  const startMonth = getMonthStart(ordered[0].timestamp);
  const lastMonth = getMonthStart(ordered[ordered.length - 1].timestamp);
  const nowMonth = getMonthStart(Date.now());
  const endMonth = Math.max(lastMonth, nowMonth);
  const includeYear = new Date(startMonth).getUTCFullYear() !== new Date(endMonth).getUTCFullYear();

  const positions = new Map<string, { quantity: number; lastPrice: number }>();
  const points: PerformancePoint[] = [];
  let txIndex = 0;

  for (let month = startMonth; month <= endMonth; month = getNextMonthStart(month)) {
    const monthEnd = getMonthEnd(month);
    while (txIndex < ordered.length && ordered[txIndex].timestamp <= monthEnd) {
      const { tx } = ordered[txIndex];
      const entry = positions.get(tx.ticker) ?? { quantity: 0, lastPrice: 0 };
      const currency = tx.currency ?? inferCurrencyFromTicker(tx.ticker);
      if (Number.isFinite(tx.price) && tx.price > 0) {
        entry.lastPrice = convertCurrencyFrom(tx.price, currency, baseCurrency, fxRate, baseCurrency);
      }
      const quantity = Number.isFinite(tx.quantity) ? Math.abs(tx.quantity) : 0;
      if (tx.type === "BUY") {
        entry.quantity += quantity;
      } else if (tx.type === "SELL") {
        entry.quantity = Math.max(0, entry.quantity - quantity);
      }
      positions.set(tx.ticker, entry);
      txIndex += 1;
    }

    const value = Array.from(positions.values()).reduce((sum, position) => {
      if (position.quantity <= 0 || position.lastPrice <= 0) return sum;
      return sum + position.quantity * position.lastPrice;
    }, 0);

    points.push({
      label: formatMonthLabel(month, includeYear),
      value: Number(value.toFixed(2)),
    });
  }

  if (points.length > 0 && Number.isFinite(latestValue) && latestValue > 0) {
    points[points.length - 1] = {
      ...points[points.length - 1],
      value: Number(latestValue.toFixed(2)),
    };
  }

  return points;
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

const computeSummaryFromHoldings = (subset: Holding[]) => {
  const totalValue = subset.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalPnl = subset.reduce((sum, holding) => sum + holding.pnlValue, 0);
  const dailyPnl = subset.reduce((sum, holding) => sum + (holding.dayChange ?? 0), 0);
  return { totalValue, totalPnl, dailyPnl };
};

export function PortfolioClient() {
  const { holdings, realizedTrades, transactions } = usePortfolioData();
  const { currency, baseCurrency, fxRate } = useCurrency();
  const [sectorByTicker, setSectorByTicker] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<PortfolioTab>("stocks");

  const stockHoldings = useMemo(
    () => holdings.filter((holding) => !isFundTicker(holding.ticker)),
    [holdings]
  );
  const etfHoldings = useMemo(
    () => holdings.filter((holding) => isFundTicker(holding.ticker)),
    [holdings]
  );
  const stockSummary = useMemo(() => computeSummaryFromHoldings(stockHoldings), [stockHoldings]);
  const etfSummary = useMemo(() => computeSummaryFromHoldings(etfHoldings), [etfHoldings]);
  const stockTrades = useMemo(
    () => realizedTrades.filter((trade) => !isFundTicker(trade.ticker)),
    [realizedTrades]
  );
  const stockTransactions = useMemo(
    () => transactions.filter((tx) => !isFundTicker(tx.ticker)),
    [transactions]
  );
  const etfTransactions = useMemo(
    () => transactions.filter((tx) => isFundTicker(tx.ticker)),
    [transactions]
  );

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
      const items = stockHoldings
        .map((holding) => ({
          key: holding.ticker,
          label: holding.ticker,
          displayLabel: holding.name || holding.ticker,
          value: holding.marketValue,
          percent: stockSummary.totalValue > 0 ? holding.marketValue / stockSummary.totalValue : 0,
        }))
        .sort((a, b) => b.value - a.value);
      return groupResidualAllocation(items);
    },
    [stockHoldings, stockSummary.totalValue]
  );

  const sectorAllocation = useMemo(
    () => {
      const sectorTotals = stockHoldings.reduce(
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
          percent: stockSummary.totalValue > 0 ? value / stockSummary.totalValue : 0,
        }))
        .sort((a, b) => b.value - a.value);
      return groupResidualAllocation(items);
    },
    [stockHoldings, stockSummary.totalValue, sectorByTicker]
  );
  const performanceSeries = useMemo(() => {
    return buildPerformanceSeries(stockTransactions, fxRate, baseCurrency, stockSummary.totalValue);
  }, [stockTransactions, fxRate, baseCurrency, stockSummary.totalValue]);

  const dividendsCollected = useMemo(() => {
    return stockTransactions
      .filter((tx) => tx.type === "DIVIDEND")
      .reduce((sum, tx) => {
        const txCurrency = tx.currency ?? baseCurrency;
        const hasQty = Number.isFinite(tx.quantity) && tx.quantity !== 0;
        const hasPrice = Number.isFinite(tx.price) && tx.price !== 0;
        const gross = hasQty && hasPrice
          ? tx.quantity * tx.price
          : hasPrice
            ? tx.price
            : hasQty
              ? tx.quantity
              : 0;
        const net = gross - (tx.fee ?? 0);
        const amount = convertCurrencyFrom(net, txCurrency, baseCurrency, fxRate, baseCurrency);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
  }, [stockTransactions, fxRate, baseCurrency]);

  const etfDividendsCollected = useMemo(() => {
    return etfTransactions
      .filter((tx) => tx.type === "DIVIDEND")
      .reduce((sum, tx) => {
        const txCurrency = tx.currency ?? baseCurrency;
        const hasQty = Number.isFinite(tx.quantity) && tx.quantity !== 0;
        const hasPrice = Number.isFinite(tx.price) && tx.price !== 0;
        const gross = hasQty && hasPrice
          ? tx.quantity * tx.price
          : hasPrice
            ? tx.price
            : hasQty
              ? tx.quantity
              : 0;
        const net = gross - (tx.fee ?? 0);
        const amount = convertCurrencyFrom(net, txCurrency, baseCurrency, fxRate, baseCurrency);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
  }, [etfTransactions, fxRate, baseCurrency]);

  const etfTxStats = useMemo(() => {
    return etfTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "BUY") acc.buy += 1;
        if (tx.type === "SELL") acc.sell += 1;
        if (tx.type === "DIVIDEND") acc.dividend += 1;
        return acc;
      },
      { buy: 0, sell: 0, dividend: 0 }
    );
  }, [etfTransactions]);

  const etfAllocation = useMemo(
    () =>
      [...etfHoldings]
        .sort((a, b) => b.marketValue - a.marketValue)
        .map((holding) => ({
          ...holding,
          percent: etfSummary.totalValue > 0 ? holding.marketValue / etfSummary.totalValue : 0,
        })),
    [etfHoldings, etfSummary.totalValue]
  );
  const maxEtfPercent = useMemo(
    () => etfAllocation.reduce((max, holding) => Math.max(max, holding.percent), 0),
    [etfAllocation]
  );

  return (
    <div className="relative flex flex-col gap-10">
      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[360px] rounded-[40px] bg-[radial-gradient(circle_at_top,rgba(62,199,255,0.22),rgba(7,11,20,0)_66%)]" />
      <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(22,34,57,0.82),rgba(10,16,28,0.9))] px-5 py-8 shadow-panel backdrop-blur-xl md:px-10 md:py-12">
        <div className="absolute -top-20 right-[-72px] h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 left-[-72px] h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">Gestión de inversiones</p>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text md:text-6xl">
            {activeTab === "stocks" ? "Acciones" : "ETFs y Fondos"}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            {activeTab === "stocks"
              ? "Consulte la distribución de sus acciones, el rendimiento histórico y el detalle de sus posiciones abiertas."
              : "Vista específica del robadvisor con ETFs/fondos y su desglose de posiciones."}
          </p>
          <div className="mt-1 inline-flex rounded-xl border border-border/70 bg-background/45 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("stocks")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                activeTab === "stocks"
                  ? "bg-primary text-background shadow-[0_0_20px_rgba(62,199,255,0.32)]"
                  : "text-muted hover:text-text"
              )}
            >
              Acciones
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("etf")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                activeTab === "etf"
                  ? "bg-primary text-background shadow-[0_0_20px_rgba(62,199,255,0.32)]"
                  : "text-muted hover:text-text"
              )}
            >
              ETFs/Fondos
            </button>
          </div>
        </div>
      </section>

      {activeTab === "stocks" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={cn(METRIC_CARD_CLASS, "border-primary/20 from-primary/10 to-surface/90")}>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Valor de Cartera</p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(convertCurrency(stockSummary.totalValue, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className={METRIC_CARD_CLASS}>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Diario</p>
              <p className={cn("text-3xl font-bold", stockSummary.dailyPnl >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(convertCurrency(stockSummary.dailyPnl, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className={METRIC_CARD_CLASS}>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Total</p>
              <p className={cn("text-3xl font-bold", stockSummary.totalPnl >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(convertCurrency(stockSummary.totalPnl, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
          </div>

          <Card
            className="border-primary/20 bg-gradient-to-b from-surface-muted/45 to-surface/90"
            title="Rendimiento de la cartera"
            subtitle="Evolución mensual estimada por operaciones y valoración actual"
          >
            <PortfolioPerformanceChart data={performanceSeries} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <Card
              className="bg-gradient-to-b from-surface-muted/38 to-surface/92"
              title="Distribucion"
              subtitle="Peso por activo (residuales agrupados en Otros)"
            >
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
              <Card
                className="bg-gradient-to-b from-surface-muted/30 to-surface/92"
                title="Ventas cerradas"
                subtitle="Entradas, salidas y P&amp;L realizado"
              >
                <RealizedTradesTable trades={stockTrades} />
              </Card>
              <Card
                className="border-success/25 bg-gradient-to-b from-success/10 to-surface/90"
                title="Dividendos cobrados"
                subtitle="Total acumulado de dividendos"
              >
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(convertCurrency(dividendsCollected, currency, fxRate, baseCurrency), currency)}
                </p>
              </Card>
            </div>
          </div>

          <Card
            className="bg-gradient-to-b from-surface-muted/30 to-surface/92"
            title="Participaciones"
            subtitle="Solo posiciones abiertas"
          >
            {stockHoldings.length ? (
              <HoldingsTable holdings={stockHoldings} />
            ) : (
              <p className="text-sm text-muted">No hay posiciones abiertas todavia.</p>
            )}
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={cn(METRIC_CARD_CLASS, "border-primary/20 from-primary/10 to-surface/90")}>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Valor {ROBOADVISOR_NAME}</p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(convertCurrency(etfSummary.totalValue, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className={METRIC_CARD_CLASS}>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Total</p>
              <p className={cn("text-3xl font-bold", etfSummary.totalPnl >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(convertCurrency(etfSummary.totalPnl, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className={cn(METRIC_CARD_CLASS, "border-success/25 from-success/10 to-surface/90")}>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Dividendos ETFs/Fondos</p>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(convertCurrency(etfDividendsCollected, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card
              className="bg-gradient-to-b from-surface-muted/38 to-surface/92"
              title={`${ROBOADVISOR_NAME} · Desglose`}
              subtitle="Peso por ETF/Fondo (barra relativa, % real a la derecha)"
            >
              {etfAllocation.length ? (
                <div className="space-y-3">
                  {etfAllocation.map((holding, index) => (
                    <div
                      key={holding.ticker}
                      className="rounded-xl border border-border/60 bg-surface-muted/35 p-3.5 shadow-[0_14px_32px_rgba(2,8,20,0.34)]"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-text">{holding.name || holding.ticker}</span>
                        <span className="text-muted">{formatPercent(holding.percent)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(
                              4,
                              maxEtfPercent > 0 ? (holding.percent / maxEtfPercent) * 100 : 0
                            )}%`,
                            backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>{holding.totalQuantity.toFixed(4)} participaciones</span>
                        <span>{formatCurrency(convertCurrency(holding.marketValue, currency, fxRate, baseCurrency), currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No hay posiciones de ETFs/fondos en el robadvisor.</p>
              )}
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                className="bg-gradient-to-b from-surface-muted/30 to-surface/92"
                title="Movimientos del Roboadvisor"
                subtitle="Actividad detectada en tus CSV"
              >
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted">Compras</p>
                    <p className="mt-1 text-2xl font-bold text-text">{etfTxStats.buy}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted">Ventas</p>
                    <p className="mt-1 text-2xl font-bold text-text">{etfTxStats.sell}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-muted">Dividendos</p>
                    <p className="mt-1 text-2xl font-bold text-text">{etfTxStats.dividend}</p>
                  </div>
                </div>
              </Card>
              <Card
                className="bg-gradient-to-b from-surface-muted/30 to-surface/92"
                title="Participaciones ETFs/Fondos"
                subtitle={`Posiciones abiertas en ${ROBOADVISOR_NAME}`}
              >
                {etfHoldings.length ? (
                  <HoldingsTable holdings={etfHoldings} />
                ) : (
                  <p className="text-sm text-muted">No hay participaciones abiertas en ETFs/fondos.</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
      <AIChat />
    </div>
  );
}
