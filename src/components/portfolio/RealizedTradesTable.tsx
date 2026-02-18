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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface card-glow">
      <div className="overflow-x-auto">
        <table className="w-full table-auto divide-y divide-border/70 text-left text-sm">
          <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Fecha</th>
              <th className="px-3 py-2.5 font-semibold">Activo</th>
              <th className="px-3 py-2.5 font-semibold text-right">Cantidad</th>
              <th className="px-3 py-2.5 font-semibold text-right">Entrada</th>
              <th className="px-3 py-2.5 font-semibold text-right">Salida</th>
              <th className="px-3 py-2.5 font-semibold text-right">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-text">
            {trades.map((trade) => {
              const isPositive = trade.pnlValue >= 0;
              return (
                <tr key={trade.id} className="hover:bg-surface-muted/40">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                    {formatTradeDate(trade.date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text">{trade.name || trade.ticker}</span>
                      {trade.name && <span className="text-xs text-muted">{trade.ticker}</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">{trade.quantity}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {formatCurrency(
                      convertCurrency(trade.entryPrice, currency, fxRate, baseCurrency),
                      currency
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {formatCurrency(
                      convertCurrency(trade.exitPrice, currency, fxRate, baseCurrency),
                      currency
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
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
