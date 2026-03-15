"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Radar, CandlestickChart, ArrowRight, RefreshCw, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MarketSearchResult } from "@/types/marketSearch";

type Quote = {
  symbol: string;
  name?: string;
  price: number;
  dayChangePercent?: number;
};

type QuotesFallbackItem = {
  ticker?: string;
  name?: string;
  price?: number;
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
const DEFAULT_INSIDER_TICKERS = ["NVDA", "MSFT", "AMZN"];
const SIGNAL_MIN = -3;
const SIGNAL_MAX = 3;
const SKILL_QUOTES_STORAGE_KEY = "skillIntelWatchlistQuotes";

const normalizeInsiderTicker = (ticker: string) =>
  ticker
    .trim()
    .toUpperCase()
    .replace(/^[A-Z]+:/, "")
    .split(".")[0]
    .replace(/[^A-Z0-9-]/g, "");

const isSupportedInsiderTicker = (ticker: string) => /^[A-Z]{1,5}$/.test(normalizeInsiderTicker(ticker));

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const changeTone = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return "default";
  if (value > 0) return "success";
  if (value < 0) return "danger";
  return "warning";
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const buildInsiderOnlySignal = (summary: InsiderSummary) => {
  let score = 0;

  if (summary.buyCount > summary.sellCount) score += 1;
  if (summary.sellCount > summary.buyCount) score -= 1;
  if (summary.netValue > 0) score += 1;
  if (summary.netValue < 0) score -= 1;

  if (score >= 2) {
    return { label: "Compra", tone: "success" as const, score };
  }
  if (score <= -2) {
    return { label: "Venta", tone: "danger" as const, score };
  }
  return { label: "Neutral", tone: "warning" as const, score };
};

const formatTradeTypeLabel = (tradeType: string) => {
  const normalized = tradeType.toLowerCase();
  if (normalized.startsWith("p")) return "Compra";
  if (normalized.startsWith("s")) return "Venta";
  return tradeType;
};

const normalizeQuotes = (rows: Quote[]) => {
  const map = new Map(
    rows
      .filter((row) => row?.symbol)
      .map((row) => [
        String(row.symbol).toUpperCase(),
        {
          symbol: String(row.symbol).toUpperCase(),
          name: row.name,
          price: isFiniteNumber(row.price) ? row.price : 0,
          dayChangePercent: isFiniteNumber(row.dayChangePercent) ? row.dayChangePercent : undefined,
        } satisfies Quote,
      ])
  );

  const normalized: Quote[] = [];
  for (const symbol of WATCHLIST) {
    const row = map.get(symbol);
    if (row && isFiniteNumber(row.price) && row.price > 0) {
      normalized.push(row);
    }
  }
  return normalized;
};

const normalizeFallbackQuotes = (rows: QuotesFallbackItem[]) => {
  const map = new Map(
    rows
      .filter((row) => row?.ticker)
      .map((row) => [
        String(row.ticker).toUpperCase(),
        {
          symbol: String(row.ticker).toUpperCase(),
          name: row.name,
          price: isFiniteNumber(row.price) ? row.price : 0,
          dayChangePercent: isFiniteNumber(row.dayChangePercent) ? row.dayChangePercent : undefined,
        } satisfies Quote,
      ])
  );

  const normalized: Quote[] = [];
  for (const symbol of WATCHLIST) {
    const row = map.get(symbol);
    if (row && isFiniteNumber(row.price) && row.price > 0) {
      normalized.push(row);
    }
  }
  return normalized;
};

export function DashboardSkillIntel({ portfolioTickers = [] }: DashboardSkillIntelProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [insiderByTicker, setInsiderByTicker] = useState<Record<string, InsiderTrade[]>>({});

  // Hydrate from localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SKILL_QUOTES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Quote[];
      if (Array.isArray(parsed)) {
        const cached = normalizeQuotes(parsed);
        if (cached.length > 0) {
          setQuotes(cached);
        }
      }
    } catch {
      // Ignore corrupted cache
    }
  }, []);
  const [insiderSummaryByTicker, setInsiderSummaryByTicker] = useState<Record<string, InsiderSummary>>(
    {}
  );
  const [selectedInsiderTicker, setSelectedInsiderTicker] = useState("NVDA");
  const [insiderWindowDays, setInsiderWindowDays] = useState<7 | 30 | 90>(30);
  const [customTickerInput, setCustomTickerInput] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [insiderSuggestions, setInsiderSuggestions] = useState<MarketSearchResult[]>([]);
  const [isSuggestingInsider, setIsSuggestingInsider] = useState(false);
  const [showInsiderSuggestions, setShowInsiderSuggestions] = useState(false);
  const [activeInsiderSuggestionIndex, setActiveInsiderSuggestionIndex] = useState(0);
  const [yahooFundamentals, setYahooFundamentals] = useState<YahooFundamentals | null>(null);
  const [yahooRatings, setYahooRatings] = useState<YahooRatings | null>(null);
  const [yahooDividends, setYahooDividends] = useState<YahooDividends | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsider, setLoadingInsider] = useState(true);
  const [loadingFocus, setLoadingFocus] = useState(true);
  const [baseError, setBaseError] = useState<string | null>(null);
  const [insiderError, setInsiderError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const hideInsiderSuggestionsTimeoutRef = useRef<number | null>(null);
  const deferredCustomTickerInput = useDeferredValue(customTickerInput);

  const supportedPortfolioTickers = useMemo(
    () =>
      portfolioTickers
        .filter(isSupportedInsiderTicker)
        .map(normalizeInsiderTicker),
    [portfolioTickers]
  );

  const portfolioInsiderTickers = useMemo(
    () => Array.from(new Set(supportedPortfolioTickers)).slice(0, 5),
    [supportedPortfolioTickers]
  );

  const generalInsiderTickers = useMemo(
    () => DEFAULT_INSIDER_TICKERS.filter((ticker) => !portfolioInsiderTickers.includes(ticker)),
    [portfolioInsiderTickers]
  );

  const insiderTickers = useMemo(() => {
    const merged = Array.from(
      new Set([
        ...portfolioInsiderTickers,
        ...generalInsiderTickers,
        ...customTickers.map(normalizeInsiderTicker),
      ].filter((ticker) => /^[A-Z][A-Z0-9-]{0,14}$/.test(ticker)))
    ).slice(0, 8);
    return merged.length > 0 ? merged : DEFAULT_INSIDER_TICKERS;
  }, [portfolioInsiderTickers, generalInsiderTickers, customTickers]);

  useEffect(() => {
    const preferredTicker = portfolioInsiderTickers[0] ?? insiderTickers[0];
    if (!insiderTickers.includes(selectedInsiderTicker) && preferredTicker) {
      setSelectedInsiderTicker(preferredTicker);
    }
  }, [insiderTickers, portfolioInsiderTickers, selectedInsiderTicker]);

  useEffect(() => {
    const query = normalizeSearchValue(deferredCustomTickerInput);
    if (!query) {
      setInsiderSuggestions([]);
      setIsSuggestingInsider(false);
      setActiveInsiderSuggestionIndex(0);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSuggestingInsider(true);
        const params = new URLSearchParams({ query });
        const response = await fetch(`/api/market/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("insider-search-failed");
        }
        const payload = (await response.json()) as { results?: MarketSearchResult[] };
        const nextSuggestions = Array.isArray(payload.results)
          ? payload.results.filter((result) => isSupportedInsiderTicker(result.symbol)).slice(0, 6)
          : [];
        setInsiderSuggestions(nextSuggestions);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[DashboardSkillIntel] OpenInsider autocomplete failed:", error);
        setInsiderSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggestingInsider(false);
        }
      }
    }, 140);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredCustomTickerInput]);

  useEffect(() => {
    setActiveInsiderSuggestionIndex(0);
  }, [insiderSuggestions]);

  useEffect(() => {
    return () => {
      if (hideInsiderSuggestionsTimeoutRef.current !== null) {
        window.clearTimeout(hideInsiderSuggestionsTimeoutRef.current);
      }
    };
  }, []);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setBaseError(null);
    try {
      const quotesRes = await fetch(`/api/yahoo?action=price&symbols=${WATCHLIST.join(",")}`, {
        cache: "no-store",
      });
      if (!quotesRes.ok) {
        throw new Error("No se pudieron cargar cotizaciones de Yahoo.");
      }
      const quotesData = (await quotesRes.json()) as { data?: Quote[] };
      const nextQuotes = normalizeQuotes(Array.isArray(quotesData.data) ? quotesData.data : []);
      if (nextQuotes.length === 0) {
        throw new Error("Sin cotizaciones disponibles.");
      }
      setQuotes(nextQuotes);
      window.localStorage.setItem(SKILL_QUOTES_STORAGE_KEY, JSON.stringify(nextQuotes));
    } catch {
      try {
        const fallbackRes = await fetch(`/api/quotes?tickers=${WATCHLIST.join(",")}`, {
          cache: "no-store",
        });
        if (!fallbackRes.ok) {
          throw new Error("Fallback sin respuesta.");
        }
        const fallbackData = (await fallbackRes.json()) as { quotes?: QuotesFallbackItem[] };
        const nextQuotes = normalizeFallbackQuotes(
          Array.isArray(fallbackData.quotes) ? fallbackData.quotes : []
        );
        if (nextQuotes.length === 0) {
          throw new Error("Sin cotizaciones en fallback.");
        }
        setQuotes(nextQuotes);
        window.localStorage.setItem(SKILL_QUOTES_STORAGE_KEY, JSON.stringify(nextQuotes));
      } catch {
        setQuotes((prev) => prev);
        if (quotes.length === 0) {
          setBaseError("Yahoo Finance no respondio. Prueba actualizar.");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [quotes.length]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  const loadInsider = useCallback(async () => {
    setLoadingInsider(true);
    setInsiderError(null);
    try {
      const res = await fetch(
        `/api/insider?tickers=${encodeURIComponent(insiderTickers.join(","))}&limit=3&fd=${insiderWindowDays}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error("No se pudo cargar OpenInsider.");
      }
      const data = (await res.json()) as InsiderResponse;
      setInsiderByTicker(data.byTicker ?? {});
      setInsiderSummaryByTicker(data.summaryByTicker ?? {});
    } catch {
      setInsiderByTicker({});
      setInsiderSummaryByTicker({});
      setInsiderError("OpenInsider no respondio. Prueba actualizar.");
    } finally {
      setLoadingInsider(false);
    }
  }, [insiderTickers, insiderWindowDays]);

  useEffect(() => {
    void loadInsider();
  }, [loadInsider]);

  const loadFocusData = useCallback(async () => {
    setLoadingFocus(true);
    setFocusError(null);
    try {
      const [fundRes, ratingsRes, divRes] = await Promise.allSettled([
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

      let failedRequests = 0;

      if (fundRes.status === "fulfilled" && fundRes.value.ok) {
        const fundJson = (await fundRes.value.json()) as { data?: YahooFundamentals | null };
        setYahooFundamentals(fundJson.data ?? null);
      } else {
        failedRequests += 1;
        setYahooFundamentals(null);
      }

      if (ratingsRes.status === "fulfilled" && ratingsRes.value.ok) {
        const ratingsJson = (await ratingsRes.value.json()) as { data?: YahooRatings | null };
        setYahooRatings(ratingsJson.data ?? null);
      } else {
        failedRequests += 1;
        setYahooRatings(null);
      }

      if (divRes.status === "fulfilled" && divRes.value.ok) {
        const divJson = (await divRes.value.json()) as { data?: YahooDividends | null };
        setYahooDividends(divJson.data ?? null);
      } else {
        failedRequests += 1;
        setYahooDividends(null);
      }

      if (failedRequests === 3) {
        setFocusError("No se pudo cargar analitica Yahoo para el ticker en foco.");
      } else if (failedRequests > 0) {
        setFocusError("Parte de la analitica Yahoo no esta disponible ahora mismo.");
      }
    } catch {
      setYahooFundamentals(null);
      setYahooRatings(null);
      setYahooDividends(null);
      setFocusError("No se pudo cargar analitica Yahoo para el ticker en foco.");
    } finally {
      setLoadingFocus(false);
    }
  }, [selectedInsiderTicker]);

  useEffect(() => {
    void loadFocusData();
  }, [loadFocusData]);

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

  const automaticSignals = useMemo(
    () =>
      insiderTickers
        .map((ticker) => {
          const summary = insiderSummaryByTicker[ticker] ?? {
            totalTrades: 0,
            buyCount: 0,
            sellCount: 0,
            buyValue: 0,
            sellValue: 0,
            netValue: 0,
          };
          return {
            ticker,
            summary,
            signal: buildInsiderOnlySignal(summary),
            source: portfolioInsiderTickers.includes(ticker) ? "Cartera" : "General",
          };
        })
        .sort((a, b) => {
          if (a.source !== b.source) return a.source === "Cartera" ? -1 : 1;
          const signalDiff = Math.abs(b.signal.score) - Math.abs(a.signal.score);
          if (signalDiff !== 0) return signalDiff;
          return b.summary.totalTrades - a.summary.totalTrades;
        }),
    [insiderTickers, insiderSummaryByTicker, portfolioInsiderTickers]
  );

  const insiderOverview = useMemo(() => {
    const portfolioCount = automaticSignals.filter((item) => item.source === "Cartera").length;
    const generalCount = automaticSignals.filter((item) => item.source === "General").length;
    const actionableCount = automaticSignals.filter((item) => item.signal.label !== "Neutral").length;
    return { portfolioCount, generalCount, actionableCount };
  }, [automaticSignals]);

  const topAutomaticSignal = automaticSignals[0] ?? null;

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

  const applyInsiderTicker = useCallback((ticker: string) => {
    const normalized = normalizeInsiderTicker(ticker);
    if (!/^[A-Z][A-Z0-9-]{0,14}$/.test(normalized)) return;
    setCustomTickers((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setSelectedInsiderTicker(normalized);
    setCustomTickerInput("");
    setInsiderSuggestions([]);
    setShowInsiderSuggestions(false);
    setActiveInsiderSuggestionIndex(0);
  }, []);

  const applyInsiderSuggestion = useCallback(
    (suggestion: MarketSearchResult) => {
      applyInsiderTicker(suggestion.symbol);
    },
    [applyInsiderTicker]
  );

  const handleInsiderSuggestionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showInsiderSuggestions || insiderSuggestions.length === 0) {
      if (event.key === "Escape") {
        setShowInsiderSuggestions(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveInsiderSuggestionIndex((current) => (current + 1) % insiderSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveInsiderSuggestionIndex((current) => (current - 1 + insiderSuggestions.length) % insiderSuggestions.length);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setShowInsiderSuggestions(false);
      setActiveInsiderSuggestionIndex(0);
      return;
    }

    if (event.key === "Enter") {
      const activeSuggestion = insiderSuggestions[activeInsiderSuggestionIndex];
      if (!activeSuggestion) return;
      event.preventDefault();
      applyInsiderSuggestion(activeSuggestion);
    }
  };

  const addCustomTicker = (event: FormEvent) => {
    event.preventDefault();
    const activeSuggestion = showInsiderSuggestions ? insiderSuggestions[activeInsiderSuggestionIndex] : undefined;
    if (activeSuggestion) {
      applyInsiderSuggestion(activeSuggestion);
      return;
    }
    applyInsiderTicker(customTickerInput);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/70 p-6 shadow-panel backdrop-blur-xl md:p-8">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/10 blur-2xl" />

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Capa de Inteligencia de Skills</p>
            <h2 className="section-title mt-2 text-2xl font-semibold text-white">
              Señales accionables para cartera y mercado
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
            footer={
              <button
                type="button"
                onClick={() => {
                  void loadBaseData();
                  void loadFocusData();
                }}
                className="rounded-full border border-border/80 bg-surface-muted/30 px-3 py-1 text-[11px] font-medium text-text transition-colors hover:border-primary/60"
              >
                Actualizar
              </button>
            }
          >
            <div className="rounded-2xl border border-primary/20 bg-background/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={signal.tone}>{signal.label}</Badge>
                <Badge tone={predictionMeter.tone}>Acción {predictionMeter.action}</Badge>
                <Badge tone="default">Foco {selectedInsiderTicker}</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text/90">
                El pulso Yahoo resume valoración, consenso y dividendo para el ticker activo. Úsalo como filtro previo antes de profundizar en la señal insider.
              </p>
            </div>

            <div className="mt-4 space-y-2">
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
            {(baseError || focusError) && (
              <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                {baseError ?? focusError}
              </p>
            )}
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
                Semáforo = insiders recientes + rating de consenso + valoración relativa (PE/PB).
              </p>
              <div className="mt-3 rounded-xl border border-border/80 bg-background/35 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Medidor de señal</p>
                  <Badge tone={predictionMeter.tone}>Acción: {predictionMeter.action}</Badge>
                </div>
                <div className="relative">
                  <div className="flex h-3 overflow-hidden rounded-full border border-border/70">
                    <div className="h-full flex-1 bg-rose-500/45" />
                    <div className="h-full flex-1 bg-amber-500/45" />
                    <div className="h-full flex-1 bg-emerald-500/45" />
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
            subtitle="Señales automáticas para tus posiciones y una cesta general, sin seleccionar nada"
            footer={
              <button
                type="button"
                onClick={() => {
                  void loadInsider();
                }}
                className="rounded-full border border-border/80 bg-surface-muted/30 px-3 py-1 text-[11px] font-medium text-text transition-colors hover:border-accent/60"
              >
                Actualizar
              </button>
            }
          >
            <div className="rounded-2xl border border-accent/20 bg-background/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="default">{insiderOverview.portfolioCount} cartera</Badge>
                <Badge tone="default">{insiderOverview.generalCount} generales</Badge>
                <Badge tone={insiderOverview.actionableCount > 0 ? "success" : "warning"}>
                  {insiderOverview.actionableCount} señales activas
                </Badge>
                {topAutomaticSignal ? (
                  <Badge tone={topAutomaticSignal.signal.tone}>
                    Prioridad {topAutomaticSignal.ticker}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text/90">
                El radar mezcla cartera y cesta general para no depender de selección manual. La señal prioritaria sube arriba y el detalle queda debajo.
              </p>
            </div>

            <div className="mt-3 mb-3 grid gap-2 sm:grid-cols-2">
              <SignalSummary
                label="Tickers cartera"
                value={String(insiderOverview.portfolioCount)}
                detail="Compatibles con OpenInsider"
              />
              <SignalSummary
                label="Tickers generales"
                value={String(insiderOverview.generalCount)}
                detail="Cesta base para no quedarse ciego"
              />
              <SignalSummary
                label="Señales activas"
                value={String(insiderOverview.actionableCount)}
                detail="Compra o venta con más convicción"
                className="sm:col-span-2"
              />
            </div>
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
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              {automaticSignals.map(({ ticker, summary, signal: tickerSignal, source }) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setSelectedInsiderTicker(ticker)}
                  className={`min-h-[88px] rounded-2xl border px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors ${
                    selectedInsiderTicker === ticker
                      ? "border-accent/60 bg-[linear-gradient(180deg,rgba(124,155,255,0.16),rgba(24,36,58,0.72))]"
                      : "border-primary/10 bg-[linear-gradient(180deg,rgba(20,31,49,0.7),rgba(14,23,38,0.52))] hover:border-accent/32"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-sm font-semibold text-white">{ticker}</span>
                      <Badge tone={source === "Cartera" ? "success" : "default"}>{source}</Badge>
                    </div>
                    <Badge tone={tickerSignal.tone}>{tickerSignal.label}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted">
                    <span>C {summary.buyCount}</span>
                    <span className="text-right">V {summary.sellCount}</span>
                    <span className="col-span-2">{summary.totalTrades} ops</span>
                  </div>
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
              <label htmlFor="insider-custom-ticker" className="sr-only">
                Ticker personalizado
              </label>
              <div className="relative flex-1">
                <input
                  id="insider-custom-ticker"
                  name="insider_ticker"
                  autoComplete="off"
                  value={customTickerInput}
                  onChange={(event) => {
                    setCustomTickerInput(event.target.value);
                    setShowInsiderSuggestions(true);
                  }}
                  onFocus={() => {
                    if (hideInsiderSuggestionsTimeoutRef.current !== null) {
                      window.clearTimeout(hideInsiderSuggestionsTimeoutRef.current);
                    }
                    setShowInsiderSuggestions(true);
                  }}
                  onBlur={() => {
                    hideInsiderSuggestionsTimeoutRef.current = window.setTimeout(() => {
                      setShowInsiderSuggestions(false);
                    }, 120);
                  }}
                  onKeyDown={handleInsiderSuggestionKeyDown}
                  placeholder="Ticker a analizar (ej. TSLA)…"
                  className="h-9 w-full rounded-lg border border-border/80 bg-surface-muted/30 px-3 text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
                />
                {showInsiderSuggestions && (insiderSuggestions.length > 0 || isSuggestingInsider) && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-border/80 bg-surface/95 shadow-xl backdrop-blur-xl">
                    {isSuggestingInsider && insiderSuggestions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted">Buscando tickers…</p>
                    ) : (
                      insiderSuggestions.map((suggestion, index) => {
                        const isActive = index === activeInsiderSuggestionIndex;
                        return (
                          <button
                            key={`${suggestion.market}:${suggestion.symbol}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyInsiderSuggestion(suggestion)}
                            className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors ${
                              isActive ? "bg-accent/18 text-white" : "text-text hover:bg-surface-muted/50"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold">{suggestion.symbol}</span>
                              <span className="block truncate text-[11px] text-muted">{suggestion.name}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                              {suggestion.market}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border/80 bg-surface-muted/40 px-3 text-xs text-text transition-colors duration-200 hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Agregar
              </button>
            </form>

            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <SignalSummary
                  label="Compras"
                  value={String(selectedInsiderSummary.buyCount)}
                  detail="Operaciones de compra"
                />
                <SignalSummary
                  label="Ventas"
                  value={String(selectedInsiderSummary.sellCount)}
                  detail="Operaciones de venta"
                />
                <SignalSummary
                  label="Neto"
                  value={formatCurrency(selectedInsiderSummary.netValue, "USD")}
                  detail={`Ventana actual ${insiderWindowDays}d`}
                  className="sm:col-span-2"
                  tone={
                    selectedInsiderSummary.netValue > 0
                      ? "success"
                      : selectedInsiderSummary.netValue < 0
                        ? "danger"
                        : "default"
                  }
                />
              </div>
              {insiderError && (
                <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                  {insiderError}
                </p>
              )}
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
                        {formatTradeTypeLabel(trade.tradeType)}
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

function SignalSummary({
  label,
  value,
  detail,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "danger";
  className?: string;
}) {
  const toneClassName =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-rose-300"
        : "text-white";

  return (
    <div className={cn("flex min-h-[92px] flex-col rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,rgba(20,31,49,0.7),rgba(14,23,38,0.52))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]", className)}>
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClassName}`}>{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">{detail}</p>
    </div>
  );
}
