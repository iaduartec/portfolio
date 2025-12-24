import { StatCard } from "./StatCard";
import { PortfolioSummary } from "@/types/portfolio";

interface DashboardStatsProps {
    summary: PortfolioSummary;
    realizedTotal: number;
    totalPnlPercent: number;
    isLoading: boolean;
}

export function DashboardStats({ summary, realizedTotal, totalPnlPercent, isLoading }: DashboardStatsProps) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Valor total" value={summary.totalValue} isLoading={isLoading} />
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
