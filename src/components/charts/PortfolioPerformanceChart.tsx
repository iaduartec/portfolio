"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent } from "@/lib/formatters";

type PerformancePoint = {
  label: string;
  value: number;
};

interface PortfolioPerformanceChartProps {
  data: PerformancePoint[];
}

export function PortfolioPerformanceChart({ data }: PortfolioPerformanceChartProps) {
  const chartData = useMemo(() => data, [data]);
  const latestReturn = chartData[chartData.length - 1]?.value ?? 0;
  const isPositive = latestReturn >= 0;
  const rangeStart = chartData[0]?.label ?? "";
  const rangeEnd = chartData[chartData.length - 1]?.label ?? "";
  const formatXAxisLabel = (label: string) => {
    if (!label.includes(" ")) return label;
    const parts = label.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return label;
  };
  const yDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [-1, 1];
    const values = chartData
      .map((point) => point.value)
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return [-1, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      const padding = Math.max(Math.abs(max) * 0.12, 1.5);
      return [min - padding, max + padding];
    }
    const padding = (max - min) * 0.12;
    return [min - padding, max + padding];
  }, [chartData]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-sm backdrop-blur-sm">
          <span className={isPositive ? "text-success" : "text-danger"}>
            {isPositive ? "+" : ""}
            {formatPercent(latestReturn / 100)}
          </span>
          <span className="text-muted/60 text-[10px] uppercase tracking-widest">• Rentabilidad acumulada</span>
        </div>
        <div className="text-xs text-muted/80 font-medium">
          {rangeStart && rangeEnd ? `${rangeStart} – ${rangeEnd}` : "Últimos 6 meses"}
        </div>
      </div>
      <div className="h-64 rounded-2xl border border-border bg-surface-muted/30 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
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
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={formatXAxisLabel}
            />
            <YAxis
              stroke="rgba(209,212,220,0.6)"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(value) => formatPercent(Number(value) / 100)}
              domain={yDomain}
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
              formatter={(value) => `${formatPercent(Number(value ?? 0) / 100)} rentabilidad`}
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
