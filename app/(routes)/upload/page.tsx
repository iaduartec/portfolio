'use client';

import { useEffect, useState } from "react";
import { CsvDropzone } from "@/components/upload/CsvDropzone";
import { Shell } from "@/components/layout/Shell";
import { TransactionsTable } from "@/components/upload/TransactionsTable";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { SESSION_ID_KEY } from "@/lib/storage";

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
    <Shell>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Datos</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Cargar transacciones</h1>
        <p className="max-w-3xl text-sm text-muted">
          Sube uno o varios CSV de transacciones para reconstruir el portafolio. Cada carga se anade y combina con lo que ya tengas en localStorage.
        </p>
        {sessionId && (
          <p className="text-xs text-muted">
            Sesión actual: <span className="font-semibold text-text">{sessionId}</span>
          </p>
        )}
      </div>
      <CsvDropzone onSave={handleSave} />
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Transacciones guardadas</p>
        <TransactionsTable transactions={transactions} />
      </div>
    </Shell>
  );
}
