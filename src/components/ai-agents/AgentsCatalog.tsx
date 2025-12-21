"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { Holding } from "@/types/portfolio";
import { formatCurrency, type CurrencyCode } from "@/lib/formatters";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type RecommendationMap = Record<string, string>;

type Provider = "openai" | "anthropic" | "ollama";

const formatNumber = (value: number | undefined, digits = 2) =>
  Number.isFinite(value) ? value!.toFixed(digits) : "0";

const formatOptional = (value: number | undefined, digits = 2) =>
  Number.isFinite(value) ? value!.toFixed(digits) : "n/d";

const buildTickerPrompt = (holding: Holding, currency: CurrencyCode) => {
  const avg = formatCurrency(holding.averageBuyPrice, currency);
  const cur = formatCurrency(holding.currentPrice, currency);
  const qty = formatNumber(holding.totalQuantity, 4);
  const mv = formatCurrency(holding.marketValue, currency);
  const pnlValue = formatCurrency(holding.pnlValue, currency);
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

type ActionTone = "urgent" | "caution" | "positive";

const classifyActionTone = (text: string): ActionTone => {
  const value = text.toLowerCase();
  if (
    value.includes("vender") ||
    value.includes("vende") ||
    value.includes("salir") ||
    value.includes("cerrar") ||
    value.includes("stop") ||
    value.includes("reducir") ||
    value.includes("reduce")
  ) {
    return "urgent";
  }
  if (
    value.includes("comprar") ||
    value.includes("acumular") ||
    value.includes("aumentar") ||
    value.includes("entrada") ||
    value.includes("aprovechar")
  ) {
    return "positive";
  }
  return "caution";
};

const toneStyles: Record<ActionTone, string> = {
  urgent: "border-danger/40 bg-danger/15 text-danger",
  caution: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
  positive: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
};

const extractActions = (text?: string) => {
  if (!text) return [];
  const rawLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = rawLines.filter((line) =>
    /^(\*+|-|\d+\.)\s*/.test(line.toLowerCase())
  );
  const fallback = text
    .split(".")
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const source = candidates.length > 0 ? candidates : fallback;
  const actions = source
    .map((line) => line.replace(/^(\*+|-|\d+\.)\s*/, ""))
    .filter((line) => line.length > 0)
    .slice(0, 3)
    .map((line) => ({ text: line, tone: classifyActionTone(line) }));

  return actions;
};

const getRecommendationTone = (text?: string) => {
  if (!text) {
    return {
      label: "Pendiente",
      container: "border-border/70 bg-surface-muted/30",
      badge: "bg-surface-muted text-muted border-border/60",
    };
  }
  const value = text.toLowerCase();
  const urgent =
    value.includes("vender") ||
    value.includes("reduce") ||
    value.includes("reducir") ||
    value.includes("salir") ||
    value.includes("cerrar") ||
    value.includes("stop") ||
    value.includes("urgente") ||
    value.includes("riesgo alto");
  if (urgent) {
    return {
      label: "Urgente",
      container: "border-danger/40 bg-danger/10",
      badge: "bg-danger/15 text-danger border-danger/40",
    };
  }
  const opportunity =
    value.includes("comprar") ||
    value.includes("aumentar") ||
    value.includes("acumular") ||
    value.includes("entrada") ||
    value.includes("aprovechar");
  if (opportunity) {
    return {
      label: "Oportunidad",
      container: "border-emerald-500/35 bg-emerald-500/10",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    };
  }
  return {
    label: "Neutral",
    container: "border-border/70 bg-surface-muted/30",
    badge: "bg-surface-muted text-muted border-border/60",
  };
};

export function AgentsCatalog() {
  const { holdings } = usePortfolioData();
  const { currency } = useCurrency();
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
    const prompt = buildTickerPrompt(holding, currency);
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
    <div className="space-y-4">
      <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-1">
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
                  "min-w-[160px] rounded-md border border-border bg-surface px-3 py-2 text-left text-xs transition hover:border-accent/50 hover:bg-surface-muted/60",
                  isActive && "border-accent/70 bg-surface-muted/70 shadow-panel"
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-xs font-semibold text-text">{holding.ticker}</p>
                  <p className="text-[11px] text-muted">{pnlText}</p>
                  <p className="text-[11px] text-muted">
                    {formatNumber(holding.totalQuantity, 4)} uds · media{" "}
                    {formatCurrency(holding.averageBuyPrice, currency)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="space-y-4">
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
                    {formatNumber(selectedHolding.totalQuantity, 4)} uds · media{" "}
                    {formatCurrency(selectedHolding.averageBuyPrice, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">P&L</p>
                  <p className="text-sm text-text/90">
                    {formatCurrency(selectedHolding.pnlValue, currency)} ({formatNumber(
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

        <Card
          title="Lista de recomendaciones"
          subtitle="Una recomendacion por ticker"
          className="space-y-4"
        >
          {holdings.length === 0 ? (
            <p className="text-sm text-muted">Carga tu cartera para ver recomendaciones.</p>
          ) : (
            <div className="space-y-4">
              {holdings.map((holding) => {
                const recommendation = recommendations[holding.ticker];
                const tone = getRecommendationTone(recommendation);
                return (
                  <div
                    key={holding.ticker}
                    className={cn(
                      "rounded-xl border p-4 transition",
                      tone.container,
                      "hover:shadow-panel"
                    )}
                  >
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text">{holding.ticker}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
                              tone.badge
                            )}
                          >
                            {tone.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted">
                          {formatNumber(holding.totalQuantity, 4)} uds · avg{" "}
                          {formatNumber(holding.averageBuyPrice)}
                        </p>
                        <p className="text-xs text-muted">
                          Actual {formatCurrency(holding.currentPrice, currency)} · P&L{" "}
                          {formatNumber(holding.pnlPercent)}%
                        </p>
                        <p className="text-xs text-muted">
                          Valor {formatCurrency(holding.marketValue, currency)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {loadingAll && loadingTicker === holding.ticker ? (
                          <p className="text-sm text-muted">Generando...</p>
                        ) : (
                          <>
                            <p className="text-xs uppercase tracking-[0.08em] text-muted">
                              Acciones sugeridas
                            </p>
                            {extractActions(recommendation).length === 0 ? (
                              <p className="text-sm text-muted">Sin recomendacion aun.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2 text-sm">
                                {extractActions(recommendation).map((action) => (
                                  <span
                                    key={action.text}
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-xs font-semibold",
                                      toneStyles[action.tone]
                                    )}
                                  >
                                    {action.text}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
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
