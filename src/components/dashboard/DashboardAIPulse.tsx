"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { MarketPulse } from "@/components/ai/MarketPulse";
import { ScenarioBuilder } from "@/components/ai/ScenarioBuilder";
import { DashboardMacroRadar } from "@/components/dashboard/DashboardMacroRadar";

type MarketQuote = {
  symbol: string;
  price?: number;
  dayChangePercent?: number;
};

type QuotesFallbackItem = {
  ticker?: string;
  price?: number;
  dayChangePercent?: number;
};

type MarketPulseState = {
  sentiment: string;
  score: number;
  insight: string;
};

const MARKET_SYMBOLS = ["SPY", "QQQ", "DIA", "IWM", "VIXY"];
const EQUITY_SYMBOLS = ["SPY", "QQQ", "DIA", "IWM"];
const VOLATILITY_SYMBOL = "VIXY";
const PULSE_STORAGE_KEY = "marketPulseQuotes";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getSentimentLabel = (score: number) => {
  if (score >= 75) return "Optimismo fuerte";
  if (score >= 60) return "Optimismo cauteloso";
  if (score >= 45) return "Neutral";
  if (score >= 30) return "Riesgo creciente";
  return "Presion bajista";
};

const getPulseInsight = (
  score: number,
  averageChangePercent: number,
  coveredCount: number,
  upCount: number,
  volatilityChangePercent?: number
) => {
  if (coveredCount === 0) return "Sin cotizaciones suficientes para medir el sentimiento global.";
  const direction = averageChangePercent >= 0 ? "al alza" : "a la baja";
  const breadth = `${upCount}/${coveredCount} indices avanzan`;
  const volatilityFragment =
    volatilityChangePercent !== undefined && Number.isFinite(volatilityChangePercent)
      ? ` Volatilidad ${volatilityChangePercent >= 0 ? "repunta" : "cede"} ${Math.abs(
          volatilityChangePercent
        ).toFixed(2)}%.`
      : "";
  return `Mercado ${direction}: ${breadth}. Pulso agregado ${score}/100.${volatilityFragment}`;
};

const INITIAL_PULSE: MarketPulseState = {
  sentiment: "Neutral",
  score: 50,
  insight: "Cargando sentimiento general de mercado...",
};

const UNAVAILABLE_PULSE: MarketPulseState = {
  sentiment: "Neutral",
  score: 50,
  insight: "No se pudo cargar el sentimiento general de mercado en este momento.",
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeQuoteSet = (rows: MarketQuote[]) => {
  const map = new Map(
    rows
      .filter((row) => row?.symbol)
      .map((row) => [
        String(row.symbol).toUpperCase(),
        {
          symbol: String(row.symbol).toUpperCase(),
          price: isFiniteNumber(row.price) ? row.price : undefined,
          dayChangePercent: isFiniteNumber(row.dayChangePercent) ? row.dayChangePercent : undefined,
        } satisfies MarketQuote,
      ])
  );

  return MARKET_SYMBOLS.map(
    (symbol) => map.get(symbol) ?? { symbol, price: undefined, dayChangePercent: undefined }
  );
};

const normalizeFallbackSet = (rows: QuotesFallbackItem[]) => {
  const map = new Map(
    rows
      .filter((row) => row?.ticker)
      .map((row) => [
        String(row.ticker).toUpperCase(),
        {
          symbol: String(row.ticker).toUpperCase(),
          price: isFiniteNumber(row.price) ? row.price : undefined,
          dayChangePercent: isFiniteNumber(row.dayChangePercent) ? row.dayChangePercent : undefined,
        } satisfies MarketQuote,
      ])
  );

  return MARKET_SYMBOLS.map(
    (symbol) => map.get(symbol) ?? { symbol, price: undefined, dayChangePercent: undefined }
  );
};

const hasEnoughCoverage = (rows: MarketQuote[]) =>
  rows.filter((row) => EQUITY_SYMBOLS.includes(row.symbol) && isFiniteNumber(row.dayChangePercent)).length >= 3;

const buildPulseState = (quotes: MarketQuote[]): MarketPulseState => {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote]));
  const equities = EQUITY_SYMBOLS.map((symbol) => quoteMap.get(symbol))
    .filter(
      (quote): quote is MarketQuote =>
        quote !== undefined && Number.isFinite(quote.dayChangePercent)
    );
  const coveredCount = equities.length;
  const upCount = equities.filter((quote) => (quote.dayChangePercent ?? 0) > 0).length;
  const breadthRatio = coveredCount > 0 ? upCount / coveredCount : 0.5;
  const averageChangePercent =
    coveredCount > 0
      ? equities.reduce((sum, quote) => sum + (quote.dayChangePercent ?? 0), 0) / coveredCount
      : 0;
  const trendTilt = clamp(averageChangePercent * 10, -20, 20);
  const breadthTilt = (breadthRatio - 0.5) * 30;
  const volatilityQuote = quoteMap.get(VOLATILITY_SYMBOL);
  const volatilityChangePercent = Number.isFinite(volatilityQuote?.dayChangePercent)
    ? volatilityQuote?.dayChangePercent
    : undefined;
  const volatilityTilt =
    volatilityChangePercent !== undefined ? clamp(volatilityChangePercent * -2, -16, 16) : 0;
  const score =
    coveredCount > 0
      ? clamp(Math.round(50 + trendTilt + breadthTilt + volatilityTilt), 0, 100)
      : 50;

  return {
    sentiment: getSentimentLabel(score),
    score,
    insight: getPulseInsight(
      score,
      averageChangePercent,
      coveredCount,
      upCount,
      volatilityChangePercent
    ),
  };
};

