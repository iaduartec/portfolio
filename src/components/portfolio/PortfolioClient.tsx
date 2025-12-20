"use client";

import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { RealizedTradesTable } from "@/components/portfolio/RealizedTradesTable";
import { Card } from "@/components/ui/Card";
import { usePortfolioData } from "@/hooks/usePortfolioData";

export function PortfolioClient() {
  const { holdings, realizedTrades } = usePortfolioData();

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Portafolio</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Participaciones</h1>
        <p className="max-w-3xl text-sm text-muted">
          Detalle de holdings y ventas cerradas calculadas desde tu CSV.
        </p>
      </div>
      <Card title="Participaciones" subtitle="Solo posiciones abiertas">
        {holdings.length ? (
          <HoldingsTable holdings={holdings} />
        ) : (
          <p className="text-sm text-muted">No hay posiciones abiertas todavia.</p>
        )}
      </Card>
      <Card title="Ventas cerradas" subtitle="Entradas, salidas y P&amp;L realizado">
        <RealizedTradesTable trades={realizedTrades} />
      </Card>
    </>
  );
}
