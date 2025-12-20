'use client';

import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/Card";
import { usePortfolioData } from "@/hooks/usePortfolioData";

export default function PortfolioPage() {
  const { holdings, hasTransactions } = usePortfolioData();

  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Portafolio</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Participaciones</h1>
        <p className="max-w-3xl text-sm text-muted">
          Detalle de holdings con esquema de TradingView. Calculado a partir de las transacciones cargadas.
        </p>
      </div>
      <Card
        title="Participaciones"
        subtitle={hasTransactions ? "Datos calculados desde tus transacciones" : "Carga un CSV para ver tus participaciones"}
      >
        {holdings.length ? (
          <HoldingsTable holdings={holdings} />
        ) : (
          <p className="text-sm text-muted">No hay participaciones calculadas todavía.</p>
        )}
      </Card>
    </Shell>
  );
}
