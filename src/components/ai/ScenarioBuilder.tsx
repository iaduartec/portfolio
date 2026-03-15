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
        <Card className="surface-card-muted p-5">
            <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl border border-accent/18 bg-accent/10 p-2 text-accent">
                    <BrainCircuit size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text">Simulador de escenarios</h3>
                    <div className="flex items-center gap-1.5">
                        <Sparkles size={10} className="text-accent" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Escenario guiado</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <Input
                    placeholder="p.ej. ¿Subida de tipos +1%?"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="h-11 text-sm"
                />
                <Button
                    onClick={handleSimulate}
                    disabled={loading || !scenario}
                    className="h-11 w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Procesando…
                        </>
                    ) : (
                        "Simular impacto"
                    )}
                </Button>

                {result && (
                    <div className="animate-in fade-in slide-in-from-top-2 mt-2 rounded-[1.25rem] border border-accent/18 bg-accent/[0.08] p-4 text-[11px] leading-relaxed text-text-secondary">
                        <span className="mr-1 font-semibold text-accent">IA:</span>
                        {result}
                    </div>
                )}
            </div>
        </Card>
    );
}
