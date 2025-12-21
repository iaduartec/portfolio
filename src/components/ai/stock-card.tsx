import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

interface StockCardProps {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    name?: string;
}

export function StockCard({ symbol, price, change, changePercent, name }: StockCardProps) {
    const isPositive = change >= 0;

    return (
        <Card className="w-64 border-l-4 border-l-primary/50 bg-surface/50 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-lg">{symbol}</h3>
                    <p className="text-xs text-muted-foreground">{name || "Stock Asset"}</p>
                </div>
                <div className={`p-1.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-2xl font-mono font-medium">${price.toFixed(2)}</span>
                <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{change > 0 ? '+' : ''}{change.toFixed(2)}</span>
                    <span className="opacity-75">({changePercent.toFixed(2)}%)</span>
                </div>
            </div>
        </Card>
    );
}
