"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type PerformancePoint = {
  label: string;
  value: number;
};

interface PortfolioPerformanceChartProps {
  data: PerformancePoint[];
}

export function PortfolioPerformanceChart({ data }: PortfolioPerformanceChartProps) {
  const { currency } = useCurrency();
  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const delta = last - first;
  const deltaPercent = first !== 0 ? (delta / first) * 100 : 0;
  const isPositive = delta >= 0;
  const rangeStart = data[0]?.label ?? "";
  const rangeEnd = data[data.length - 1]?.label ?? "";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-muted">Último valor</p>
          <p className="text-2xl font-semibold text-text">{formatCurrency(last, currency)}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-sm">
          <span className={isPositive ? "text-success" : "text-danger"}>
            {isPositive ? "+" : ""}
            {formatCurrency(delta, currency)}
          </span>
          <span className="text-muted">
            {isPositive ? "+" : ""}
            {formatPercent(deltaPercent / 100)}
          </span>
        </div>
        <div className="ml-auto text-xs text-muted">
          {rangeStart && rangeEnd ? `${rangeStart}–${rangeEnd}` : "Últimos 6 meses"} • Datos simulados
        </div>
      </div>
      <div className="h-64 rounded-2xl border border-border bg-surface-muted/30 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2962ff" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#2962ff" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#2962ff" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={[0, 1200]}
            tickCount={5}
          />
          <Tooltip
            cursor={{ stroke: "rgba(41,98,255,0.2)" }}
            contentStyle={{
              background: "#1b1f2a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              color: "#d1d4dc",
            }}
            formatter={(value: number) => formatCurrency(value, currency)}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#2962ff"
            strokeWidth={2}
            fill="url(#perfGradient)"
            dot={{ r: 3, strokeWidth: 2, fill: "#131722" }}
            activeDot={{ r: 5, stroke: "#2962ff", strokeWidth: 2, fill: "#131722" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
