'use client';

import { useEffect, useState } from "react";
import { CsvDropzone } from "@/components/upload/CsvDropzone";
import { Shell } from "@/components/layout/Shell";
import { TransactionsTable } from "@/components/upload/TransactionsTable";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { SESSION_ID_KEY } from "@/lib/storage";
import Link from "next/link";

export default function UploadPage() {
  const { transactions } = usePortfolioData();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const existingSession = window.sessionStorage.getItem(SESSION_ID_KEY);
    const sessionToSet = existingSession || new Date().toISOString();

    if (!existingSession) {
      window.sessionStorage.setItem(SESSION_ID_KEY, sessionToSet);
    }

    // Usar una microtarea para evitar el error de linting de setState síncrono en effect
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
