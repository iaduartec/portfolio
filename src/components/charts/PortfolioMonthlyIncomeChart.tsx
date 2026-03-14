"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

  const totalIncome = chartData.reduce((sum, point) => sum + point.displayValue, 0);
  const bestMonth = chartData.reduce<IncomePoint & { displayValue: number } | null>((best, point) => {
    if (!best || point.displayValue > best.displayValue) return point;
    return best;
  }, null);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-sm text-success">
          {formatCurrency(totalIncome, currency)} cobrados
        </div>
        <div className="text-right text-xs text-muted">
          <p>Ingreso mensual</p>
          <p className="mt-1 text-text">
            Mejor mes: {bestMonth ? `${bestMonth.label} · ${formatCurrency(bestMonth.displayValue, currency)}` : "N/D"}
          </p>
        </div>
      </div>
      <div className="h-64 rounded-2xl border border-border bg-surface-muted/30 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
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
            <Bar dataKey="displayValue" fill="#48d597" radius={[8, 8, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
