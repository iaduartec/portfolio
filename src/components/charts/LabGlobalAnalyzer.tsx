'use client';

import { FormEvent, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { usePortfolioData } from "@/hooks/usePortfolioData";

const DEFAULT_TICKER = "NASDAQ:AAPL";

const normalizeTickerInput = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "");

export function LabGlobalAnalyzer() {
  const { holdings } = usePortfolioData();
  const [inputValue, setInputValue] = useState(DEFAULT_TICKER);
  const [selectedTicker, setSelectedTicker] = useState(DEFAULT_TICKER);

  const quickTickers = useMemo(() => {
    const fromPortfolio = holdings
      .map((holding) => holding.ticker?.toUpperCase())
      .filter((ticker): ticker is string => Boolean(ticker));
    const base = ["NASDAQ:AAPL", "NASDAQ:NVDA", "SPY", "BTC-USD"];
    return Array.from(new Set([...fromPortfolio, ...base])).slice(0, 8);
  }, [holdings]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeTickerInput(inputValue);
    if (!normalized) return;
    setSelectedTicker(normalized);
    setInputValue(normalized);
  };

  const handleQuickSelect = (ticker: string) => {
    setSelectedTicker(ticker);
    setInputValue(ticker);
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
          <form onSubmit={handleSearch} className="flex w-full max-w-xl gap-2">
            <label htmlFor="lab-global-ticker" className="sr-only">
              Buscar ticker
            </label>
            <input
              id="lab-global-ticker"
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ej. NASDAQ:AAPL o BME:REP"
              className="h-10 w-full rounded-lg border border-border/70 bg-surface-muted/45 px-3 text-sm text-text outline-none transition focus:border-accent/60"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-accent/50 bg-accent/20 px-4 text-sm font-semibold text-accent transition hover:bg-accent/30"
            >
              <Search size={14} />
              Buscar
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickTickers.map((ticker) => (
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

      <PortfolioValueChart ticker={selectedTicker} />
    </section>
  );
}
