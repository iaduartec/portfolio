'use client';

import { useEffect, useState } from "react";
import { CsvDropzone } from "@/components/upload/CsvDropzone";
import { Shell } from "@/components/layout/Shell";
import { TransactionsTable } from "@/components/upload/TransactionsTable";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { SESSION_ID_KEY } from "@/lib/storage";
import Link from "next/link";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

const CSV_COLUMNS = [
  { name: "date", description: "Fecha de la operación", example: "2024-03-15", required: true },
  { name: "type", description: "Tipo: BUY, SELL, DIVIDEND, FEE, OTHER", example: "BUY", required: true },
  { name: "ticker", description: "Símbolo del activo (p.ej. MERCADO:SIMBOLO)", example: "BME:REP", required: false },
  { name: "quantity", description: "Número de acciones o participaciones", example: "10", required: false },
  { name: "price", description: "Precio por acción en la moneda del activo", example: "14.32", required: false },
  { name: "grossAmount", description: "Importe bruto total (alternativa a qty×price)", example: "143.20", required: false },
  { name: "currency", description: "Moneda: EUR o USD", example: "EUR", required: false },
  { name: "fee", description: "Comisión de la operación", example: "1.50", required: false },
  { name: "fxRate", description: "Tipo de cambio EUR/USD en la fecha", example: "1.085", required: false },
  { name: "account", description: "Cuenta: BROKERAGE o ROBO_ADVISOR", example: "BROKERAGE", required: false },
  { name: "name", description: "Nombre del activo (opcional, solo descriptivo)", example: "Repsol SA", required: false },
];

function CsvFormatGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <FileText size={14} className="shrink-0 text-accent" />
          <span className="text-sm font-medium text-text">Formato de CSV esperado</span>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Guía
          </span>
        </div>
        {open ? (
          <ChevronUp size={14} className="shrink-0 text-muted" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-muted" />
        )}
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-muted">
            La primera fila debe ser la cabecera con los nombres de columna. El separador puede ser coma{" "}
            <code className="rounded bg-surface-muted/60 px-1 text-[11px]">,</code> o punto y coma{" "}
            <code className="rounded bg-surface-muted/60 px-1 text-[11px]">;</code>.
          </p>

          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-surface-muted/40">
                  <th className="px-3 py-2 text-left font-semibold text-text">Columna</th>
                  <th className="px-3 py-2 text-left font-semibold text-text">Descripción</th>
                  <th className="px-3 py-2 text-left font-semibold text-text">Ejemplo</th>
                  <th className="px-3 py-2 text-center font-semibold text-text">Req.</th>
                </tr>
              </thead>
              <tbody>
                {CSV_COLUMNS.map((col, i) => (
                  <tr
                    key={col.name}
                    className={i % 2 === 0 ? "bg-surface/20" : "bg-surface-muted/10"}
                  >
                    <td className="px-3 py-2 font-mono font-semibold text-primary">
                      {col.name}
                    </td>
                    <td className="px-3 py-2 text-muted">{col.description}</td>
                    <td className="px-3 py-2 font-mono text-text/80">{col.example}</td>
                    <td className="px-3 py-2 text-center">
                      {col.required ? (
                        <span className="text-success font-bold">✓</span>
                      ) : (
                        <span className="text-muted/40">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-lg border border-border/50 bg-surface-muted/20 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Ejemplo de fila
            </p>
            <code className="block overflow-x-auto whitespace-nowrap text-[11px] text-text/80">
              2024-03-15,BUY,BME:REP,10,14.32,143.20,EUR,1.50,1.085,BROKERAGE,Repsol SA
            </code>
          </div>

          <p className="mt-2 text-[10px] text-muted/50">
            Las columnas no requeridas se pueden omitir o dejar vacías.{" "}
            <code className="text-[10px]">date</code> y <code className="text-[10px]">type</code> son siempre obligatorias.
          </p>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const { transactions } = usePortfolioData();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const existingSession = window.sessionStorage.getItem(SESSION_ID_KEY);
    const sessionToSet = existingSession || new Date().toISOString();

    if (!existingSession) {
      window.sessionStorage.setItem(SESSION_ID_KEY, sessionToSet);
    }

    Promise.resolve().then(() => {
      setSessionId(sessionToSet);
    });
  }, []);

  const handleSave = () => {
    const sid = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (sid) setSessionId(sid);
  };

  return (
    <Shell className="gap-8">
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Datos</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-text">Importar movimientos de cartera</h1>
        <p className="max-w-3xl text-sm text-muted">
          Flujo recomendado: 1) subir CSV, 2) validar tickers/mercados, 3) combinar datos. Cada carga se integra con tu sesión local.
        </p>
        {sessionId && (
          <p className="text-xs text-muted">
            Sesión actual: <span className="font-semibold text-text">{sessionId}</span>
          </p>
        )}
        <div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-surface-muted/30 px-3 py-1.5 text-xs font-semibold text-text transition-colors duration-200 hover:border-accent/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65"
          >
            Ver impacto en Portfolio
          </Link>
        </div>
      </section>

      <CsvFormatGuide />

      <CsvDropzone onSave={handleSave} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.08em] text-muted">Transacciones guardadas</p>
          <p className="text-xs text-muted">
            Total: <span className="font-semibold text-text">{transactions.length}</span>
          </p>
        </div>
        <TransactionsTable transactions={transactions} />
      </section>
    </Shell>
  );
}
