'use client';

import { usePortfolioData } from "@/hooks/usePortfolioData";
import { PortfolioValueChart } from "./PortfolioValueChart";
import { useMemo } from "react";
import { isFundTicker } from "@/lib/portfolioGroups";

export function PortfolioChartsGrid() {
    const { holdings } = usePortfolioData();

    const stockTickers = useMemo(() => {
        const symbols = holdings
            .filter((holding) => !isFundTicker(holding.ticker))
            .map((holding) => holding.ticker.toUpperCase())
            .filter(Boolean);
        return Array.from(new Set(symbols)).sort();
    }, [holdings]);

    const fundTickers = useMemo(() => {
        const symbols = holdings
            .filter((holding) => isFundTicker(holding.ticker))
            .map((holding) => holding.ticker.toUpperCase())
            .filter(Boolean);
        return Array.from(new Set(symbols)).sort();
    }, [holdings]);

    if (stockTickers.length === 0 && fundTickers.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
                No tienes valores en tu portafolio para mostrar gráficos individuales.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {stockTickers.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text">Acciones</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        {stockTickers.map((ticker) => {
                            const holding = holdings.find(h => h.ticker.toUpperCase() === ticker);
                            return (
                                <PortfolioValueChart
                                    key={ticker}
                                    ticker={ticker}
                                    name={holding?.name}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {fundTickers.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text">Fondos y ETFs</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        {fundTickers.map((ticker) => {
                            const holding = holdings.find(h => h.ticker.toUpperCase() === ticker);
                            return (
                                <PortfolioValueChart
                                    key={ticker}
                                    ticker={ticker}
                                    name={holding?.name}
                                />
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
