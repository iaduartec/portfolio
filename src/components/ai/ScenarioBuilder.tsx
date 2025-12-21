"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Assuming you have an Input component
import { BrainCircuit } from "lucide-react";
import { useState } from "react";

export function ScenarioBuilder() {
    const [scenario, setScenario] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSimulate = async () => {
        if (!scenario) return;
        setLoading(true);
        // Simulation logic would go here (call AI)
        // For now, mock result
        setTimeout(() => {
            setResult("Based on historical beta, a 10% market drop could impact your portfolio by approximately -8.5%.");
            setLoading(false);
        }, 1500);
    };

    return (
        <Card className="border-l-4 border-l-purple-500/50 bg-surface/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
                    <BrainCircuit size={20} />
                </div>
                <h3 className="font-bold text-lg">Smart Scenarios</h3>
            </div>

            <div className="flex flex-col gap-3">
                <Input
                    placeholder="e.g. What if rates rise 1%?"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="bg-background/50"
                />
                <Button
                    onClick={handleSimulate}
                    disabled={loading || !scenario}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {loading ? "Simulating..." : "Simulate Impact"}
                </Button>

                {result && (
                    <div className="mt-2 p-3 bg-purple-500/10 rounded-lg text-sm border border-purple-500/20">
                        {result}
                    </div>
                )}
            </div>
        </Card>
    );
}
