"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { convertCurrency, formatCurrency } from "@/lib/formatters";

type IncomePoint = {
  label: string;
  value: number;
};

interface PortfolioMonthlyIncomeChartProps {
  data: IncomePoint[];
}

export function PortfolioMonthlyIncomeChart({ data }: PortfolioMonthlyIncomeChartProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        displayValue: convertCurrency(point.value, currency, fxRate, baseCurrency),
      })),
    [data, currency, fxRate, baseCurrency]
  );

  const totalResult = chartData.reduce((sum, point) => sum + point.displayValue, 0);
  const bestMonth = chartData.reduce<IncomePoint & { displayValue: number } | null>((best, point) => {
    if (!best || point.displayValue > best.displayValue) return point;
    return best;
  }, null);
  const worstMonth = chartData.reduce<IncomePoint & { displayValue: number } | null>((worst, point) => {
    if (!worst || point.displayValue < worst.displayValue) return point;
    return worst;
  }, null);
  const totalToneClass =
    totalResult >= 0
      ? "border-success/25 bg-success/10 text-success"
      : "border-danger/25 bg-danger/10 text-danger";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className={`rounded-full border px-3 py-1 text-sm ${totalToneClass}`}>
          {formatCurrency(totalResult, currency)} acumulado
        </div>
        <div className="text-right text-xs text-muted">
          <p>Resultado mensual</p>
          <p className="mt-1 text-text">
            Mejor mes: {bestMonth ? `${bestMonth.label} · ${formatCurrency(bestMonth.displayValue, currency)}` : "N/D"}
          </p>
          <p className="mt-1 text-text">
            Peor mes: {worstMonth ? `${worstMonth.label} · ${formatCurrency(worstMonth.displayValue, currency)}` : "N/D"}
          </p>
        </div>
      </div>
      <div className="h-64 rounded-2xl border border-border bg-surface-muted/30 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <ReferenceLine y={0} stroke="rgba(209,212,220,0.18)" />
            <XAxis
              dataKey="label"
              stroke="rgba(209,212,220,0.6)"
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis
              stroke="rgba(209,212,220,0.6)"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(value) => formatCurrency(Number(value), currency)}
              width={80}
            />
            <Tooltip
              cursor={{ fill: "rgba(72,213,151,0.08)" }}
              contentStyle={{
                background: "#1b1f2a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#d1d4dc",
              }}
              formatter={(value: number) => formatCurrency(value, currency)}
            />
            <Bar dataKey="displayValue" radius={[8, 8, 0, 0]} maxBarSize={42}>
              {chartData.map((point) => (
                <Cell
                  key={point.label}
                  fill={point.displayValue >= 0 ? "#48d597" : "#f87171"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
