"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuoteRow = {
  symbol: string;
  price?: number;
  dayChangePercent?: number;
};

type FutureTile = {
  symbol: string;
  label: string;
  group: "EQUITY" | "MACRO";
};

const FUTURE_TILES: FutureTile[] = [
  { symbol: "ES=F", label: "S&P 500 Fut." , group: "EQUITY" },
  { symbol: "NQ=F", label: "Nasdaq Fut.", group: "EQUITY" },
  { symbol: "YM=F", label: "Dow Fut.", group: "EQUITY" },
  { symbol: "RTY=F", label: "Russell Fut.", group: "EQUITY" },
  { symbol: "CL=F", label: "Crudo WTI", group: "MACRO" },
  { symbol: "GC=F", label: "Oro", group: "MACRO" },
  { symbol: "ZN=F", label: "T-Note 10Y", group: "MACRO" },
];

const formatValue = (value?: number) => {
  if (!Number.isFinite(value)) return "--";
  return value! >= 1000
    ? new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value!)
    : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value!);
};

const formatMove = (value?: number) => {
  if (!Number.isFinite(value)) return "--";
  return `${value! >= 0 ? "+" : ""}${value!.toFixed(2)}%`;
};

const getTone = (value?: number) => {
  if (!Number.isFinite(value)) return "default" as const;
  if (value! > 0) return "success" as const;
  if (value! < 0) return "danger" as const;
  return "warning" as const;
};

const hasQuoteData = (quote?: QuoteRow) =>
  Number.isFinite(quote?.price) || Number.isFinite(quote?.dayChangePercent);

const buildFuturesSignals = (quotes: QuoteRow[]) => {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote]));
  const equityMoves = ["ES=F", "NQ=F", "YM=F", "RTY=F"]
    .map((symbol) => quoteMap.get(symbol)?.dayChangePercent)
    .filter((value): value is number => Number.isFinite(value));
  const messages: string[] = [];

  if (equityMoves.length >= 3) {
    const positive = equityMoves.filter((value) => value > 0).length;
    const average = equityMoves.reduce((sum, value) => sum + value, 0) / equityMoves.length;
    messages.push(
      positive >= 3
        ? `Los futuros de renta variable vienen constructivos, con amplitud positiva y media de ${average.toFixed(2)}%.`
        : positive <= 1
          ? `Los futuros vienen débiles y con poca amplitud; la media cae ${Math.abs(average).toFixed(2)}%.`
          : `Los futuros de índices vienen mixtos, sin una dirección dominante clara por ahora.`
    );
  }

  const oilMove = quoteMap.get("CL=F")?.dayChangePercent;
  if (Number.isFinite(oilMove) && Math.abs(oilMove!) >= 1) {
    messages.push(
      oilMove! > 0
        ? "El crudo sube con fuerza y puede presionar inflación, transporte e industriales."
        : "El crudo afloja y reduce presión inmediata sobre costes y expectativas de inflación."
    );
  }

  const goldMove = quoteMap.get("GC=F")?.dayChangePercent;
  if (Number.isFinite(goldMove) && Math.abs(goldMove!) >= 0.8) {
    messages.push(
      goldMove! > 0
        ? "El oro está captando flujo defensivo, señal de cautela en el arranque."
        : "El oro cede, señal de menor búsqueda defensiva en esta sesión."
    );
  }

  const noteMove = quoteMap.get("ZN=F")?.dayChangePercent;
  if (Number.isFinite(noteMove) && Math.abs(noteMove!) >= 0.35) {
    messages.push(
      noteMove! > 0
        ? "El Treasury 10Y rebota y sugiere tono más defensivo en tipos."
        : "El Treasury 10Y retrocede y deja más espacio al apetito por riesgo."
    );
  }

  return messages.slice(0, 3);
};

export function DashboardFuturesRadar() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/yahoo?action=price&symbols=${encodeURIComponent(FUTURE_TILES.map((tile) => tile.symbol).join(","))}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as { data?: QuoteRow[] };
        if (!cancelled && Array.isArray(payload.data)) {
          setQuotes(payload.data);
        }
      } catch {
        if (!cancelled) {
          setQuotes([]);
        }
      }
    };

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 120_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const quoteMap = useMemo(
    () => new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote])),
    [quotes]
  );

  const groupedTiles = useMemo(
    () => ({
      equity: FUTURE_TILES.filter((tile) => tile.group === "EQUITY"),
      macro: FUTURE_TILES.filter((tile) => tile.group === "MACRO"),
    }),
    []
  );
  const coveredQuotesCount = useMemo(
    () => FUTURE_TILES.filter((tile) => hasQuoteData(quoteMap.get(tile.symbol.toUpperCase()))).length,
    [quoteMap]
  );

  const futuresSignals = useMemo(() => buildFuturesSignals(quotes), [quotes]);

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Radar de Futuros
        </span>
      }
      subtitle="Lectura rápida de índices, crudo, oro y bonos para anticipar el tono de apertura."
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="grid gap-5 lg:grid-cols-2">
          {[
            { title: "Futuros de índices", items: groupedTiles.equity },
            { title: "Futuros macro", items: groupedTiles.macro },
          ].map((section) => (
            <div key={section.title} className="rounded-xl border border-border/60 bg-surface-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{section.title}</p>
                <Badge tone="default">
                  {
                    section.items.filter((tile) => hasQuoteData(quoteMap.get(tile.symbol.toUpperCase()))).length
                  }/{section.items.length} activos
                </Badge>
              </div>
              <div className="grid gap-3">
                {section.items
                  .filter((tile) => hasQuoteData(quoteMap.get(tile.symbol.toUpperCase())))
                  .map((tile) => {
                  const quote = quoteMap.get(tile.symbol.toUpperCase());
                  const tone = getTone(quote?.dayChangePercent);
                  return (
                    <div
                      key={tile.symbol}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/60 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">{tile.label}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{tile.symbol}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text">{formatValue(quote?.price)}</p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            tone === "success"
                              ? "text-success"
                              : tone === "danger"
                                ? "text-danger"
                                : "text-muted"
                          )}
                        >
                          {formatMove(quote?.dayChangePercent)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {section.items.every((tile) => !hasQuoteData(quoteMap.get(tile.symbol.toUpperCase()))) ? (
                  <p className="rounded-lg border border-border/50 bg-surface/60 px-3 py-3 text-sm text-muted">
                    No hay precios suficientes para esta cesta de futuros ahora mismo.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-surface-muted/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Lectura táctica</p>
            <Badge tone={futuresSignals.length > 0 ? "success" : "default"}>
              {coveredQuotesCount > 0
                ? futuresSignals.length > 0
                  ? "Con señal"
                  : "Sin señal"
                : "Sin cobertura"}
            </Badge>
          </div>
          <div className="flex flex-col gap-3">
            {futuresSignals.length > 0 ? (
              futuresSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-lg border border-border/60 bg-surface/60 px-3 py-3 text-sm text-text"
                >
                  {signal}
                </div>
              ))
            ) : coveredQuotesCount === 0 ? (
              <p className="rounded-lg border border-border/60 bg-surface/60 px-3 py-3 text-sm text-muted">
                El radar no tiene cotizaciones suficientes para construir una lectura útil ahora mismo.
              </p>
            ) : (
              <p className="rounded-lg border border-border/60 bg-surface/60 px-3 py-3 text-sm text-muted">
                No hay suficiente movimiento en futuros para extraer una lectura táctica clara ahora mismo.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
