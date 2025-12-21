import { Card } from "@/components/ui/Card";
import { Activity, Thermometer } from "lucide-react";

export function MarketPulse() {
    // Static data for now, would be dynamic with AI
    const sentiment = "Cautiously Optimistic";
    const score = 65; // 0-100

    return (
        <Card className="border-l-4 border-l-blue-500/50 bg-surface/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                    <Activity size={20} />
                </div>
                <h3 className="font-bold text-lg">Market Pulse</h3>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sentiment</span>
                    <span className="font-medium text-blue-400">{sentiment}</span>
                </div>

                <div className="w-full bg-secondary/30 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${score}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Based on recent sector performance and volatility.
                </p>
            </div>
        </Card>
    );
}
