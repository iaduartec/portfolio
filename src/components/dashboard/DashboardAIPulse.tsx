"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { MarketPulse } from "@/components/ai/MarketPulse";
import { ScenarioBuilder } from "@/components/ai/ScenarioBuilder";

type MarketQuote = {
  symbol: string;
  price?: number;
  dayChangePercent?: number;
};

type MarketPulseState = {
  sentiment: string;
  score: number;
  insight: string;
};

const MARKET_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];
const EQUITY_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT"];

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
  vixPrice?: number
) => {
  if (coveredCount === 0) return "Sin cotizaciones suficientes para medir el sentimiento global.";
  const direction = averageChangePercent >= 0 ? "al alza" : "a la baja";
  const breadth = `${upCount}/${coveredCount} indices avanzan`;
  const vixFragment =
    vixPrice !== undefined && Number.isFinite(vixPrice)
      ? ` VIX en ${vixPrice.toFixed(1)}.`
      : "";
  return `Mercado ${direction}: ${breadth}. Pulso agregado ${score}/100.${vixFragment}`;
};

const INITIAL_PULSE: MarketPulseState = {
  sentiment: "Neutral",
  score: 50,
  insight: "Cargando sentimiento general de mercado...",
};

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
  const vixQuote = quoteMap.get("^VIX");
  const vixPrice = Number.isFinite(vixQuote?.price) ? vixQuote?.price : undefined;
  const vixDayChangePercent = Number.isFinite(vixQuote?.dayChangePercent)
    ? vixQuote?.dayChangePercent
    : undefined;
  const vixLevelTilt =
    vixPrice !== undefined ? clamp((20 - vixPrice) * 1.2, -18, 18) : 0;
  const vixTrendTilt =
    vixDayChangePercent !== undefined ? clamp(vixDayChangePercent * -1.4, -10, 10) : 0;
  const score =
    coveredCount > 0
      ? clamp(Math.round(50 + trendTilt + breadthTilt + vixLevelTilt + vixTrendTilt), 0, 100)
      : 50;

  return {
    sentiment: getSentimentLabel(score),
    score,
    insight: getPulseInsight(score, averageChangePercent, coveredCount, upCount, vixPrice),
  };
};

export function DashboardAIPulse() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);

  const loadMarketPulse = useCallback(async () => {
    try {
      const res = await fetch(`/api/yahoo?action=price&symbols=${encodeURIComponent(MARKET_SYMBOLS.join(","))}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("No se pudieron cargar indices de mercado.");
      }
      const json = (await res.json()) as { data?: MarketQuote[] };
      setQuotes(Array.isArray(json.data) ? json.data : []);
    } catch {
      setQuotes([]);
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
    () => (quotes.length > 0 ? buildPulseState(quotes) : INITIAL_PULSE),
    [quotes]
  );

  return (
    <section className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
      <div className="md:col-span-3 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <MarketPulse sentiment={pulse.sentiment} score={pulse.score} insight={pulse.insight} />
          <ScenarioBuilder />
        </div>
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
