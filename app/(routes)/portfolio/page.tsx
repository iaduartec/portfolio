import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { Shell } from "@/components/layout/Shell";
import { Card } from "@/components/ui/Card";
import { Holding } from "@/types/portfolio";

const placeholderHoldings: Holding[] = [
  {
    ticker: "AAPL",
    totalQuantity: 120,
    averageBuyPrice: 148.23,
    currentPrice: 172.1,
    marketValue: 20652,
    pnlValue: 2870,
    pnlPercent: 16.15,
  },
  {
    ticker: "MSFT",
    totalQuantity: 60,
    averageBuyPrice: 280.1,
    currentPrice: 331.4,
    marketValue: 19884,
    pnlValue: 3084,
    pnlPercent: 18.35,
  },
  {
    ticker: "NVDA",
    totalQuantity: 20,
    averageBuyPrice: 610.5,
    currentPrice: 825.3,
    marketValue: 16506,
    pnlValue: 4296,
    pnlPercent: 35.2,
  },
];

export default function PortfolioPage() {
  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Portafolio</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Participaciones</h1>
        <p className="max-w-3xl text-sm text-muted">
          Detalle de holdings con esquema de TradingView. Aquí se integrarán lightweight-charts y cálculos de precio promedio (FIFO/ponderado).
        </p>
      </div>
      <Card title="Participaciones" subtitle="Ordena por símbolo, precio o P&L">
        <HoldingsTable holdings={placeholderHoldings} />
      </Card>
    </Shell>
  );
}
