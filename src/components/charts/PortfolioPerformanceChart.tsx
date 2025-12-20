import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/formatters";

type PerformancePoint = {
  label: string;
  value: number;
};

interface PortfolioPerformanceChartProps {
  data: PerformancePoint[];
}

export function PortfolioPerformanceChart({ data }: PortfolioPerformanceChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            tickFormatter={(value) => formatCurrency(Number(value))}
          />
          <Tooltip
            cursor={{ stroke: "rgba(41,98,255,0.2)" }}
            contentStyle={{
              background: "#1b1f2a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              color: "#d1d4dc",
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2962ff"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
