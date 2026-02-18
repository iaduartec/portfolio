import { StatCard } from "./StatCard";
import { PortfolioSummary } from "@/types/portfolio";

interface DashboardStatsProps {
    summary: PortfolioSummary;
    realizedTotal: number;
    totalPnlPercent: number;
    dailyPnlPercent: number;
    isLoading: boolean;
}

export function DashboardStats({
    summary,
    realizedTotal,
    totalPnlPercent,
    dailyPnlPercent,
    isLoading
}: DashboardStatsProps) {
    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Valor total" value={summary.totalValue} isLoading={isLoading} />
            <StatCard
                label="P&L día"
                value={summary.dailyPnl}
                change={dailyPnlPercent}
                changeVariant="percent"
                isLoading={isLoading}
            />
            <StatCard
                label="P&L abierto"
                value={summary.totalPnl}
                change={totalPnlPercent}
                changeVariant="percent"
                isLoading={isLoading}
            />
            <StatCard label="P&L realizado" value={realizedTotal} isLoading={isLoading} />
        </section>
    );
}
