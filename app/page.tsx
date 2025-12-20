import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Shell } from "@/components/layout/Shell";
import { formatPercent } from "@/lib/formatters";
import { Holding, PortfolioSummary } from "@/types/portfolio";

const summary: PortfolioSummary = {
  totalValue: 68450,
  dailyPnl: 420,
  totalPnl: 8850,
};

const mockHoldings: Holding[] = [
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
  {
    ticker: "TSLA",
    totalQuantity: 35,
    averageBuyPrice: 210.4,
    currentPrice: 186.2,
    marketValue: 6517,
    pnlValue: -846,
    pnlPercent: -11.5,
  },
  {
    ticker: "AMZN",
    totalQuantity: 45,
    averageBuyPrice: 123.3,
    currentPrice: 158.9,
    marketValue: 7150.5,
    pnlValue: 1608,
    pnlPercent: 29.3,
  },
];

export default function Home() {
  const dailyPnlPercent = (summary.dailyPnl / summary.totalValue) * 100;
  const totalPnlPercent = (summary.totalPnl / (summary.totalValue - summary.totalPnl)) * 100;
  const allocation = [
    { label: "Tecnología", value: 62 },
    { label: "Consumo", value: 18 },
    { label: "Energía", value: 12 },
    { label: "Salud", value: 8 },
  ];

  return (
    <Shell>
      <section className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-muted">Panel</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">Portafolio</h1>
        <p className="max-w-3xl text-sm text-muted">
          Vista inspirada en TradingView: KPIs arriba, tabla de participaciones, y placeholders para gráficos de velas y allocation.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Valor total" value={summary.totalValue} change={summary.totalPnl} />
        <StatCard
          label="P&L diario"
          value={summary.dailyPnl}
          change={dailyPnlPercent}
          changeVariant="percent"
        />
        <StatCard
          label="P&L total"
          value={summary.totalPnl}
          change={totalPnlPercent}
          changeVariant="percent"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Participaciones" subtitle="Tabla ordenable por símbolo, precio y P&L">
            <HoldingsTable holdings={mockHoldings} />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Allocation" subtitle="Placeholder para gráfico de torta (Recharts)">
            <div className="mt-4 space-y-3">
              {allocation.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-text">{item.label}</span>
                  <span className="text-muted">{formatPercent(item.value / 100)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Gráfico de velas" subtitle="Integrar lightweight-charts al seleccionar un ticker">
            <div className="mt-3 rounded-lg border border-border/60 bg-surface-muted/50 p-4 text-sm text-muted">
              Placeholder para el gráfico de velas (candlestick) de TradingView.
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
