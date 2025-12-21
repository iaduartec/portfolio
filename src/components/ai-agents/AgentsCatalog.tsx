"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Holding } from "@/types/portfolio";

type RecommendationMap = Record<string, string>;

type Provider = "openai" | "anthropic" | "ollama";

const formatNumber = (value: number | undefined, digits = 2) =>
  Number.isFinite(value) ? value!.toFixed(digits) : "0";

const formatOptional = (value: number | undefined, digits = 2) =>
  Number.isFinite(value) ? value!.toFixed(digits) : "n/d";

const buildTickerPrompt = (holding: Holding) => {
  const avg = formatNumber(holding.averageBuyPrice);
  const cur = formatNumber(holding.currentPrice);
  const qty = formatNumber(holding.totalQuantity, 4);
  const mv = formatNumber(holding.marketValue);
  const pnlValue = formatNumber(holding.pnlValue);
  const pnlPercent = formatNumber(holding.pnlPercent);
  const dayChange = formatOptional(holding.dayChangePercent);

  return `Analiza esta posicion y dame 3 recomendaciones accionables en bullets. Incluye riesgo y accion sugerida (mantener/comprar/vender).
Ticker: ${holding.ticker}
Cantidad: ${qty}
Precio medio: ${avg}
Precio actual: ${cur}
Valor de mercado: ${mv}
P&L: ${pnlValue} (${pnlPercent}%)
Cambio diario: ${dayChange}%`;
};

const defaultProvider = (): Provider => {
  if (process.env.NEXT_PUBLIC_AGENTS_DEFAULT_PROVIDER === "ollama") return "ollama";
  if (process.env.NEXT_PUBLIC_AGENTS_DEFAULT_PROVIDER === "openai") return "openai";
  return "anthropic";
};

export function AgentsCatalog() {
  const { holdings } = usePortfolioData();
  const [selected, setSelected] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationMap>({});
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>(() => defaultProvider());

  useEffect(() => {
    if (holdings.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !holdings.some((holding) => holding.ticker === selected)) {
      setSelected(holdings[0].ticker);
    }
  }, [holdings, selected]);

  const selectedHolding = useMemo(
    () => holdings.find((holding) => holding.ticker === selected) ?? null,
    [holdings, selected]
  );

  const requestRecommendation = async (holding: Holding) => {
    const prompt = buildTickerPrompt(holding);
    setLoadingTicker(holding.ticker);
    try {
      const res = await fetch("/api/ai-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, agent: holding.ticker, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al llamar al agente");
      const reply = typeof data?.reply === "string" ? data.reply : "";
      setRecommendations((prev) => ({ ...prev, [holding.ticker]: reply }));
    } catch (e: any) {
      setError(e.message ?? "Error desconocido");
    } finally {
      setLoadingTicker(null);
    }
  };

  const runSelected = () => {
    if (!selectedHolding) {
      setError("No hay ticker seleccionado para analizar.");
      return;
    }
    setError(null);
    void requestRecommendation(selectedHolding);
  };

  const runAll = async () => {
    if (!holdings.length) {
      setError("No hay participaciones abiertas para analizar.");
      return;
    }
    setError(null);
    setLoadingAll(true);
    for (const holding of holdings) {
      await requestRecommendation(holding);
    }
    setLoadingAll(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-2">
        {holdings.length === 0 ? (
          <Card title="Sin posiciones" subtitle="Agrega transacciones para ver agentes por ticker." />
        ) : (
          holdings.map((holding) => {
            const isActive = holding.ticker === selected;
            const pnlText = `${formatNumber(holding.pnlPercent)}%`;
            return (
              <button
                key={holding.ticker}
                onClick={() => setSelected(holding.ticker)}
                className={cn(
                  "w-full rounded-lg border border-border bg-surface px-4 py-3 text-left transition hover:border-accent/50 hover:bg-surface-muted/60",
                  isActive && "border-accent/70 bg-surface-muted/70 shadow-panel"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text">{holding.ticker}</p>
                  <p className="text-xs text-muted">{pnlText}</p>
                </div>
                <p className="text-xs text-muted">
                  {formatNumber(holding.totalQuantity, 4)} uds · avg {formatNumber(holding.averageBuyPrice)}
                </p>
              </button>
            );
          })
        )}
      </div>

      <div className="lg:col-span-2 space-y-4">
        <Card
          title={selectedHolding ? `Agente para ${selectedHolding.ticker}` : "Agente por ticker"}
          subtitle={
            selectedHolding
              ? "Recomendaciones para tu posicion abierta"
              : "Selecciona un ticker para generar recomendaciones"
          }
          className="space-y-3"
        >
          {selectedHolding ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Posicion</p>
                  <p className="text-sm text-text/90">
                    {formatNumber(selectedHolding.totalQuantity, 4)} uds · avg {formatNumber(
                      selectedHolding.averageBuyPrice
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">P&L</p>
                  <p className="text-sm text-text/90">
                    {formatNumber(selectedHolding.pnlValue)} USD ({formatNumber(
                      selectedHolding.pnlPercent
                    )}%)
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 bg-surface-muted/40 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Proveedor</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted">
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
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={runSelected}
                  disabled={loadingAll || loadingTicker === selectedHolding.ticker}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {loadingTicker === selectedHolding.ticker ? "Generando..." : "Generar recomendacion"}
                </button>
                <button
                  onClick={() => void runAll()}
                  disabled={loadingAll || holdings.length === 0}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-accent disabled:opacity-50"
                >
                  {loadingAll ? "Analizando cartera..." : "Generar para toda la cartera"}
                </button>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="rounded-md border border-border bg-surface p-2 text-sm text-text whitespace-pre-wrap">
                {recommendations[selectedHolding.ticker]
                  ? recommendations[selectedHolding.ticker]
                  : "Sin recomendacion aun."}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No hay participaciones abiertas para analizar.</p>
          )}
        </Card>

        <Card title="Lista de recomendaciones" subtitle="Una recomendacion por ticker">
          {holdings.length === 0 ? (
            <p className="text-sm text-muted">Carga tu cartera para ver recomendaciones.</p>
          ) : (
            <div className="space-y-3">
              {holdings.map((holding) => {
                const recommendation = recommendations[holding.ticker];
                return (
                  <div
                    key={holding.ticker}
                    className="rounded-lg border border-border bg-surface-muted/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text">{holding.ticker}</p>
                      <p className="text-xs text-muted">
                        {formatNumber(holding.marketValue)} USD
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Avg {formatNumber(holding.averageBuyPrice)} · Actual {formatNumber(
                        holding.currentPrice
                      )} · P&L {formatNumber(holding.pnlPercent)}%
                    </p>
                    <div className="mt-2 text-sm text-text whitespace-pre-wrap">
                      {loadingAll && loadingTicker === holding.ticker
                        ? "Generando..."
                        : recommendation || "Sin recomendacion aun."}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
