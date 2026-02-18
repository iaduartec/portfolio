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
import type { Holding } from "@/types/portfolio";

const RESIDUAL_ALLOCATION_THRESHOLD = 0.015;
const ROBOADVISOR_NAME = "Roboadvisor Revolut";
const ROBOADVISOR_ETF_SYMBOLS = new Set(["EXW1", "IS3K", "XUCD"]);

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

const extractCoreTicker = (rawTicker: string) => {
  const cleaned = (rawTicker ?? "").trim().toUpperCase();
  if (!cleaned) return "";
  const withoutExchange = cleaned.includes(":") ? cleaned.split(":", 2)[1] : cleaned;
  return withoutExchange.includes(".") ? withoutExchange.split(".", 2)[0] : withoutExchange;
};

const isRoboadvisorTicker = (ticker: string) => {
  const cleaned = (ticker ?? "").trim().toUpperCase();
  if (!cleaned) return false;
  if (cleaned.startsWith("XETR:")) return true;
  if (cleaned.endsWith(".DE")) return true;
  return ROBOADVISOR_ETF_SYMBOLS.has(extractCoreTicker(cleaned));
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
    () => holdings.filter((holding) => !isRoboadvisorTicker(holding.ticker)),
    [holdings]
  );
  const etfHoldings = useMemo(
    () => holdings.filter((holding) => isRoboadvisorTicker(holding.ticker)),
    [holdings]
  );
  const stockSummary = useMemo(() => computeSummaryFromHoldings(stockHoldings), [stockHoldings]);
  const etfSummary = useMemo(() => computeSummaryFromHoldings(etfHoldings), [etfHoldings]);
  const stockTrades = useMemo(
    () => realizedTrades.filter((trade) => !isRoboadvisorTicker(trade.ticker)),
    [realizedTrades]
  );
  const etfTransactions = useMemo(
    () => transactions.filter((tx) => isRoboadvisorTicker(tx.ticker)),
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
    const base = stockSummary.totalValue || 1;
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
  }, [stockSummary.totalValue]);

  const dividendsCollected = useMemo(() => {
    return transactions
      .filter((tx) => !isRoboadvisorTicker(tx.ticker))
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
  }, [transactions, fxRate, baseCurrency]);

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

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center text-center gap-4 py-6 md:py-10">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent/80">Gestión de Inversiones</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-text">
            {activeTab === "stocks" ? "Acciones" : "ETFs y Fondos"}
          </h1>
          <p className="max-w-2xl text-lg text-muted mx-auto leading-relaxed">
            {activeTab === "stocks"
              ? "Consulte la distribución de sus acciones, el rendimiento histórico y el detalle de sus posiciones abiertas."
              : "Vista específica del robadvisor con ETFs/fondos y su desglose de posiciones."}
          </p>
        </div>
        <div className="mt-2 inline-flex rounded-xl border border-border/70 bg-surface/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("stocks")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeTab === "stocks" ? "bg-primary text-background" : "text-muted hover:text-text"
            )}
          >
            Acciones
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("etf")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              activeTab === "etf" ? "bg-primary text-background" : "text-muted hover:text-text"
            )}
          >
            ETFs/Fondos
          </button>
        </div>
      </div>

      {activeTab === "stocks" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="flex flex-col items-center justify-center py-8 bg-accent/5 border-accent/10">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Valor de Cartera</p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(convertCurrency(stockSummary.totalValue, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className="flex flex-col items-center justify-center py-8">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Diario</p>
              <p className={cn("text-3xl font-bold", stockSummary.dailyPnl >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(convertCurrency(stockSummary.dailyPnl, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className="flex flex-col items-center justify-center py-8">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Total</p>
              <p className={cn("text-3xl font-bold", stockSummary.totalPnl >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(convertCurrency(stockSummary.totalPnl, currency, fxRate, baseCurrency), currency)}
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
                <RealizedTradesTable trades={stockTrades} />
              </Card>
              <Card title="Dividendos cobrados" subtitle="Total acumulado de dividendos">
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(convertCurrency(dividendsCollected, currency, fxRate, baseCurrency), currency)}
                </p>
              </Card>
            </div>
          </div>

          <Card title="Participaciones" subtitle="Solo posiciones abiertas">
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
            <Card className="flex flex-col items-center justify-center py-8 bg-accent/5 border-accent/10">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Valor {ROBOADVISOR_NAME}</p>
              <p className="text-3xl font-bold text-text">
                {formatCurrency(convertCurrency(etfSummary.totalValue, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className="flex flex-col items-center justify-center py-8">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">P&L Total</p>
              <p className={cn("text-3xl font-bold", etfSummary.totalPnl >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(convertCurrency(etfSummary.totalPnl, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
            <Card className="flex flex-col items-center justify-center py-8">
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Dividendos ETFs/Fondos</p>
              <p className="text-3xl font-bold text-success">
                {formatCurrency(convertCurrency(etfDividendsCollected, currency, fxRate, baseCurrency), currency)}
              </p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <Card title={`${ROBOADVISOR_NAME} · Desglose`} subtitle="Distribución por ETF/Fondo">
              {etfAllocation.length ? (
                <div className="space-y-3">
                  {etfAllocation.map((holding, index) => (
                    <div key={holding.ticker} className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-text">{holding.name || holding.ticker}</span>
                        <span className="text-muted">{formatPercent(holding.percent)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(2, holding.percent * 100)}%`,
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
            <div className="flex flex-col gap-6">
              <Card title="Movimientos del Roboadvisor" subtitle="Actividad detectada en tus CSV">
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
              <Card title="Participaciones ETFs/Fondos" subtitle={`Posiciones abiertas en ${ROBOADVISOR_NAME}`}>
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
