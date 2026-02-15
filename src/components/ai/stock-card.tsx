"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Loader2, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useCurrency } from "@/components/currency/CurrencyProvider";

interface StockCardProps {
    symbol: string;
    price?: number;
    change?: number;
    changePercent?: number;
    name?: string;
    analysis?: string;
}

export function StockCard({ symbol, price: initialPrice, change: initialChange, changePercent: initialChangePercent, name: initialName, analysis }: StockCardProps) {
    const [data, setData] = useState<{ price: number; change: number; changePercent: number; name: string } | null>(
        initialPrice !== undefined ? { price: initialPrice, change: initialChange || 0, changePercent: initialChangePercent || 0, name: initialName || symbol } : null
    );
    const [loading, setLoading] = useState(!data);
    const { currency } = useCurrency();

    useEffect(() => {
        if (!data) {
            const fetchData = async () => {
                try {
                    const res = await fetch(`/api/market/ohlc?symbol=${symbol}`);
                    const json = await res.json();
                    if (json.candles && json.candles.length > 0) {
                        const last = json.candles[json.candles.length - 1];
                        const prev = json.candles[json.candles.length - 2] || last;
                        const change = last.close - prev.close;
                        const changePercent = (change / prev.close) * 100;
                        setData({
                            price: last.close,
                            change,
                            changePercent,
                            name: initialName || symbol
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch stock card data:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [symbol, data, initialName]);

    if (loading) {
        return (
            <Card className="w-full max-w-[300px] p-4 flex items-center justify-center gap-3 bg-surface/50 backdrop-blur-sm border-white/5">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-medium">Obteniendo datos de {symbol}...</span>
            </Card>
        );
    }

    if (!data) return null;

    const isPositive = data.change >= 0;

    return (
        <Card className="w-full max-w-[320px] overflow-hidden border-white/10 bg-surface/40 backdrop-blur-md hover:bg-surface/60 transition-colors group">
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <span className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">{symbol}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{data.name}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {data.changePercent.toFixed(2)}%
                    </div>
                </div>

                <div className="flex flex-col gap-0.5 mb-4">
                    <span className="text-3xl font-mono font-bold tracking-tighter text-white">
                        {formatCurrency(data.price, currency)}
                    </span>
                    <span className={`text-xs font-medium ${isPositive ? 'text-green-500/80' : 'text-red-500/80'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(data.change, currency)} hoy
                    </span>
                </div>

                {analysis && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-primary uppercase tracking-tighter">
                            <TrendingUp size={12} />
                            Análisis Flash
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                            &quot;{analysis}&quot;
                        </p>
                    </div>
                )}
            </div>
            {/* Visual bottom bar */}
            <div className={`h-1 w-full ${isPositive ? 'bg-green-500/30' : 'bg-red-500/30'}`} />
        </Card>
    );
}
