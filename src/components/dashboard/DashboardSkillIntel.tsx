"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Radar, CandlestickChart, ArrowRight, RefreshCw, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Quote = {
  symbol: string;
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

type InsiderSummary = {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
};

type YahooFundamentals = {
  trailingPE?: number;
  priceToBook?: number;
  priceToSalesTtm?: number;
};

type YahooRatings = {
  recommendationMean?: number;
  recommendationKey?: string;
};

type YahooDividends = {
  dividendYield?: number;
};

type InsiderResponse = {
  byTicker?: Record<string, InsiderTrade[]>;
  summaryByTicker?: Record<string, InsiderSummary>;
};

type DashboardSkillIntelProps = {
  portfolioTickers?: string[];
};

const WATCHLIST = ["SPY", "NVDA", "BTC-USD"];
const SIGNAL_MIN = -3;
const SIGNAL_MAX = 3;

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function DashboardSkillIntel({ portfolioTickers = [] }: DashboardSkillIntelProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [insiderByTicker, setInsiderByTicker] = useState<Record<string, InsiderTrade[]>>({});
  const [insiderSummaryByTicker, setInsiderSummaryByTicker] = useState<Record<string, InsiderSummary>>(
    {}
  );
  const [selectedInsiderTicker, setSelectedInsiderTicker] = useState("NVDA");
  const [insiderWindowDays, setInsiderWindowDays] = useState<7 | 30 | 90>(30);
  const [customTickerInput, setCustomTickerInput] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [yahooFundamentals, setYahooFundamentals] = useState<YahooFundamentals | null>(null);
  const [yahooRatings, setYahooRatings] = useState<YahooRatings | null>(null);
  const [yahooDividends, setYahooDividends] = useState<YahooDividends | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsider, setLoadingInsider] = useState(true);
  const [loadingFocus, setLoadingFocus] = useState(true);

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
        const quotesRes = await fetch(`/api/yahoo?action=price&symbols=${WATCHLIST.join(",")}`, {
          cache: "no-store",
        });
        const quotesData = (await quotesRes.json()) as { data?: Quote[] };
        if (!cancelled) {
          setQuotes(Array.isArray(quotesData.data) ? quotesData.data : []);
        }
      } catch {
        if (!cancelled) {
          setQuotes([]);
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
          `/api/insider?tickers=${encodeURIComponent(insiderTickers.join(","))}&limit=3&fd=${insiderWindowDays}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as InsiderResponse;
        if (!cancelled) {
          setInsiderByTicker(data.byTicker ?? {});
          setInsiderSummaryByTicker(data.summaryByTicker ?? {});
        }
      } catch {
        if (!cancelled) {
          setInsiderByTicker({});
          setInsiderSummaryByTicker({});
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
  }, [insiderTickers, insiderWindowDays]);

  useEffect(() => {
    let cancelled = false;

    const loadFocusData = async () => {
      setLoadingFocus(true);
      try {
        const [fundRes, ratingsRes, divRes] = await Promise.all([
          fetch(`/api/yahoo?action=fundamentals&symbol=${encodeURIComponent(selectedInsiderTicker)}`, {
            cache: "no-store",
          }),
          fetch(`/api/yahoo?action=ratings&symbol=${encodeURIComponent(selectedInsiderTicker)}`, {
            cache: "no-store",
          }),
          fetch(`/api/yahoo?action=dividends&symbol=${encodeURIComponent(selectedInsiderTicker)}`, {
            cache: "no-store",
          }),
        ]);
        const fundJson = (await fundRes.json()) as { data?: YahooFundamentals | null };
        const ratingsJson = (await ratingsRes.json()) as { data?: YahooRatings | null };
        const divJson = (await divRes.json()) as { data?: YahooDividends | null };

        if (!cancelled) {
          setYahooFundamentals(fundJson.data ?? null);
          setYahooRatings(ratingsJson.data ?? null);
          setYahooDividends(divJson.data ?? null);
        }
      } catch {
        if (!cancelled) {
          setYahooFundamentals(null);
          setYahooRatings(null);
          setYahooDividends(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingFocus(false);
        }
      }
    };

    void loadFocusData();
    return () => {
      cancelled = true;
    };
  }, [selectedInsiderTicker]);

  const quoteMap = useMemo(
    () => new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote])),
    [quotes]
  );

  const selectedInsiderTrades = useMemo(
    () => insiderByTicker[selectedInsiderTicker] ?? [],
    [insiderByTicker, selectedInsiderTicker]
  );
  const selectedInsiderSummary = useMemo(
    () =>
      insiderSummaryByTicker[selectedInsiderTicker] ?? {
        totalTrades: selectedInsiderTrades.length,
        buyCount: selectedInsiderTrades.filter((trade) => trade.tradeType.toLowerCase().startsWith("p")).length,
        sellCount: selectedInsiderTrades.filter((trade) => trade.tradeType.toLowerCase().startsWith("s")).length,
        buyValue: 0,
        sellValue: 0,
        netValue: 0,
      },
    [insiderSummaryByTicker, selectedInsiderTicker, selectedInsiderTrades]
  );

  const signal = useMemo(() => {
    let score = 0;

    const buys = selectedInsiderSummary.buyCount;
    const sells = selectedInsiderSummary.sellCount;
    if (buys > sells) score += 1;
    if (sells > buys) score -= 1;

    const recMean = yahooRatings?.recommendationMean;
    const recKey = (yahooRatings?.recommendationKey ?? "").toLowerCase();
    if (
      (recMean !== undefined && recMean <= 2.2) ||
      recKey.includes("buy") ||
      recKey.includes("strong_buy")
    ) {
      score += 1;
    } else if (
      (recMean !== undefined && recMean >= 3.2) ||
      recKey.includes("sell") ||
      recKey.includes("underperform")
    ) {
      score -= 1;
    }

    const pe = yahooFundamentals?.trailingPE;
    const pb = yahooFundamentals?.priceToBook;
    if (
      (pe !== undefined && pe > 45) ||
      (pb !== undefined && pb > 10)
    ) {
      score -= 1;
    } else if (
      (pe !== undefined && pe > 0 && pe < 18) ||
      (pb !== undefined && pb > 0 && pb < 3)
    ) {
      score += 1;
    }

    if (score >= 2) {
      return { label: "Alcista", tone: "success" as const, score };
    }
    if (score <= -2) {
      return { label: "Bajista", tone: "danger" as const, score };
    }
    return { label: "Neutral", tone: "warning" as const, score };
  }, [selectedInsiderSummary, yahooRatings, yahooFundamentals]);

  const predictionMeter = useMemo(() => {
    const clampedScore = clamp(signal.score, SIGNAL_MIN, SIGNAL_MAX);
    const meterPercent = ((clampedScore - SIGNAL_MIN) / (SIGNAL_MAX - SIGNAL_MIN)) * 100;

    if (clampedScore >= 2) {
      return {
        action: "BUY" as const,
        tone: "success" as const,
        confidence: Math.round((Math.abs(clampedScore) / SIGNAL_MAX) * 100),
        scoreText: `+${clampedScore}`,
        meterPercent,
      };
    }
    if (clampedScore <= -2) {
      return {
        action: "SELL" as const,
        tone: "danger" as const,
        confidence: Math.round((Math.abs(clampedScore) / SIGNAL_MAX) * 100),
        scoreText: `${clampedScore}`,
        meterPercent,
      };
    }
    return {
      action: "HOLD" as const,
      tone: "warning" as const,
      confidence: Math.round((Math.abs(clampedScore) / SIGNAL_MAX) * 100),
      scoreText: `${clampedScore > 0 ? "+" : ""}${clampedScore}`,
      meterPercent,
    };
  }, [signal.score]);

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
            <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Capa de Inteligencia de Skills</p>
            <h2 className="section-title mt-2 text-2xl font-semibold text-white">
              Senales accionables con tus nuevas skills
            </h2>
          </div>
          <Badge className="bg-surface-muted/60">
            <RefreshCw className="h-3.5 w-3.5" />
            {loading || loadingInsider || loadingFocus ? "Actualizando fuentes" : "Datos listos"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
            <div className="mt-3 rounded-xl border border-border/80 bg-surface-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  Ticker en foco: <span className="font-semibold text-text">{selectedInsiderTicker}</span>
                </p>
                <Badge tone={signal.tone}>{signal.label}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/70 px-2 py-1.5">
                  <p className="text-muted">PE</p>
                  <p className="font-semibold text-white">
                    {yahooFundamentals?.trailingPE !== undefined ? yahooFundamentals.trailingPE.toFixed(2) : "N/D"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 px-2 py-1.5">
                  <p className="text-muted">P/B</p>
                  <p className="font-semibold text-white">
                    {yahooFundamentals?.priceToBook !== undefined ? yahooFundamentals.priceToBook.toFixed(2) : "N/D"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 px-2 py-1.5">
                  <p className="text-muted">Rating</p>
                  <p className="font-semibold text-white">{yahooRatings?.recommendationKey ?? "N/D"}</p>
                </div>
                <div className="rounded-lg border border-border/70 px-2 py-1.5">
                  <p className="text-muted">Yield</p>
                  <p className="font-semibold text-white">
                    {yahooDividends?.dividendYield !== undefined
                      ? `${(yahooDividends.dividendYield * 100).toFixed(2)}%`
                      : "N/D"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Semaforo = insiders recientes + rating de consenso + valuacion (PE/PB).
              </p>
              <div className="mt-3 rounded-xl border border-border/80 bg-background/35 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Prediction Meter</p>
                  <Badge tone={predictionMeter.tone}>Action: {predictionMeter.action}</Badge>
                </div>
                <div className="relative">
                  <div className="grid h-3 grid-cols-3 overflow-hidden rounded-full border border-border/70">
                    <div className="bg-rose-500/45" />
                    <div className="bg-amber-500/45" />
                    <div className="bg-emerald-500/45" />
                  </div>
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-white shadow-[0_0_18px_rgba(255,255,255,0.45)]"
                    style={{ left: `${predictionMeter.meterPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-semibold tracking-[0.08em]">
                  <span className="text-rose-300">SELL</span>
                  <span className="text-amber-300">HOLD</span>
                  <span className="text-emerald-300">BUY</span>
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Score {predictionMeter.scoreText}/{SIGNAL_MAX} · Confianza {predictionMeter.confidence}%
                </p>
              </div>
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
            <div className="mb-3 inline-flex rounded-full border border-border/80 bg-surface-muted/20 p-1">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setInsiderWindowDays(days as 7 | 30 | 90)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    insiderWindowDays === days
                      ? "bg-accent/25 text-white"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
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
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/80 bg-surface-muted/20 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted">Compras</p>
                  <p className="text-sm font-semibold text-emerald-300">{selectedInsiderSummary.buyCount}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-surface-muted/20 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted">Ventas</p>
                  <p className="text-sm font-semibold text-amber-300">{selectedInsiderSummary.sellCount}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-surface-muted/20 px-3 py-2 text-center">
                  <p className="text-[11px] text-muted">Neto</p>
                  <p
                    className={`text-sm font-semibold ${
                      selectedInsiderSummary.netValue > 0
                        ? "text-emerald-300"
                        : selectedInsiderSummary.netValue < 0
                          ? "text-rose-300"
                          : "text-white"
                    }`}
                  >
                    {formatCurrency(selectedInsiderSummary.netValue, "USD")}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted">Ventana actual: ultimos {insiderWindowDays} dias.</p>
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
                      <Badge
                        tone={
                          trade.tradeType.toLowerCase().startsWith("p")
                            ? "success"
                            : trade.tradeType.toLowerCase().startsWith("s")
                              ? "warning"
                              : "default"
                        }
                      >
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
        </div>
      </div>
    </section>
  );
}
