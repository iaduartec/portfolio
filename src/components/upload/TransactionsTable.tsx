"use client";

import { convertCurrency, formatCurrency } from "@/lib/formatters";
import { Transaction } from "@/types/transactions";
import { useCurrency } from "@/components/currency/CurrencyProvider";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  if (!transactions.length) {
    return (
      <p className="text-sm text-muted">
        No hay transacciones guardadas todavía. Sube un CSV y pulsa “Guardar en local”.
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
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
              <th className="px-4 py-3 font-semibold text-right">Precio</th>
              <th className="px-4 py-3 font-semibold text-right">Comision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-text">
            {transactions.map((tx, idx) => (
              <tr key={`${tx.ticker}-${tx.date}-${idx}`} className="hover:bg-surface-muted/40">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{tx.date}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{tx.ticker}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-[0.08em] text-muted">
                  {tx.type}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{tx.quantity}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {formatCurrency(
                    convertCurrency(tx.price, currency, fxRate, baseCurrency),
                    currency
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {tx.fee !== undefined
                    ? formatCurrency(
                        convertCurrency(tx.fee, currency, fxRate, baseCurrency),
                        currency
                      )
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
