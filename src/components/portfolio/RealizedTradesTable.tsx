"use client";

import { Badge } from "@/components/ui/badge";
import { convertCurrency, formatCurrency } from "@/lib/formatters";
import { RealizedTrade } from "@/types/portfolio";
import { useCurrency } from "@/components/currency/CurrencyProvider";

interface RealizedTradesTableProps {
  trades: RealizedTrade[];
}

export function RealizedTradesTable({ trades }: RealizedTradesTableProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  if (!trades.length) {
    return (
      <p className="text-sm text-muted">
        No hay ventas cerradas todavia. Cuando vendas, aqui veras la ganancia o perdida.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface card-glow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/70 text-left text-sm">
          <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Ticker</th>
              <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
              <th className="px-4 py-3 font-semibold text-right">Entrada</th>
              <th className="px-4 py-3 font-semibold text-right">Salida</th>
              <th className="px-4 py-3 font-semibold text-right">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-text">
            {trades.map((trade) => {
              const isPositive = trade.pnlValue >= 0;
              return (
                <tr key={trade.id} className="hover:bg-surface-muted/40">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{trade.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{trade.ticker}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{trade.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatCurrency(
                      convertCurrency(trade.entryPrice, currency, fxRate, baseCurrency),
                      currency
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatCurrency(
                      convertCurrency(trade.exitPrice, currency, fxRate, baseCurrency),
                      currency
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Badge tone={isPositive ? "success" : "danger"}>
                      {formatCurrency(
                        convertCurrency(trade.pnlValue, currency, fxRate, baseCurrency),
                        currency
                      )}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
