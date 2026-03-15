"use client";

import { convertCurrencyFrom, formatCurrency, inferCurrencyFromTicker } from "@/lib/formatters";
import { Transaction } from "@/types/transactions";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { EmptyState } from "@/components/ui/empty-state";
import { TableShell } from "@/components/ui/table-shell";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();
  if (!transactions.length) {
    return (
      <EmptyState
        title="No hay transacciones guardadas"
        description="Sube un CSV, revisa la vista previa y guarda los movimientos para empezar a construir el portfolio."
        className="min-h-[220px]"
      />
    );
  }

  return (
    <TableShell
      title="Movimientos cargados"
      subtitle="Resumen local de la sesión importada, listo para consolidarse en la cartera."
      className="card-glow"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/70 text-left text-sm">
          <thead className="bg-surface-muted/60 text-xs uppercase tracking-[0.08em] text-text-tertiary">
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
              <tr key={`${tx.ticker}-${tx.date}-${idx}`} className="hover:bg-surface-muted/35">
                <td className="whitespace-nowrap px-4 py-3 text-text-tertiary">{tx.date}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-text">{tx.ticker}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-[0.08em] text-text-tertiary">
                  {tx.type}
                </td>
                <td className="financial-value whitespace-nowrap px-4 py-3 text-right text-text">{tx.quantity}</td>
                <td className="financial-value whitespace-nowrap px-4 py-3 text-right text-text">
                  {formatCurrency(
                    convertCurrencyFrom(
                      tx.price,
                      tx.currency ?? inferCurrencyFromTicker(tx.ticker),
                      currency,
                      fxRate,
                      baseCurrency
                    ),
                    currency
                  )}
                </td>
                <td className="financial-value whitespace-nowrap px-4 py-3 text-right text-text">
                  {tx.fee !== undefined
                    ? formatCurrency(
                        convertCurrencyFrom(
                          tx.fee,
                          tx.currency ?? inferCurrencyFromTicker(tx.ticker),
                          currency,
                          fxRate,
                          baseCurrency
                        ),
                        currency
                      )
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableShell>
  );
}
