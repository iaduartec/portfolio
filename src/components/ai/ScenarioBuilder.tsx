"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

export function ScenarioBuilder() {
    const [scenario, setScenario] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSimulate = async () => {
        if (!scenario) return;
        setLoading(true);
        setResult(null);
        // Simulation logic would go here (call AI)
        setTimeout(() => {
            setResult("Análisis completado: Según la beta histórica y sensibilidad sectorial, un escenario de +1% en tipos impactaría tu cartera en -8.5% debido a la exposición en Growth.");
            setLoading(false);
        }, 1500);
    };

    return (
        <Card className="relative overflow-hidden border-white/5 bg-surface/30 backdrop-blur-md p-5 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl -z-10" />

            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <BrainCircuit size={18} />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-white uppercase tracking-wider">Simulador de Escenarios</h3>
                    <div className="flex items-center gap-1.5">
                        <Sparkles size={10} className="text-purple-400" />
                        <span className="text-[10px] text-muted-foreground font-bold">MONTE CARLO AI</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <Input
                    placeholder="p.ej. ¿Subida de tipos +1%?"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl focus-visible:ring-purple-500 h-10 text-sm"
                />
                <Button
                    onClick={handleSimulate}
                    disabled={loading || !scenario}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl h-10 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            PROCESANDO...
                        </>
                    ) : (
                        "SIMULAR IMPACTO"
                    )}
                </Button>

                {result && (
                    <div className="mt-2 p-3 bg-purple-500/10 rounded-xl text-[11px] border border-purple-500/20 text-purple-200 leading-relaxed animate-in fade-in slide-in-from-top-2">
                        <span className="font-black text-purple-400 mr-1">IA:</span>
                        {result}
                    </div>
                )}
            </div>
        </Card>
    );
}
