'use client';

import { FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { isFundTicker } from "@/lib/portfolioGroups";

const DEFAULT_TICKER = "NASDAQ:AAPL";
const NO_MARKET = "NONE";
const BASE_MARKETS = ["NASDAQ", "NYSE", "BME", "XETR", "MIL", "PAR", "AMS", "LSE"];

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

export function LabGlobalAnalyzer() {
  const { holdings } = usePortfolioData();
  const defaultParsedTicker = useMemo(() => parseTicker(DEFAULT_TICKER), []);
  const [selectedMarket, setSelectedMarket] = useState(defaultParsedTicker.market);
  const [symbolInput, setSymbolInput] = useState(defaultParsedTicker.symbol);
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_TICKER);

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
              value={selectedMarket}
              onChange={(event) => setSelectedMarket(event.target.value)}
              className="h-10 w-full rounded-lg border border-border/70 bg-surface-muted/45 px-2 text-sm text-text outline-none transition focus:border-accent/60"
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
            <input
              id="lab-global-ticker"
              type="text"
              value={symbolInput}
              onChange={(event) => setSymbolInput(event.target.value)}
              placeholder="Ej. AAPL, REP, BTC-USD"
              className="h-10 w-full rounded-lg border border-border/70 bg-surface-muted/45 px-3 text-sm text-text outline-none transition focus:border-accent/60"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/20 px-4 text-sm font-semibold text-accent transition hover:bg-accent/30"
            >
              <Search size={14} />
              Buscar
            </button>
          </form>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Acciones</p>
            <div className="flex flex-wrap gap-2">
              {stockQuickTickers.map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => handleQuickSelect(ticker)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
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
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
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

      <PortfolioValueChart ticker={selectedTicker} />
    </section>
  );
}
