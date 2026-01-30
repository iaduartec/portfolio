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
    CandlePoint,
    VolumePoint,
} from "@/lib/technical-analysis";

interface PortfolioValueChartProps {
    ticker: string;
    name?: string;
}

export function PortfolioValueChart({ ticker, name }: PortfolioValueChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [liveSeries, setLiveSeries] = useState<{ candles: CandlePoint[]; volumes: VolumePoint[] }>(
        { candles: [], volumes: [] }
    );
    const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
    const [aiResult, setAiResult] = useState<{
        patterns: any[];
        summary: string;
        entry?: string;
        target?: string;
        stopLoss?: string;
    } | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        let ignore = false;
        const fetchData = async () => {
            setStatus("loading");
            try {
                const res = await fetch(`/api/market/ohlc?symbol=${ticker}&range=1y`);
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

    const handleAiAudit = async () => {
        if (liveSeries.candles.length === 0) return;
        setIsAiLoading(true);
        try {
            const res = await fetch("/api/market/analysis", {
                method: "POST",
                body: JSON.stringify({ candles: liveSeries.candles, symbol: ticker }),
            });
            const data = await res.json();
            setAiResult(data);
        } catch (err) {
            console.error("AI Audit failed:", err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const analysis = useMemo(() => buildAnalysis(liveSeries.candles, liveSeries.volumes), [liveSeries]);

    useEffect(() => {
        if (!containerRef.current || status !== "idle" || liveSeries.candles.length === 0) return;

        containerRef.current.innerHTML = "";
        const chart = createChart(containerRef.current, {
            height: 500,
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
                scaleMargins: { top: 0.2, bottom: 0.1 },
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

        // Add relevant patterns from heuristics and AI
        const allPatterns = [
            ...analysis.patterns,
            ...(aiResult?.patterns || []).map(p => ({
                kind: p.type,
                name: p.name,
                description: p.description,
                confidence: p.confidence,
                markers: [],
                lines: [{
                    id: `ai-${p.name}`,
                    name: p.name,
                    points: p.points.map((pt: { time: string; price: number }) => ({ time: pt.time, value: pt.price })),
                    color: p.type.includes('top') || p.type.includes('resistance') ? '#f6465d' : '#00c074',
                    width: 3, // Increased from 2 for better visibility
                    style: LineStyle.Solid
                }]
            }))
        ].map(p => {
            // Find the last timestamp in this pattern for sorting/filtering
            const times = p.lines.flatMap(l => l.points.map((pt: { time: string; value: number }) => pt.time));
            const lastTime = times.sort().reverse()[0] || "";
            return { ...p, lastTime };
        });

        // Show all detected patterns on the chart with labels and improved markers
        const allMarkers: any[] = [];
        allPatterns.forEach((pattern) => {
            pattern.lines.forEach((line) => {
                const series = chart.addLineSeries({
                    color: line.color,
                    lineWidth: 3, // Forced thicker lines for clarity
                    lineStyle: line.style ?? LineStyle.Solid,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });
                series.setData(line.points);
            });

            if (pattern.markers && pattern.markers.length > 0) {
                allMarkers.push(...pattern.markers);
            }

            // Pattern name label at the end of the figure for clarity
            // Only label patterns with decent confidence to avoid visual noise
            if (pattern.lastTime && (pattern.confidence > 0.6 || (aiResult?.patterns || []).some(ap => ap.name === pattern.name))) {
                allMarkers.push({
                    time: pattern.lastTime,
                    position: 'aboveBar',
                    color: pattern.lines[0]?.color || '#3b82f6',
                    shape: 'circle',
                    text: pattern.name,
                    size: 1,
                    confidence: pattern.confidence // Store for grouping logic
                });
            }
        });

        // De-conflict overlapping markers at the same time point
        const groupedMarkers = new Map<string, any>();
        // Sort markers by confidence so the most important ones are prioritized in the map
        allMarkers.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

        allMarkers.forEach(m => {
            const key = String(m.time);
            if (!groupedMarkers.has(key)) {
                groupedMarkers.set(key, { ...m });
            } else {
                const existing = groupedMarkers.get(key);
                // If the new marker has a text label but the existing one doesn't, add it
                if (!existing.text && m.text) {
                    existing.text = m.text;
                }
                // Keep the "non-circle" shape if we have one (usually means an arrow/signal)
                if (m.shape && m.shape !== 'circle') {
                    existing.shape = m.shape;
                }
            }
        });

        candleSeries.setMarkers(Array.from(groupedMarkers.values()).sort((a, b) => String(a.time).localeCompare(String(b.time))));

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
    }, [status, liveSeries, analysis, aiResult]);

    // Combined patterns for display: Latest always, then high confidence others
    const displayPatterns = useMemo(() => {
        const combined = [
            ...analysis.patterns.map(p => {
                const times = p.lines.flatMap(l => l.points.map((pt: { time: string; value: number }) => pt.time));
                return { ...p, lastTime: times.sort().reverse()[0] || "", isAi: false };
            }),
            ...(aiResult?.patterns || []).map(p => {
                const times = p.points.map((pt: { time: string; price: number }) => pt.time);
                return {
                    name: p.name,
                    confidence: p.confidence,
                    description: p.description,
                    isAi: true,
                    lastTime: times.sort().reverse()[0] || ""
                };
            })
        ].sort((a, b) => b.lastTime.localeCompare(a.lastTime));

        if (combined.length === 0) return [];

        const latest = combined[0];
        const others = combined.slice(1)
            .filter(p => p.confidence > 0.85)
            .sort((a, b) => b.confidence - a.confidence);

        return [latest, ...others].slice(0, 3);
    }, [analysis.patterns, aiResult]);

    return (
        <Card
            title={name || ticker}
            subtitle={status === "idle" ? (aiResult ? "Análisis IA Completo" : (name ? ticker : "Análisis técnico")) : "Cargando..."}
            className="overflow-hidden"
        >
            {status === "loading" && <div className="h-[500px] flex items-center justify-center text-xs text-muted">Cargando...</div>}
            {status === "error" && <div className="h-[500px] flex items-center justify-center text-xs text-danger">Error al cargar datos</div>}
            <div ref={containerRef} className="w-full h-[500px]" />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted mb-3">Patrones Detectados</h4>
                    <div className="flex flex-col gap-2">
                        {displayPatterns.length > 0 ? displayPatterns.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded bg-surface/50 border border-border/50">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-text">{p.name}</span>
                                        {'isAi' in p && <span className="text-[8px] px-1 py-0.5 rounded bg-accent/10 text-accent font-bold">IA</span>}
                                    </div>
                                    <span className="text-[9px] text-muted line-clamp-1">{p.description}</span>
                                </div>
                                <span className="text-[10px] font-bold text-accent">{(p.confidence * 100).toFixed(0)}%</span>
                            </div>
                        )) : (
                            <div className="text-[10px] text-muted italic">No se han detectado patrones claros.</div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted">Análisis Pro</h4>
                        <button
                            onClick={handleAiAudit}
                            disabled={isAiLoading || status !== "idle"}
                            className="text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                            {isAiLoading ? "Analizando..." : "Iniciar Auditoría IA"}
                        </button>
                    </div>

                    {aiResult ? (
                        <div className="space-y-4">
                            <p className="text-[11px] leading-relaxed text-text/80 bg-surface/50 p-3 rounded border border-border/50 italic">
                                &quot;{aiResult.summary}&quot;
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 rounded bg-success/5 border border-success/10">
                                    <p className="text-[8px] uppercase tracking-tighter text-success/60 mb-0.5">Entrada</p>
                                    <p className="text-[11px] font-bold text-success">{aiResult.entry || "-"}</p>
                                </div>
                                <div className="p-2 rounded bg-accent/5 border border-accent/10">
                                    <p className="text-[8px] uppercase tracking-tighter text-accent/60 mb-0.5">Objetivo</p>
                                    <p className="text-[11px] font-bold text-accent">{aiResult.target || "-"}</p>
                                </div>
                                <div className="p-2 rounded bg-danger/5 border border-danger/10">
                                    <p className="text-[8px] uppercase tracking-tighter text-danger/60 mb-0.5">Stop Loss</p>
                                    <p className="text-[11px] font-bold text-danger">{aiResult.stopLoss || "-"}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[100px] flex flex-col items-center justify-center rounded border border-dashed border-border/50 bg-surface/30">
                            <p className="text-[10px] text-muted text-center px-4">
                                Haz clic en &quot;Iniciar Auditoría IA&quot; para obtener un análisis detallado y puntos de entrada/salida.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
