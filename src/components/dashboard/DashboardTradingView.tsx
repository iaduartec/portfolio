"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { TradingViewSymbolInfo } from "@/components/charts/TradingViewSymbolInfo";
import { TradingViewFundamentals } from "@/components/charts/TradingViewFundamentals";
import { TradingViewTechnicalAnalysis } from "@/components/charts/TradingViewTechnicalAnalysis";
import { TradingViewTopStories } from "@/components/charts/TradingViewTopStories";
import { TradingViewCompanyProfile } from "@/components/charts/TradingViewCompanyProfile";
import { TradingViewAdvancedChart } from "@/components/charts/TradingViewAdvancedChart";
import { Holding } from "@/types/portfolio";
import { resolveTradingViewSymbol } from "@/lib/marketSymbols";

interface DashboardTradingViewProps {
    selectedHolding: Holding | undefined;
}

export function DashboardTradingView({ selectedHolding }: DashboardTradingViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const tradingViewSymbol = selectedHolding
        ? resolveTradingViewSymbol(selectedHolding.ticker)
        : "";

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" } // Load a bit before it comes into view
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section ref={containerRef} aria-labelledby="tradingview-title">
            <Card
                title={<span id="tradingview-title">TradingView</span>}
                subtitle={
                    selectedHolding
                        ? `${selectedHolding.name || selectedHolding.ticker}${
                              selectedHolding.name ? ` (${selectedHolding.ticker})` : ""
                          } · Panel financiero completo con analisis tecnico y noticias`
                        : "Panel financiero completo con analisis tecnico y noticias"
                }
            >
                {selectedHolding ? (
                    <div className="tv-dark-scope mx-auto grid w-full max-w-[960px] grid-cols-1 gap-8 md:grid-cols-2">
                        {isVisible ? (
                            <>
                                <section className="md:col-span-2" aria-label="Informacion del simbolo">
                                    <TradingViewSymbolInfo symbol={tradingViewSymbol} />
                                </section>
                                <section className="md:col-span-2 h-[500px]" aria-label="Grafico avanzado">
                                    <TradingViewAdvancedChart symbol={tradingViewSymbol} />
                                </section>
                                <section className="md:col-span-2 h-[390px]" aria-label="Perfil de la empresa">
                                    <TradingViewCompanyProfile symbol={tradingViewSymbol} />
                                </section>
                                <section className="md:col-span-2 h-[775px]" aria-label="Fundamentos financieros">
                                    <TradingViewFundamentals symbol={tradingViewSymbol} />
                                </section>
                                <section className="h-[425px]" aria-label="Analisis tecnico">
                                    <TradingViewTechnicalAnalysis symbol={tradingViewSymbol} />
                                </section>
                                <section className="h-[600px]" aria-label="Noticias destacadas">
                                    <TradingViewTopStories symbol={tradingViewSymbol} height="100%" />
                                </section>
                            </>
                        ) : (
                            <div className="md:col-span-2 h-[400px] flex items-center justify-center text-muted animate-pulse">
                                Cargando panel financiero...
                            </div>
                        )}

                        <footer className="md:col-span-2 rounded-xl border border-border/70 bg-surface-muted/45 p-4 text-sm text-muted">
                            <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted">Tecnologia TradingView</p>
                            <p>
                                Graficos e informacion financiera proporcionados por TradingView. Explora mas{" "}
                                <a
                                    href="https://www.tradingview.com/features/"
                                    className="text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent"
                                    target="_blank"
                                    rel="noopener nofollow"
                                >
                                    funciones avanzadas
                                </a>{" "}
                                o{" "}
                                <a
                                    href="https://www.tradingview.com/widget/"
                                    className="text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent"
                                    target="_blank"
                                    rel="noopener nofollow"
                                >
                                    usa widgets
                                </a>{" "}
                                en tu sitio.
                            </p>
                        </footer>
                    </div>
                ) : (
                    <p className="text-sm text-muted p-4">Selecciona un ticker para ver el panel TradingView.</p>
                )}
            </Card>
        </section>
    );
}
