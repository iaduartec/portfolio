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
import type { Holding } from "@/types/portfolio";
import type { Transaction } from "@/types/transactions";

interface PortfolioDividendsChartProps {
  transactions: Transaction[];
  holdings: Holding[];
  range?: "all" | "1m" | "3m" | "6m" | "ytd" | "1y";
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function PortfolioDividendsChart({ transactions, holdings, range }: PortfolioDividendsChartProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();

  // Total invested across all current holdings
  const totalInvested = useMemo(() => {
    return holdings.reduce((sum, h) => {
      // Calculate basis for this holding
      const costBasis = h.totalQuantity * h.averageBuyPrice;
      const converted = convertCurrency(costBasis, h.currency || baseCurrency, fxRate, baseCurrency);
      return sum + converted;
    }, 0);
  }, [holdings, baseCurrency, fxRate]);

  // Aggregate dividends by month
  const { chartData, totalDividends } = useMemo(() => {
    const divs = transactions.filter((tx) => tx.type === "DIVIDEND");
    
    let total = 0;
    const monthlyData = new Map<string, number>();

    // Determine how many months to show based on range
    const now = new Date();
    let monthCount = 12; // Default to 12m
    if (range === "1m") monthCount = 2; // Show 2 periods for comparison even in 1m?
    if (range === "3m") monthCount = 3;
    if (range === "6m") monthCount = 6;
    if (range === "1y") monthCount = 12;
    if (range === "ytd") monthCount = now.getMonth() + 1;
    if (range === "all") monthCount = 12; // Let's keep 12 for now or increase if needed

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData.set(key, 0);
    }

    divs.forEach((tx) => {
      if (!tx.date) return;
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData.has(key)) {
        const gross = Number.isFinite(tx.grossAmount) && (tx.grossAmount ?? 0) !== 0
          ? Math.abs(tx.grossAmount ?? 0)
          : (Number.isFinite(tx.quantity) && Number.isFinite(tx.price) ? tx.quantity * tx.price : 0);
        
        const converted = convertCurrency(gross, tx.currency || baseCurrency, fxRate, baseCurrency);
        monthlyData.set(key, (monthlyData.get(key) || 0) + converted);
        total += converted;
      }
    });

    const data = Array.from(monthlyData.entries()).map(([key, value]) => {
      const [year, month] = key.split("-");
      return {
        label: `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year.slice(2)}`,
        value,
      };
    });

    return { chartData: data, totalDividends: total };
  }, [transactions, baseCurrency, fxRate, range]);

  // Current display total
  const displayTotal = convertCurrency(totalDividends, currency, fxRate, baseCurrency);
  const displayInvested = convertCurrency(totalInvested, currency, fxRate, baseCurrency);
  
  // Yield on Cost (Annualized approximation based on LTM dividends)
  const yieldOnCost = displayInvested > 0 ? (displayTotal / displayInvested) * 100 : 0;

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <div className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary">
            {formatCurrency(displayTotal, currency)} cobrados ({range === "all" ? "Histórico" : range})
          </div>
          <div className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-sm text-success">
            {yieldOnCost.toFixed(2)}% Yield on Cost
          </div>
        </div>
      </div>
      <div className="h-64 rounded-2xl border border-white/5 bg-gradient-to-br from-surface-muted/20 to-surface/40 p-4 transition-all hover:border-white/10">
        <ResponsiveContainer width="100%" height="100%">
            <defs>
              <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3bc2ff" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#2962ff" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <BarChart data={chartData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(209,212,220,0.4)"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                dy={10}
              />
              <YAxis
                stroke="rgba(209,212,220,0.4)"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
                width={65}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }}
                contentStyle={{
                  background: "rgba(16, 24, 41, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(16px)",
                  padding: "12px 16px",
                }}
                itemStyle={{ color: "#3bc2ff", fontSize: "12px", fontWeight: "bold" }}
                labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", marginBottom: "6px", fontWeight: "bold", textTransform: "uppercase" }}
                formatter={(value: any) => [formatCurrency(Number(value), currency), "DIVIDENDOS"]}
              />
              <Bar 
                dataKey="value" 
                fill="url(#dividendGradient)" 
                radius={[6, 6, 2, 2]} 
                maxBarSize={32}
                className="transition-all duration-300 hover:brightness-110"
              />
            </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
