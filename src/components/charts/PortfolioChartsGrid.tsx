'use client';

import { usePortfolioData } from "@/hooks/usePortfolioData";
import { PortfolioValueChart } from "./PortfolioValueChart";
import { useMemo } from "react";

export function PortfolioChartsGrid() {
    const { holdings } = usePortfolioData();

    const tickers = useMemo(() => {
        const symbols = holdings.map((h) => h.ticker.toUpperCase()).filter(Boolean);
        return Array.from(new Set(symbols)).sort();
    }, [holdings]);

    if (tickers.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
                No tienes valores en tu portafolio para mostrar gráficos individuales.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-8">
            {tickers.map((ticker) => {
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
    );
}
