'use client';

import { useMemo, useState } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MemoizedMarkdown } from "@/components/ai/memoized-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import {
    buildAnalysis,
    computeRsi,
    computeMacd,
    computeSupertrend
} from "@/lib/technical-analysis";

export function AITechnicalAnalysis() {
    const { holdings } = usePortfolioData();
    const [analyzing, setAnalyzing] = useState(false);

    const aiChat = useMemo(
        () => new Chat({ transport: new DefaultChatTransport({ api: "/api/chat" }) }),
        []
    );

    const { messages, status, sendMessage, setMessages } = useChat({
        chat: aiChat,
        experimental_throttle: 50,
    });

    const isLoading = status === "submitted" || status === "streaming";

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setMessages([]);

        try {
            // We gather technical context for the top tickers (limit to 5 to avoid prompt explosion)
            const tickers = holdings.map(h => h.ticker.toUpperCase()).slice(0, 5);
            const contexts = await Promise.all(tickers.map(async (ticker) => {
                const res = await fetch(`/api/market/ohlc?symbol=${ticker}`);
                const data = await res.json();
                if (!res.ok || !data.candles) return null;

                const analysis = buildAnalysis(data.candles, data.volumes || []);
                const rsi = computeRsi(data.candles, 14);
                const macd = computeMacd(data.candles);
                const supertrend = computeSupertrend(data.candles);
                const patterns = analysis.patterns.map(p => p.name).join(", ");

                return {
                    ticker,
                    price: data.candles[data.candles.length - 1].close,
                    patterns: patterns || "Ninguno",
                    rsi: rsi?.toFixed(2),
                    trend: supertrend.direction,
                    macd: macd.last.hist?.toFixed(2)
                };
            }));

            const validContexts = contexts.filter(Boolean);

            const prompt = `
            Actúa como un experto en análisis técnico y gestión de carteras.
            Analiza los siguientes activos de mi cartera y proporciona recomendaciones específicas:
            - Salida (Vender)
            - Ampliar capital (Comprar más)
            - Reducir capital (Venta parcial)
            - Precio Objetivo y Stop Loss para cada uno.

            Datos actuales:
            ${JSON.stringify(validContexts, null, 2)}

            Basa tus recomendaciones en la combinación de patrones, RSI y tendencia. 
            Responde en español de forma profesional y estructurada.
        `;

            await sendMessage({ text: prompt });
        } catch (error) {
            console.error("AI Analysis error:", error);
        } finally {
            setAnalyzing(false);
        }
    };

    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    const latestText = latestAssistant ? (latestAssistant.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n') || (latestAssistant as any).content || "") : "";

    return (
        <Card
            title="Análisis Técnico IA"
            subtitle="Recomendaciones estratégicas basadas en indicadores técnicos para tu cartera."
            className="mt-8"
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">
                        Este análisis procesa los indicadores de tus activos y sugiere ajustes de capital y niveles operativos.
                    </p>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isLoading || analyzing || holdings.length === 0}
                        className="bg-accent text-white"
                    >
                        {isLoading || analyzing ? "Procesando..." : "Generar Recomendaciones"}
                    </Button>
                </div>

                {latestText && (
                    <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-5 text-sm text-text leading-relaxed">
                        <MemoizedMarkdown id="portfolio-ai-analysis" content={latestText} />
                    </div>
                )}

                {!latestText && !isLoading && !analyzing && (
                    <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-lg bg-surface-muted/20">
                        <p className="text-xs text-muted uppercase tracking-widest">Listo para analizar</p>
                        <p className="mt-2 text-sm text-muted/60">Haz clic en el botón para comenzar el análisis de tu cartera.</p>
                    </div>
                )}
            </div>
        </Card>
    );
}
