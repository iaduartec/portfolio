"use client";

import { useEffect, useMemo, useState } from "react";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { isFundTicker, isNonInvestmentTicker } from "@/lib/portfolioGroups";
import { cn } from "@/lib/utils";

type CorrelationMatrix = {
  tickers: string[];
  matrix: number[][];
};

// Compute Pearson correlation coefficient between two return series
const pearson = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length);
  if (n < 5) return NaN;
  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);

  const meanA = aSlice.reduce((s, v) => s + v, 0) / n;
  const meanB = bSlice.reduce((s, v) => s + v, 0) / n;

  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = aSlice[i] - meanA;
    const db = bSlice[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denom = Math.sqrt(denomA * denomB);
  return denom === 0 ? NaN : num / denom;
};

// Daily log-returns from a sorted close-price series
const toLogReturns = (closes: number[]): number[] => {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  return returns;
};

// Color interpolation: -1 (red) → 0 (neutral) → +1 (green)
const correlationColor = (r: number): string => {
  if (!Number.isFinite(r)) return "bg-surface-muted/30 text-muted/40";
  if (r >= 0.8) return "bg-emerald-500/30 text-emerald-300";
  if (r >= 0.5) return "bg-emerald-500/15 text-emerald-400/80";
  if (r >= 0.2) return "bg-surface-muted/40 text-muted";
  if (r >= -0.2) return "bg-surface-muted/20 text-muted/70";
  if (r >= -0.5) return "bg-rose-500/10 text-rose-400/80";
  return "bg-rose-500/25 text-rose-300";
};

const formatR = (r: number) =>
  !Number.isFinite(r) ? "–" : r.toFixed(2);

export function CorrelationHeatmap() {
  const { holdings } = usePortfolioData();
  const [matrix, setMatrix] = useState<CorrelationMatrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tickers = useMemo(() => {
    return Array.from(
      new Set(
        holdings
          .map((h) => h.ticker)
          .filter(
            (t): t is string =>
              Boolean(t) && !isNonInvestmentTicker(t) && !isFundTicker(t)
          )
      )
    ).slice(0, 10); // Cap at 10 to keep matrix readable
  }, [holdings]);

  useEffect(() => {
    if (tickers.length < 2) {
      setMatrix(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          tickers.map(async (ticker) => {
            const res = await fetch(
              `/api/yahoo?action=history&symbol=${encodeURIComponent(ticker)}&range=1y&interval=1d`,
              { cache: "no-store" }
            );
            if (!res.ok) return { ticker, closes: [] as number[] };
            const json = await res.json();
            const points: Array<{ close?: number }> =
              json?.data?.points ?? [];
            const closes = points
              .map((p) => Number(p.close))
              .filter((v) => Number.isFinite(v) && v > 0);
            return { ticker, closes };
          })
        );

        if (cancelled) return;

        const returnsMap = new Map(
          results.map(({ ticker, closes }) => [ticker, toLogReturns(closes)])
        );

        const n = tickers.length;
        const m: number[][] = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (__, j) => {
            if (i === j) return 1;
            const a = returnsMap.get(tickers[i]) ?? [];
            const b = returnsMap.get(tickers[j]) ?? [];
            return pearson(a, b);
          })
        );

        setMatrix({ tickers, matrix: m });
      } catch (err) {
        if (!cancelled) {
          console.error("[CorrelationHeatmap] fetch failed", err);
          setError("No se pudo calcular la correlación. Revisa tu conexión.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAll();
    return () => { cancelled = true; };
  }, [tickers]);

  if (tickers.length < 2) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/60 p-6 text-center text-sm text-muted">
        Necesitas al menos 2 posiciones en cartera para calcular correlaciones.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border/60 bg-surface/60">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-xs text-muted">Calculando correlaciones…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!matrix) return null;

  const shortLabel = (ticker: string) =>
    ticker.includes(":") ? ticker.split(":")[1] : ticker;

  return (
    <div className="rounded-2xl border border-border/70 bg-surface/60 p-5 backdrop-blur-xl shadow-panel">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-text">
          Correlación entre activos
        </h3>
        <p className="text-xs text-muted">
          Coeficiente de Pearson sobre retornos diarios (últimos 12 meses).{" "}
          <span className="text-emerald-400">Verde</span> = correlación positiva ·{" "}
          <span className="text-rose-400">Rojo</span> = correlación negativa.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="pb-2 pr-2 text-left font-medium text-muted/60 w-[70px]" />
              {matrix.tickers.map((t) => (
                <th
                  key={t}
                  className="pb-2 px-1 text-center font-semibold text-muted max-w-[56px] truncate overflow-hidden"
                  title={t}
                >
                  {shortLabel(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.tickers.map((rowTicker, i) => (
              <tr key={rowTicker}>
                <td className="pr-2 py-1 text-left font-semibold text-text max-w-[70px] truncate" title={rowTicker}>
                  {shortLabel(rowTicker)}
                </td>
                {matrix.matrix[i].map((r, j) => (
                  <td key={matrix.tickers[j]} className="px-1 py-1">
                    <div
                      className={cn(
                        "flex h-10 w-full min-w-[40px] items-center justify-center rounded-lg text-[11px] font-bold transition-colors",
                        i === j
                          ? "bg-primary/15 text-primary"
                          : correlationColor(r)
                      )}
                    >
                      {i === j ? "1.00" : formatR(r)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-muted/40">
        Basado en datos históricos de Yahoo Finance · Máx. 10 activos ·{" "}
        {matrix.tickers.length} posiciones mostradas
      </p>
    </div>
  );
}