export function DashboardAIPulse() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PULSE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MarketQuote[];
      if (Array.isArray(parsed)) {
        const cached = normalizeQuoteSet(parsed);
        if (hasEnoughCoverage(cached)) {
          setQuotes(cached);
        }
      }
    } catch {
      // Ignore corrupted cache
    }
  }, []);

  const loadMarketPulse = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/yahoo?action=price&symbols=${encodeURIComponent(MARKET_SYMBOLS.join(","))}`,
        {
          cache: "no-store",
        }
      );
      if (!res.ok) {
        throw new Error("No se pudieron cargar indices de mercado.");
      }
      const json = (await res.json()) as { data?: MarketQuote[] };
      const nextQuotes = normalizeQuoteSet(Array.isArray(json.data) ? json.data : []);
      if (hasEnoughCoverage(nextQuotes)) {
        setQuotes(nextQuotes);
        window.localStorage.setItem(PULSE_STORAGE_KEY, JSON.stringify(nextQuotes));
        return;
      }
      throw new Error("Cobertura insuficiente de mercado.");
    } catch {
      try {
        const fallbackRes = await fetch(
          `/api/quotes?tickers=${encodeURIComponent(MARKET_SYMBOLS.join(","))}`,
          {
            cache: "no-store",
          }
        );
        if (!fallbackRes.ok) {
          throw new Error("Fallback de cotizaciones no disponible.");
        }
        const fallbackJson = (await fallbackRes.json()) as { quotes?: QuotesFallbackItem[] };
        const fallbackQuotes = normalizeFallbackSet(
          Array.isArray(fallbackJson.quotes) ? fallbackJson.quotes : []
        );
        if (hasEnoughCoverage(fallbackQuotes)) {
          setQuotes(fallbackQuotes);
          window.localStorage.setItem(PULSE_STORAGE_KEY, JSON.stringify(fallbackQuotes));
          return;
        }
      } catch {
        // Preserve previous or cached values if providers fail.
      }
    } finally {
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      await loadMarketPulse();
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadMarketPulse]);

  const pulse = useMemo(
    () => {
      if (quotes.length > 0) return buildPulseState(quotes);
      if (!hasLoaded) return INITIAL_PULSE;
      return UNAVAILABLE_PULSE;
    },
    [quotes, hasLoaded]
  );

  return (
    <section className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
      <div className="md:col-span-3 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <MarketPulse sentiment={pulse.sentiment} score={pulse.score} insight={pulse.insight} />
          <ScenarioBuilder />
        </div>
        <DashboardMacroRadar />
        <Card title="Analisis de IA" subtitle="Mercado global y cartera en tiempo real">
          <p className="text-muted-foreground text-sm p-4">
            El pulso de arriba resume sentimiento general de mercado con indices amplios y volatilidad, no tus
            posiciones. El asistente de IA puede analizar tus participaciones concretas y escenarios sobre la
            cartera.
          </p>
        </Card>
      </div>
    </section>
  );
}
