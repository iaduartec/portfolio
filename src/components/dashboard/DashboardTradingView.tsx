"use client";

import { useMemo, useState } from "react";
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
    const [isWidgetEnabled, setIsWidgetEnabled] = useState(false);
    const tradingViewSymbol = selectedHolding ? resolveTradingViewSymbol(selectedHolding.ticker) : "";
    const tradingViewHref = useMemo(() => {
        if (!tradingViewSymbol) return "https://www.tradingview.com/";
        return `https://www.tradingview.com/symbols/${tradingViewSymbol.replace(":", "-")}/`;
    }, [tradingViewSymbol]);

    return (
        <section aria-labelledby="tradingview-title">
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
                        {isWidgetEnabled ? (
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
                            <div className="md:col-span-2 rounded-2xl border border-border/70 bg-surface-muted/35 p-8">
                                <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                                    <p className="text-xs uppercase tracking-[0.12em] text-primary/85">
                                        Widgets externos
                                    </p>
                                    <h3 className="mt-3 text-xl font-semibold text-white">
                                        Carga el panel de TradingView bajo demanda
                                    </h3>
                                    <p className="mt-3 text-sm leading-relaxed text-muted">
                                        Algunos bloqueadores de privacidad impiden cargar chunks internos de TradingView y
                                        llenan la consola de errores. El panel ahora se activa solo cuando lo pides.
                                    </p>
                                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsWidgetEnabled(true)}
                                            className="rounded-xl border border-primary/45 bg-primary/15 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                                        >
                                            Cargar panel TradingView
                                        </button>
                                        <a
                                            href={tradingViewHref}
                                            className="rounded-xl border border-border/80 bg-surface/70 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent/45 hover:text-white"
                                            target="_blank"
                                            rel="noopener nofollow"
                                        >
                                            Abrir en TradingView
                                        </a>
                                    </div>
                                    <p className="mt-4 text-xs text-muted">
                                        Si tu navegador bloquea el tracker de TradingView, usa el enlace externo o permite
                                        temporalmente ese dominio.
                                    </p>
                                </div>
                            </div>
                        )}

                        <footer className="md:col-span-2 rounded-xl border border-border/70 bg-surface-muted/45 p-4 text-sm text-muted">
                            <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted">Tecnologia TradingView</p>
                            <p>
                                Graficos e informacion financiera proporcionados por TradingView. Explora mas{" "}
                                <a
                                    href="https://www.tradingview.com/features/"
                                    className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    target="_blank"
                                    rel="noopener nofollow"
                                >
                                    funciones avanzadas
                                </a>{" "}
                                o{" "}
                                <a
                                    href="https://www.tradingview.com/widget/"
                                    className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
