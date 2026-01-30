'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ColorType,
    LineStyle,
    createChart,
} from "lightweight-charts";
import { Card } from "@/components/ui/card";
import {
    buildAnalysis,
    normalizeLineWidth,
    CandlePoint,
    VolumePoint,
} from "@/lib/technical-analysis";

interface PortfolioValueChartProps {
    ticker: string;
}

export function PortfolioValueChart({ ticker }: PortfolioValueChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [liveSeries, setLiveSeries] = useState<{ candles: CandlePoint[]; volumes: VolumePoint[] }>(
        { candles: [], volumes: [] }
    );
    const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            setStatus("loading");
            try {
                const res = await fetch(`/api/market/ohlc?symbol=${ticker}`);
                const payload = await res.json();
                if (!res.ok || !Array.isArray(payload.candles)) {
                    throw new Error("No data");
                }
                if (!ignore) {
                    setLiveSeries({ candles: payload.candles, volumes: payload.volumes ?? [] });
                    setStatus("idle");
                }
            } catch {
                if (!ignore) setStatus("error");
            }
        };
        fetchData();
        return () => { ignore = true; };
    }, [ticker]);

    const analysis = useMemo(() => buildAnalysis(liveSeries.candles, liveSeries.volumes), [liveSeries]);

    // Select relevant tools: top 2 most confident patterns
    const relevantPatterns = useMemo(() => {
        return [...analysis.patterns]
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 2);
    }, [analysis.patterns]);

    useEffect(() => {
        if (!containerRef.current || status !== "idle" || liveSeries.candles.length === 0) return;

        containerRef.current.innerHTML = "";
        const chart = createChart(containerRef.current, {
            height: 250,
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#cfd6e6",
            },
            grid: {
                vertLines: { color: "rgba(255,255,255,0.02)" },
                horzLines: { color: "rgba(255,255,255,0.02)" },
            },
            crosshair: {
                mode: 0,
                vertLine: { color: "rgba(41,98,255,0.2)", width: 1, style: 2 },
                horzLine: { color: "rgba(41,98,255,0.1)", width: 1, style: 2 },
            },
            rightPriceScale: {
                borderColor: "rgba(255,255,255,0.05)",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: "rgba(255,255,255,0.05)",
                timeVisible: false,
            },
        });

        const candleSeries = chart.addCandlestickSeries({
            upColor: "#00c074",
            downColor: "#f6465d",
            borderVisible: false,
            wickUpColor: "#00c074",
            wickDownColor: "#f6465d",
        });
        candleSeries.setData(liveSeries.candles);

        // Add relevant patterns
        relevantPatterns.forEach((pattern) => {
            pattern.lines.forEach((line) => {
                const series = chart.addLineSeries({
                    color: line.color,
                    lineWidth: normalizeLineWidth(line.width),
                    lineStyle: line.style ?? LineStyle.Solid,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                series.setData(line.points);
            });
        });

        const markers = relevantPatterns
            .flatMap((p) => p.markers)
            .sort((a, b) => (a.time > b.time ? 1 : -1));
        if (markers.length > 0) {
            candleSeries.setMarkers(markers);
        }

        // Add support/resistance
        analysis.support.forEach(line => {
            const series = chart.addLineSeries({
                color: line.color,
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            series.setData(line.points);
        });

        chart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver(([entry]) => {
            chart.applyOptions({ width: entry.contentRect.width });
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [status, liveSeries, relevantPatterns, analysis.support]);

    return (
        <Card
            title={ticker}
            subtitle={status === "idle" && relevantPatterns.length > 0 ? `Patrón: ${relevantPatterns[0].name}` : "Análisis técnico"}
            className="overflow-hidden"
        >
            {status === "loading" && <div className="h-[250px] flex items-center justify-center text-xs text-muted">Cargando...</div>}
            {status === "error" && <div className="h-[250px] flex items-center justify-center text-xs text-danger">Error al cargar datos</div>}
            <div ref={containerRef} className="w-full h-[250px]" />

            {status === "idle" && relevantPatterns.length > 0 && (
                <div className="mt-3 flex flex-col gap-1">
                    {relevantPatterns.map(p => (
                        <div key={p.kind} className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                            <span className="text-muted">{p.name}</span>
                            <span className="text-accent">{Math.round(p.confidence * 100)}% Conf.</span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
