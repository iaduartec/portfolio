'use client';

import { RealizedTrade } from "@/types/portfolio";
import { formatCurrency, formatTradeDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { TableShell } from "@/components/ui/table-shell";

interface RealizedTradesTableProps {
  trades: RealizedTrade[];
  isPrivate?: boolean;
}

const quantityFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 4,
});

export function RealizedTradesTable({ trades, isPrivate = false }: RealizedTradesTableProps) {
  const { currency } = useCurrency();

  const maskValue = (value: string) => (isPrivate ? "••••••" : value);

  const buildPostSaleRead = (trade: RealizedTrade) => {
    if (!trade.postSaleOutcome) return null;

    if (trade.postSaleOutcome === "MISSED_GAIN") {
      return {
        tone: "danger" as const,
        label: `Perdida de ${maskValue(formatCurrency(
          trade.postSalePnlValue || 0,
          currency
        ))}`,
      };
    }

    if (trade.postSaleOutcome === "AVOIDED_LOSS") {
      return {
        tone: "success" as const,
        label: `Evitada pérdida de ${maskValue(formatCurrency(
          Math.abs(trade.postSalePnlValue || 0),
          currency
        ))}`,
      };
    }

    return {
      tone: "default" as const,
      label: "Movimiento plano tras la venta",
    };
  };

  return (
    <TableShell>
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full table-auto divide-y divide-border/70 text-left text-sm">
          <thead className="bg-surface-muted/70 text-xs uppercase tracking-[0.08em] text-text-tertiary">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Fecha</th>
              <th className="px-4 py-3.5 font-semibold">Activo</th>
              <th className="px-4 py-3.5 font-semibold text-right">Cantidad</th>
              <th className="px-4 py-3.5 font-semibold text-right">Entrada</th>
              <th className="px-4 py-3.5 font-semibold text-right">Salida</th>
              <th className="px-4 py-3.5 font-semibold text-right">P&L</th>
              <th className="px-4 py-3.5 font-semibold text-right">Análisis Post-Venta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-text">
            {trades.map((trade) => {
              const isPositive = trade.pnlValue >= 0;
              const postSaleRead = buildPostSaleRead(trade);
              
              return (
                <tr key={trade.id} className="transition-colors hover:bg-surface-muted/35">
                  <td className="whitespace-nowrap px-4 py-3.5 text-text-tertiary font-mono text-xs">
                    {formatTradeDate(trade.date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text">{trade.name || trade.ticker}</span>
                      <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{trade.ticker}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium">
                    {maskValue(quantityFormatter.format(trade.quantity))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold text-muted">
                        {maskValue(formatCurrency(trade.entryPrice, currency))}
                      </span>
                      {trade.entryPriceRaw !== undefined && trade.currency !== currency && (
                        <span className="text-[10px] text-muted/40 font-mono">
                          {maskValue(formatCurrency(trade.entryPriceRaw, trade.currency))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold text-text">
                        {maskValue(formatCurrency(trade.exitPrice, currency))}
                      </span>
                      {trade.exitPriceRaw !== undefined && trade.currency !== currency && (
                        <span className="text-[10px] text-muted/40 font-mono">
                          {maskValue(formatCurrency(trade.exitPriceRaw, trade.currency))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge tone={isPositive ? "success" : "danger"}>
                        {maskValue(formatCurrency(trade.pnlValue, currency))}
                      </Badge>
                      {trade.pnlValueRaw !== undefined && trade.currency !== currency && (
                        <span className="text-[10px] text-muted/40 font-mono">
                          {maskValue(formatCurrency(trade.pnlValueRaw, trade.currency))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {postSaleRead ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge tone={postSaleRead.tone}>{postSaleRead.label}</Badge>
                        {trade.currentPrice !== undefined && (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted/50 leading-tight">
                              Actual: {maskValue(formatCurrency(trade.currentPrice, currency))}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs italic text-text-tertiary">Sin cotización actual</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TableShell>
  );
}
