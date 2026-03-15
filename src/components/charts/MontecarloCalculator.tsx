"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { formatCurrency, convertCurrency } from "@/lib/formatters";

function generateRandomNormal(mu: number, sigma: number) {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * sigma + mu;
}
const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-surface/95 p-3 shadow-panel backdrop-blur-md">
        <p className="mb-2 text-sm font-semibold text-white">{label}</p>
        <div className="flex flex-col gap-1 text-xs">
          <span style={{ color: "rgba(72,213,151,1)" }}>90º Perc: {formatCurrency(payload[4].value, currency)}</span>
          <span style={{ color: "rgba(59,194,255,1)" }}>75º Perc: {formatCurrency(payload[3].value, currency)}</span>
          <span className="font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>Mediana: {formatCurrency(payload[2].value, currency)}</span>
          <span style={{ color: "rgba(244,114,182,1)" }}>25º Perc: {formatCurrency(payload[1].value, currency)}</span>
          <span style={{ color: "rgba(239,68,68,1)" }}>10º Perc: {formatCurrency(payload[0].value, currency)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MontecarloCalculator() {
  const { summary, holdings } = usePortfolioData();
  const { currency, baseCurrency, fxRate } = useCurrency();
  const [years, setYears] = useState(10);
  const [scenarios] = useState(100);

  // ... (useMemos) ...

  const initialAmount = useMemo(() => {
    return convertCurrency(summary.totalValue, baseCurrency, fxRate, baseCurrency);
  }, [summary.totalValue, baseCurrency, fxRate]);

  const { expectedReturn, expectedVolatility } = useMemo(() => {
    if (initialAmount <= 0) return { expectedReturn: 0.08, expectedVolatility: 0.15 };
    const pnlPercent = summary.totalPnl / (summary.totalValue - summary.totalPnl);
    
    const expectedYield = Math.min(Math.max(0.04, pnlPercent / 3 + 0.05), 0.15);
    const expectedVol = holdings.length > 5 ? 0.18 : 0.25;

    return { expectedReturn: expectedYield, expectedVolatility: expectedVol };
  }, [summary, holdings, initialAmount]);

  const projectionData = useMemo(() => {
    if (initialAmount <= 0) return [];
    
    const paths: number[][] = Array.from({ length: scenarios }, () => [initialAmount]);

    for (let pathIdx = 0; pathIdx < scenarios; pathIdx++) {
      let currentVal = initialAmount;
      for (let y = 1; y <= years; y++) {
        const drift = expectedReturn - (Math.pow(expectedVolatility, 2) / 2);
        const shock = expectedVolatility * generateRandomNormal(0, 1);
        currentVal = currentVal * Math.exp(drift + shock);
        paths[pathIdx].push(currentVal);
      }
    }

    const dataByYear = Array.from({ length: years + 1 }, (_, year) => {
      const valsAtYear = paths.map((p) => p[year]).sort((a, b) => a - b);
      return {
        year: year === 0 ? "Hoy" : `Año ${year}`,
        p10: valsAtYear[Math.floor(scenarios * 0.10)],
        p25: valsAtYear[Math.floor(scenarios * 0.25)],
        p50: valsAtYear[Math.floor(scenarios * 0.50)], // Median
        p75: valsAtYear[Math.floor(scenarios * 0.75)],
        p90: valsAtYear[Math.floor(scenarios * 0.90)],
      };
    });

    return dataByYear;
  }, [initialAmount, expectedReturn, expectedVolatility, years, scenarios]);

  if (initialAmount <= 0) return null;

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Simulador Montecarlo</h3>
          <p className="text-xs text-muted">
            Proyección del valor futuro bajo {scenarios} escenarios estocásticos.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto rounded-lg border border-border/70 bg-background/50 p-1 md:mt-0">
          {[1, 3, 5, 10, 20].map((y) => (
            <button
              key={y}
              onClick={() => setYears(y)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                years === y
                  ? "bg-accent text-background shadow-md shadow-accent/20"
                  : "text-muted hover:text-white"
              }`}
            >
              {y} años
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-surface-muted/30 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Mu (Retorno Esp.)</p>
          <p className="mt-1 text-sm font-semibold text-success">{(expectedReturn * 100).toFixed(1)}% / año</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface-muted/30 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Sigma (Volatilidad)</p>
          <p className="mt-1 text-sm font-semibold text-danger">{(expectedVolatility * 100).toFixed(1)}% / año</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface-muted/30 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Valor Inicial</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(convertCurrency(initialAmount, baseCurrency, fxRate, currency), currency)}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface-muted/30 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Mediana a {years} años</p>
          <p className="mt-1 text-sm font-semibold text-accent">
            {projectionData.length > 0 ? formatCurrency(convertCurrency(projectionData[projectionData.length - 1].p50, baseCurrency, fxRate, currency), currency) : "-"}
          </p>
        </div>
      </div>

      <div className="h-[350px] w-full rounded-2xl border border-border bg-surface-muted/30 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="rgba(209,212,220,0.5)"
              tick={{ fontSize: 11, fill: "rgba(209,212,220,0.7)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="rgba(209,212,220,0.5)"
              tick={{ fontSize: 11, fill: "rgba(209,212,220,0.7)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(Number(v), currency).replace(/\.00$/, '')}
            />
            <Tooltip content={(props: any) => <CustomTooltip {...props} currency={currency} />} />
            
            <Line type="monotone" dataKey="p10" stroke="rgba(239,68,68,0.5)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="p25" stroke="rgba(244,114,182,0.6)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="p50" stroke="rgba(255,255,255,0.9)" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="p75" stroke="rgba(59,194,255,0.6)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="p90" stroke="rgba(72,213,151,0.5)" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
