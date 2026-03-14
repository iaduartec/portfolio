'use client';

import { FormEvent, KeyboardEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { isFundTicker } from "@/lib/portfolioGroups";
import type { MarketSearchResult } from "@/types/marketSearch";

const DEFAULT_TICKER = "NASDAQ:AAPL";
const NO_MARKET = "NONE";
const BASE_MARKETS = ["NASDAQ", "NYSE", "BME", "XETR", "MIL", "PAR", "AMS", "LSE"];
const RANGE_OPTIONS = [
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "10y", label: "10Y" },
  { value: "max", label: "MAX" },
] as const;

type HistoryRange = (typeof RANGE_OPTIONS)[number]["value"];

const normalizeTickerInput = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "");

const parseTicker = (rawTicker: string) => {
  const normalized = normalizeTickerInput(rawTicker);
  if (!normalized) return { market: "NASDAQ", symbol: "AAPL" };
  if (!normalized.includes(":")) return { market: NO_MARKET, symbol: normalized };
  const [market, symbol] = normalized.split(":", 2);
  return {
    market: market || NO_MARKET,
    symbol: symbol || "",
  };
};

const buildTicker = (market: string, symbol: string) =>
  market === NO_MARKET ? symbol : `${market}:${symbol}`;

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

export function LabGlobalAnalyzer() {
  const { holdings } = usePortfolioData();
  const defaultParsedTicker = useMemo(() => parseTicker(DEFAULT_TICKER), []);
  const [selectedMarket, setSelectedMarket] = useState(defaultParsedTicker.market);
  const [symbolInput, setSymbolInput] = useState(defaultParsedTicker.symbol);
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_TICKER);
  const [selectedRange, setSelectedRange] = useState<HistoryRange>("1y");
  const [suggestions, setSuggestions] = useState<MarketSearchResult[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const hideSuggestionsTimeoutRef = useRef<number | null>(null);
  const deferredSymbolInput = useDeferredValue(symbolInput);

  const stockQuickTickers = useMemo(() => {
    const fromPortfolio = holdings
      .filter((holding) => !isFundTicker(holding.ticker))
      .map((holding) => holding.ticker?.toUpperCase())
      .filter((ticker): ticker is string => Boolean(ticker));
    const base = ["NASDAQ:AAPL", "NASDAQ:NVDA", "SPY", "BTC-USD"];
    return Array.from(new Set([...fromPortfolio, ...base])).slice(0, 8);
  }, [holdings]);

  const fundQuickTickers = useMemo(() => {
    const fromPortfolio = holdings
      .filter((holding) => isFundTicker(holding.ticker))
      .map((holding) => holding.ticker?.toUpperCase())
      .filter((ticker): ticker is string => Boolean(ticker));
    const base = ["XETR:EXW1", "XETR:IS3K", "XETR:XUCD"];
    return Array.from(new Set([...fromPortfolio, ...base])).slice(0, 8);
  }, [holdings]);

  const marketOptions = useMemo(() => {
    const marketsInPortfolio = holdings
      .map((holding) => holding.ticker?.toUpperCase() ?? "")
      .filter((ticker) => ticker.includes(":"))
      .map((ticker) => ticker.split(":", 1)[0])
      .filter(Boolean);
    const merged = new Set([...BASE_MARKETS, ...marketsInPortfolio]);
    return Array.from(merged);
  }, [holdings]);

  const topSuggestion = suggestions[0] ?? null;
  const topSuggestionLabel = useMemo(() => {
    if (!topSuggestion) return null;
    const query = normalizeSearchValue(symbolInput);
    if (!query || query.includes(":")) return null;
    return `${topSuggestion.ticker} · ${topSuggestion.name}`;
  }, [topSuggestion, symbolInput]);

  const applySuggestion = (suggestion: MarketSearchResult) => {
    setSelectedMarket(suggestion.market);
    setSymbolInput(suggestion.symbol);
    setSelectedTicker(suggestion.ticker);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(0);
  };

  const handleSuggestionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (event.key === "Escape") {
        setShowSuggestions(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setShowSuggestions(false);
      setActiveSuggestionIndex(0);
      return;
    }

    if (event.key === "Enter") {
      const activeSuggestion = suggestions[activeSuggestionIndex] ?? topSuggestion;
      if (!activeSuggestion) return;
      event.preventDefault();
      applySuggestion(activeSuggestion);
    }
  };

  useEffect(() => {
    const query = deferredSymbolInput.trim();
    if (!query) {
      setSuggestions([]);
      setIsSuggesting(false);
      setActiveSuggestionIndex(0);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const params = new URLSearchParams({ query });
        if (selectedMarket !== NO_MARKET) {
          params.set("market", selectedMarket);
        }
        const res = await fetch(`/api/market/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("search-failed");
        const payload = (await res.json()) as { results?: MarketSearchResult[] };
        setSuggestions(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[LabGlobalAnalyzer] Search autocomplete failed:", error);
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggesting(false);
        }
      }
    }, 140);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredSymbolInput, selectedMarket]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [suggestions]);

  useEffect(() => {
    return () => {
      if (hideSuggestionsTimeoutRef.current !== null) {
        window.clearTimeout(hideSuggestionsTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSymbol = normalizeTickerInput(symbolInput);
    if (!normalizedSymbol) return;
    if (normalizedSymbol.includes(":")) {
      const parsed = parseTicker(normalizedSymbol);
      if (!parsed.symbol) return;
      setSelectedMarket(parsed.market);
      setSymbolInput(parsed.symbol);
      setSelectedTicker(buildTicker(parsed.market, parsed.symbol));
      return;
    }

    if (showSuggestions && suggestions.length > 0) {
      const activeSuggestion = suggestions[activeSuggestionIndex] ?? topSuggestion;
      if (activeSuggestion) {
        applySuggestion(activeSuggestion);
        return;
      }
    }

    if (topSuggestion) {
      applySuggestion(topSuggestion);
      return;
    }

    setSelectedTicker(buildTicker(selectedMarket, normalizedSymbol));
    setSymbolInput(normalizedSymbol);
  };

  const handleQuickSelect = (ticker: string) => {
    const parsed = parseTicker(ticker);
    setSelectedTicker(ticker);
    setSelectedMarket(parsed.market);
    setSymbolInput(parsed.symbol);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 shadow-panel backdrop-blur-xl md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-text">Analizador Global</h2>
            <p className="mt-1 text-sm text-muted">
              Busca cualquier ticker y analiza su gráfico con detección de patrones y auditoría IA.
            </p>
          </div>
          <form
            onSubmit={handleSearch}
            className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]"
          >
            <label htmlFor="lab-global-market" className="sr-only">
              Seleccionar mercado
            </label>
            <select
              id="lab-global-market"
              name="market"
              value={selectedMarket}
              onChange={(event) => setSelectedMarket(event.target.value)}
              className="h-10 w-full rounded-lg border border-border/70 bg-surface-muted/45 px-2 text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <option value={NO_MARKET}>Sin mercado</option>
              {marketOptions.map((market) => (
                <option key={market} value={market}>
                  {market}
                </option>
              ))}
            </select>
            <label htmlFor="lab-global-ticker" className="sr-only">
              Buscar ticker
            </label>
            <div className="relative">
              <input
                id="lab-global-ticker"
                type="text"
                name="ticker"
                autoComplete="off"
                value={symbolInput}
                onChange={(event) => {
                  setSymbolInput(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSuggestionKeyDown}
                onBlur={() => {
                  if (hideSuggestionsTimeoutRef.current !== null) {
                    window.clearTimeout(hideSuggestionsTimeoutRef.current);
                  }
                  hideSuggestionsTimeoutRef.current = window.setTimeout(() => {
                    setShowSuggestions(false);
                  }, 140);
                }}
                placeholder="Ej. AAPL, REP, BTC-USD…"
                className="h-10 w-full rounded-lg border border-border/70 bg-surface-muted/45 px-3 text-sm text-text transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              />
              {showSuggestions && (suggestions.length > 0 || isSuggesting) ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-border/80 bg-[#0d1422]/96 shadow-[0_24px_50px_rgba(2,8,20,0.55)] backdrop-blur-xl">
                  {isSuggesting ? (
                    <div className="px-3 py-2 text-xs text-muted">Buscando coincidencias…</div>
                  ) : (
                    suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.ticker}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applySuggestion(suggestion);
                        }}
                        className={`flex w-full items-start justify-between gap-3 border-b border-border/60 px-3 py-2 text-left transition-colors duration-150 last:border-b-0 ${
                          index === activeSuggestionIndex
                            ? "bg-surface-muted/45"
                            : "hover:bg-surface-muted/35"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">{suggestion.ticker}</p>
                          <p className="truncate text-xs text-muted">{suggestion.name}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1">
                          {suggestion.tags.slice(0, 2).map((tag) => (
                            <span
                              key={`${suggestion.ticker}-${tag}`}
                              className="rounded-full border border-border/70 bg-surface-muted/35 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/20 px-4 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
            >
              <Search size={14} aria-hidden="true" />
              Buscar
            </button>
          </form>
        </div>

        {topSuggestionLabel ? (
          <p className="mt-3 text-xs text-muted">
            Coincidencia: <span className="font-medium text-text">{topSuggestionLabel}</span>
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Histórico visible</p>
            <div className="inline-flex flex-wrap rounded-full border border-border/80 bg-surface-muted/20 p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRange(option.value)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 ${
                    selectedRange === option.value
                      ? "bg-accent/25 text-white"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Acciones</p>
            <div className="flex flex-wrap gap-2">
              {stockQuickTickers.map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => handleQuickSelect(ticker)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 ${
                    ticker === selectedTicker
                      ? "border-accent/70 bg-accent/20 text-white"
                      : "border-border/70 bg-surface-muted/35 text-muted hover:border-accent/50 hover:text-text"
                  }`}
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>

          {fundQuickTickers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Fondos y ETFs</p>
              <div className="flex flex-wrap gap-2">
                {fundQuickTickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => handleQuickSelect(ticker)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 ${
                      ticker === selectedTicker
                        ? "border-accent/70 bg-accent/20 text-white"
                        : "border-border/70 bg-surface-muted/35 text-muted hover:border-accent/50 hover:text-text"
                    }`}
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <PortfolioValueChart ticker={selectedTicker} showProjectionInsights range={selectedRange} />
    </section>
  );
}
