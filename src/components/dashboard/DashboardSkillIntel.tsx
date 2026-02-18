"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Radar, CandlestickChart, Activity, ArrowRight, RefreshCw, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Quote = {
  ticker: string;
  name?: string;
  price: number;
  dayChangePercent?: number;
};

type InsiderTrade = {
  filingDate: string;
  tradeDate: string;
  ticker: string;
  tradeType: string;
  value?: number;
};

type PolymarketMarket = {
  id: string;
  question: string;
  endDate?: string;
  volume24hr?: number;
  yesPrice?: number;
};

type InsiderResponse = {
  byTicker?: Record<string, InsiderTrade[]>;
};

type DashboardSkillIntelProps = {
  portfolioTickers?: string[];
};

const WATCHLIST = ["SPY", "NVDA", "BTC-USD"];
const formatCompact = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const normalizeInsiderTicker = (ticker: string) =>
  ticker
    .trim()
    .toUpperCase()
    .replace(/^[A-Z]+:/, "")
    .split(".")[0]
    .replace(/[^A-Z0-9-]/g, "");

const changeTone = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return "default";
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "warning";
};

export function DashboardSkillIntel({ portfolioTickers = [] }: DashboardSkillIntelProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [insiderByTicker, setInsiderByTicker] = useState<Record<string, InsiderTrade[]>>({});
  const [selectedInsiderTicker, setSelectedInsiderTicker] = useState("NVDA");
  const [customTickerInput, setCustomTickerInput] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [polyMarkets, setPolyMarkets] = useState<PolymarketMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsider, setLoadingInsider] = useState(true);

  const insiderTickers = useMemo(() => {
    const merged = Array.from(
      new Set([
        ...portfolioTickers.map(normalizeInsiderTicker),
        ...customTickers.map(normalizeInsiderTicker),
      ].filter((ticker) => /^[A-Z][A-Z0-9-]{0,14}$/.test(ticker)))
    ).slice(0, 8);
    return merged.length > 0 ? merged : ["NVDA"];
  }, [portfolioTickers, customTickers]);

  useEffect(() => {
    if (!insiderTickers.includes(selectedInsiderTicker)) {
      setSelectedInsiderTicker(insiderTickers[0]);
    }
  }, [insiderTickers, selectedInsiderTicker]);

  useEffect(() => {
    let cancelled = false;

    const loadBaseData = async () => {
      setLoading(true);
      try {
        const [quotesRes, polyRes] = await Promise.all([
          fetch(`/api/quotes?tickers=${WATCHLIST.join(",")}`, { cache: "no-store" }),
          fetch("/api/polymarket?limit=3", { cache: "no-store" }),
        ]);
        const quotesData = (await quotesRes.json()) as { quotes?: Quote[] };
        const polyData = (await polyRes.json()) as { markets?: PolymarketMarket[] };
        if (!cancelled) {
          setQuotes(Array.isArray(quotesData.quotes) ? quotesData.quotes : []);
          setPolyMarkets(Array.isArray(polyData.markets) ? polyData.markets : []);
        }
      } catch {
        if (!cancelled) {
          setQuotes([]);
          setPolyMarkets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBaseData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInsider = async () => {
      setLoadingInsider(true);
      try {
        const res = await fetch(
          `/api/insider?tickers=${encodeURIComponent(insiderTickers.join(","))}&limit=3`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as InsiderResponse;
        if (!cancelled) {
          setInsiderByTicker(data.byTicker ?? {});
        }
      } catch {
        if (!cancelled) {
          setInsiderByTicker({});
        }
      } finally {
        if (!cancelled) {
          setLoadingInsider(false);
        }
      }
    };

    void loadInsider();
    return () => {
      cancelled = true;
    };
  }, [insiderTickers]);

  const quoteMap = useMemo(
    () => new Map(quotes.map((quote) => [quote.ticker.toUpperCase(), quote])),
    [quotes]
  );

  const selectedInsiderTrades = insiderByTicker[selectedInsiderTicker] ?? [];

  const addCustomTicker = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeInsiderTicker(customTickerInput);
    if (!/^[A-Z][A-Z0-9-]{0,14}$/.test(normalized)) return;
    setCustomTickers((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setSelectedInsiderTicker(normalized);
    setCustomTickerInput("");
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/70 p-6 shadow-panel backdrop-blur-xl md:p-8">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/10 blur-2xl" />

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Skill Intelligence Layer</p>
            <h2 className="section-title mt-2 text-2xl font-semibold text-white">
              Senales accionables con tus nuevas skills
            </h2>
          </div>
          <Badge className="bg-surface-muted/60">
            <RefreshCw className="h-3.5 w-3.5" />
            {loading || loadingInsider ? "Actualizando fuentes" : "Datos listos"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="border-primary/30 bg-gradient-to-b from-primary/10 to-surface/60"
            title={
              <span className="inline-flex items-center gap-2">
                <CandlestickChart className="h-4 w-4 text-primary" />
                Yahoo Finance Pulse
              </span>
            }
            subtitle="Cotizaciones en vivo para priorizar contexto de mercado"
          >
            <div className="space-y-2">
              {WATCHLIST.map((ticker) => {
                const quote = quoteMap.get(ticker);
                return (
                  <div key={ticker} className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2">
                    <span className="text-sm font-medium text-text">{ticker}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">
                        {quote ? formatCurrency(quote.price, "USD") : "--"}
                      </div>
                      <Badge tone={changeTone(quote?.dayChangePercent)} className="mt-1">
                        {quote?.dayChangePercent !== undefined
                          ? `${quote.dayChangePercent >= 0 ? "+" : ""}${quote.dayChangePercent.toFixed(2)}%`
                          : "Sin cambio"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            className="border-accent/30 bg-gradient-to-b from-accent/10 to-surface/60"
            title={
              <span className="inline-flex items-center gap-2">
                <Radar className="h-4 w-4 text-accent" />
                OpenInsider Radar
              </span>
            }
            subtitle="Movimientos insider en cartera y tickers bajo analisis"
          >
            <div className="mb-3 flex flex-wrap gap-2">
              {insiderTickers.map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setSelectedInsiderTicker(ticker)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedInsiderTicker === ticker
                      ? "border-accent/70 bg-accent/20 text-white"
                      : "border-border/80 bg-surface-muted/30 text-muted hover:text-text"
                  }`}
                >
                  {ticker}
                </button>
              ))}
            </div>

            <form onSubmit={addCustomTicker} className="mb-3 flex gap-2">
              <input
                value={customTickerInput}
                onChange={(event) => setCustomTickerInput(event.target.value)}
                placeholder="Ticker a analizar (ej. TSLA)"
                className="h-9 w-full rounded-lg border border-border/80 bg-surface-muted/30 px-3 text-xs text-text outline-none focus:border-accent/60"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border/80 bg-surface-muted/40 px-3 text-xs text-text hover:border-accent/50"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </form>

            <div className="space-y-2">
              {selectedInsiderTrades.length === 0 ? (
                <p className="text-sm text-muted">Sin datos insider para {selectedInsiderTicker}.</p>
              ) : (
                selectedInsiderTrades.map((trade, idx) => (
                  <div
                    key={`${trade.ticker}-${trade.filingDate}-${idx}`}
                    className="rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{trade.ticker}</span>
                      <Badge tone={trade.tradeType.toLowerCase().startsWith("p") ? "success" : "warning"}>
                        {trade.tradeType}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Filing: {trade.filingDate.slice(0, 10)} · Valor:{" "}
                      {trade.value !== undefined ? formatCurrency(Math.abs(trade.value), "USD") : "N/D"}
                    </p>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/ai-agents"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-opacity hover:opacity-80"
            >
              Ejecutar flujo insider
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          <Card
            className="border-emerald-400/25 bg-gradient-to-b from-emerald-400/10 to-surface/60"
            title={
              <span className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-300" />
                Polymarket Watch
              </span>
            }
            subtitle="Conecta probabilidad de mercado con eventos macro"
          >
            <div className="space-y-2">
              {polyMarkets.length === 0 ? (
                <p className="text-sm text-muted">Sin mercados activos cargados.</p>
              ) : (
                polyMarkets.map((market) => (
                  <div key={market.id} className="rounded-xl border border-border/80 bg-surface-muted/30 px-3 py-2">
                    <p className="line-clamp-2 text-sm text-text">{market.question}</p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>Yes: {market.yesPrice !== undefined ? `${(market.yesPrice * 100).toFixed(1)}%` : "N/D"}</span>
                      <span>Vol 24h: {market.volume24hr !== undefined ? `$${formatCompact.format(market.volume24hr)}` : "N/D"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/lab"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition-opacity hover:opacity-80"
            >
              Abrir laboratorio de escenarios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}
