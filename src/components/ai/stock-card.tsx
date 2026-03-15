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
            <Card className="surface-card-muted flex w-full max-w-[300px] items-center justify-center gap-3 p-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-text-secondary">Obteniendo datos de {symbol}...</span>
            </Card>
        );
    }

    if (!data) return null;

    const isPositive = data.change >= 0;

    return (
        <Card className="surface-card-muted w-full max-w-[320px] overflow-hidden">
            <div className="p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-2xl font-semibold tracking-tight text-text">{symbol}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">{data.name}</span>
                    </div>
                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {data.changePercent.toFixed(2)}%
                    </div>
                </div>

                <div className="mb-4 flex flex-col gap-0.5">
                    <span className="financial-value text-3xl font-semibold tracking-tight text-text">
                        {formatCurrency(data.price, currency)}
                    </span>
                    <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(data.change, currency)} hoy
                    </span>
                </div>

                {analysis && (
                    <div className="mt-4 border-t border-border/60 pt-4">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                            <TrendingUp size={12} />
                            Análisis flash
                        </div>
                        <p className="text-xs leading-relaxed text-text-secondary">
                            &quot;{analysis}&quot;
                        </p>
                    </div>
                )}
            </div>
            <div className={`h-1 w-full ${isPositive ? 'bg-success/40' : 'bg-danger/40'}`} />
        </Card>
    );
}
