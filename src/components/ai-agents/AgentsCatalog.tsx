/* eslint-disable jsx-a11y/no-static-element-interactions */
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { agents } from "@/data/aiAgents";
import { cn } from "@/lib/utils";
import { usePortfolioData } from "@/hooks/usePortfolioData";

export function AgentsCatalog() {
  const [selected, setSelected] = useState(agents[0]?.id ?? null);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"openai" | "anthropic" | "ollama">(
    process.env.NEXT_PUBLIC_AGENTS_DEFAULT_PROVIDER === "ollama"
      ? "ollama"
      : process.env.NEXT_PUBLIC_AGENTS_DEFAULT_PROVIDER === "openai"
        ? "openai"
        : "anthropic"
  );
  const { holdings, summary } = usePortfolioData();

  const selectedAgent = agents.find((a) => a.id === selected);

  const runAgent = async (customPrompt?: string) => {
    const rawPrompt = customPrompt ?? prompt;
    const text = typeof rawPrompt === "string" ? rawPrompt.trim() : "";
    if (!text) {
      setError("Escribe un prompt o usa el prompt sugerido.");
      return;
    }
    setLoading(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch("/api/ai-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, agent: selected, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al llamar al agente");
      setReply(data.reply);
    } catch (e: any) {
      setError(e.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const useSamplePrompt = () => {
    if (selectedAgent?.samplePrompt) {
      setPrompt(selectedAgent.samplePrompt);
      void runAgent(selectedAgent.samplePrompt);
    }
  };

  const buildPortfolioPrompt = () => {
    if (!holdings || holdings.length === 0) {
      setError("No hay participaciones abiertas para analizar.");
      return;
    }
    const lines = holdings
      .slice(0, 15)
      .map((h) => {
        const avg = h.averageBuyPrice ?? 0;
        const cur = h.currentPrice ?? 0;
        const pnl = h.pnlPercent ?? h.dayChangePercent ?? 0;
        return `${h.ticker}: avg ${avg.toFixed?.(2) ?? avg} | actual ${cur.toFixed?.(2) ?? cur} | P&L ${pnl.toFixed?.(2) ?? pnl}%`;
      })
      .join("\n");
    const total = summary?.totalValue ?? 0;
    const openPnl = summary?.totalPnl ?? 0;
    const promptText = `Analiza estas posiciones abiertas y dame en bullets (riesgos, sesgos, acciones sugeridas):
Total cartera: ${total.toFixed?.(2) ?? total} USD | P&L abierto: ${openPnl.toFixed?.(2) ?? openPnl} USD
Posiciones:
${lines}`;
    setPrompt(promptText);
    void runAgent(promptText);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-2">
        {agents.map((agent) => {
          const isActive = agent.id === selected;
          return (
            <button
              key={agent.id}
              onClick={() => setSelected(agent.id)}
              className={cn(
                "w-full rounded-lg border border-border bg-surface px-4 py-3 text-left transition hover:border-accent/50 hover:bg-surface-muted/60",
                isActive && "border-accent/70 bg-surface-muted/70 shadow-panel"
              )}
            >
              <p className="text-sm font-semibold text-text">{agent.name}</p>
              <p className="text-xs text-muted">{agent.category}</p>
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-2 space-y-4">
        {agents
          .filter((a) => a.id === selected)
          .map((agent) => (
            <Card
              key={agent.id}
              title={agent.name}
              subtitle={agent.summary}
              className="space-y-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Propósito</p>
                  <p className="text-sm text-text/90">{agent.purpose}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Requisitos</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                    {agent.requirements.map((req) => (
                      <li key={req}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Comando sugerido</p>
                <code className="mt-1 block rounded-lg border border-border bg-surface-muted/60 px-3 py-2 text-sm text-text">
                  {agent.command}
                </code>
                <p className="mt-1 text-xs text-muted">Ejecuta desde la carpeta del repo de agentes.</p>
              </div>

              {agent.notes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Notas</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                    {agent.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

                <div className="space-y-2 rounded-lg border border-border/60 bg-surface-muted/40 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Prueba rápida</p>
                  <div className="flex gap-2 text-xs text-muted">
                    <label className="flex items-center gap-1">
                      <input
                      type="radio"
                      name="provider"
                      value="openai"
                      checked={provider === "openai"}
                      onChange={() => setProvider("openai")}
                    />
                    OpenAI
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="provider"
                      value="anthropic"
                      checked={provider === "anthropic"}
                      onChange={() => setProvider("anthropic")}
                    />
                    Anthropic
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="provider"
                      value="ollama"
                      checked={provider === "ollama"}
                      onChange={() => setProvider("ollama")}
                    />
                    Ollama
                  </label>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Escribe un prompt para el agente..."
                  className="h-24 w-full rounded-lg border border-border bg-surface p-2 text-sm text-text outline-none focus:border-accent"
                />
                <button
                  onClick={() => void runAgent()}
                  disabled={loading || !prompt.trim()}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? "Llamando..." : "Ejecutar"}
                </button>
                {selectedAgent?.samplePrompt && (
                  <button
                    onClick={useSamplePrompt}
                    disabled={loading}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-accent disabled:opacity-50"
                  >
                    Usar prompt sugerido de este agente
                  </button>
                )}
                {selectedAgent?.id === "cartera" && (
                  <button
                    onClick={buildPortfolioPrompt}
                    disabled={loading}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-accent disabled:opacity-50"
                  >
                    Analizar cartera abierta (OpenAI)
                  </button>
                )}
                {error && <p className="text-sm text-danger">{error}</p>}
                {reply && (
                  <div className="rounded-md border border-border bg-surface p-2 text-sm text-text whitespace-pre-wrap">
                    {reply}
                  </div>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
