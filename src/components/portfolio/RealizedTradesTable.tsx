"use client";

import { Badge } from "@/components/ui/badge";
import { convertCurrency, formatCurrency } from "@/lib/formatters";
import { RealizedTrade } from "@/types/portfolio";
import { useCurrency } from "@/components/currency/CurrencyProvider";

interface RealizedTradesTableProps {
  trades: RealizedTrade[];
}

const tradeDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});
const quantityFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const buildLocalDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export function RealizedTradesTable({ trades }: RealizedTradesTableProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  if (!trades.length) {
    return (
      <p className="text-sm text-muted">
        No hay ventas cerradas todavia. Cuando vendas, aqui veras la ganancia o perdida.
      </p>
    );
  }

  const formatTradeDate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "—";

    const isoMatch = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
      const [, yearRaw, monthRaw, dayRaw] = isoMatch;
      const date = buildLocalDate(
        Number(yearRaw),
        Number(monthRaw),
        Number(dayRaw)
      );
      if (date) return tradeDateFormatter.format(date);
    }

    const dmyMatch = trimmed.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    if (dmyMatch) {
      const [, dayRaw, monthRaw, yearRaw] = dmyMatch;
      const parsedYear = Number(yearRaw);
      const year = yearRaw.length === 2 ? 2000 + parsedYear : parsedYear;
      const date = buildLocalDate(year, Number(monthRaw), Number(dayRaw));
      if (date) return tradeDateFormatter.format(date);
    }

    const timestamp = Date.parse(trimmed);
    if (Number.isFinite(timestamp)) {
      return tradeDateFormatter.format(new Date(timestamp));
    }

    return trimmed;
  };

  const buildPostSaleRead = (trade: RealizedTrade) => {
    if (trade.postSalePnlValue === undefined || trade.postSaleOutcome === undefined) {
      return null;
    }

    if (trade.postSaleOutcome === "MISSED_GAIN") {
      return {
        tone: "warning" as const,
        label: `Dejaste de ganar ${formatCurrency(
          convertCurrency(trade.postSalePnlValue, currency, fxRate, baseCurrency),
          currency
        )}`,
      };
    }

    if (trade.postSaleOutcome === "AVOIDED_LOSS") {
      return {
        tone: "success" as const,
        label: `Evitaste perder ${formatCurrency(
          convertCurrency(Math.abs(trade.postSalePnlValue), currency, fxRate, baseCurrency),
          currency
        )}`,
      };
    }

    return {
      tone: "default" as const,
      label: "Movimiento plano tras la venta",
    };
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/75 bg-gradient-to-b from-surface-muted/30 to-surface/90 shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full table-auto divide-y divide-border/70 text-left text-sm">
          <thead className="bg-surface-muted/70 text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 font-semibold">Activo</th>
              <th className="px-3 py-3 font-semibold text-right">Cantidad</th>
              <th className="px-3 py-3 font-semibold text-right">Entrada</th>
              <th className="px-3 py-3 font-semibold text-right">Salida</th>
              <th className="px-3 py-3 font-semibold text-right">P&amp;L</th>
              <th className="px-3 py-3 font-semibold text-right">Después de vender</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-text">
            {trades.map((trade) => {
              const isPositive = trade.pnlValue >= 0;
              const postSaleRead = buildPostSaleRead(trade);
              return (
                <tr key={trade.id} className="transition-colors hover:bg-surface-muted/40">
                  <td className="whitespace-nowrap px-3 py-3 text-muted">
                    {formatTradeDate(trade.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text">{trade.name || trade.ticker}</span>
                      {trade.name && <span className="text-xs text-muted">{trade.ticker}</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {quantityFormatter.format(trade.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {formatCurrency(
                      convertCurrency(trade.entryPrice, currency, fxRate, baseCurrency),
                      currency
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {formatCurrency(
                      convertCurrency(trade.exitPrice, currency, fxRate, baseCurrency),
                      currency
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <Badge tone={isPositive ? "success" : "danger"}>
                      {formatCurrency(
                        convertCurrency(trade.pnlValue, currency, fxRate, baseCurrency),
                        currency
                      )}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {postSaleRead ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={postSaleRead.tone}>{postSaleRead.label}</Badge>
                        {trade.currentPrice !== undefined && (
                          <span className="text-[11px] text-muted">
                            Ahora cotiza en{" "}
                            {formatCurrency(
                              convertCurrency(trade.currentPrice, currency, fxRate, baseCurrency),
                              currency
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Sin referencia actual</span>
                    )}
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
