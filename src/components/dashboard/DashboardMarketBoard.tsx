"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/portfolio";

type QuoteRow = {
  symbol: string;
  price?: number;
  dayChangePercent?: number;
};

type MarketTile = {
  symbol: string;
  label: string;
  group: "INDICES" | "MACRO";
  format?: "price" | "fx" | "yield";
};

const MARKET_TILES: MarketTile[] = [
  { symbol: "^GSPC", label: "S&P 500", group: "INDICES" },
  { symbol: "^IXIC", label: "Nasdaq", group: "INDICES" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50", group: "INDICES" },
  { symbol: "^IBEX", label: "IBEX 35", group: "INDICES" },
  { symbol: "^VIX", label: "VIX", group: "MACRO" },
  { symbol: "CL=F", label: "Petróleo", group: "MACRO" },
  { symbol: "GC=F", label: "Oro", group: "MACRO" },
  { symbol: "EURUSD=X", label: "EUR/USD", group: "MACRO", format: "fx" },
];

const formatValue = (value: number | undefined, format: MarketTile["format"] = "price") => {
  if (!Number.isFinite(value)) return "--";
  if (format === "fx") return value!.toFixed(4);
  if (format === "yield") return `${value!.toFixed(2)}%`;
  return value! >= 1000
    ? new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(value!)
    : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value!);
};

const formatMove = (value: number | undefined) => {
  if (!Number.isFinite(value)) return "--";
  return `${value! >= 0 ? "+" : ""}${value!.toFixed(2)}%`;
};

const getTone = (value: number | undefined) => {
  if (!Number.isFinite(value)) return "default" as const;
  if (value! > 0) return "success" as const;
  if (value! < 0) return "danger" as const;
  return "default" as const;
};

const hasQuoteData = (quote?: QuoteRow) =>
  Number.isFinite(quote?.price) || Number.isFinite(quote?.dayChangePercent);

const buildMacroDrivers = (quotes: QuoteRow[]) => {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const items: string[] = [];

  const vixMove = quoteMap.get("^VIX")?.dayChangePercent;
  if (Number.isFinite(vixMove) && Math.abs(vixMove!) >= 4) {
    items.push(vixMove! > 0 ? "La volatilidad está repuntando" : "La volatilidad está relajándose");
  }

  const oilMove = quoteMap.get("CL=F")?.dayChangePercent;
  if (Number.isFinite(oilMove) && Math.abs(oilMove!) >= 1.2) {
    items.push(oilMove! > 0 ? "El petróleo mete presión a costes" : "El petróleo da algo de oxígeno");
  }

  const eurUsdMove = quoteMap.get("EURUSD=X")?.dayChangePercent;
  if (Number.isFinite(eurUsdMove) && Math.abs(eurUsdMove!) >= 0.35) {
    items.push(eurUsdMove! > 0 ? "El euro gana algo de fuerza" : "El dólar gana tracción");
  }

  const equities = ["^GSPC", "^IXIC", "^STOXX50E", "^IBEX"]
    .map((symbol) => quoteMap.get(symbol)?.dayChangePercent)
    .filter((value): value is number => Number.isFinite(value));
  if (equities.length >= 3) {
    const rising = equities.filter((value) => value > 0).length;
    items.push(
      rising >= 3
        ? "El riesgo global abre con amplitud positiva"
        : rising <= 1
          ? "La amplitud de mercado es frágil"
          : "El tono global está mixto"
    );
  }

  return items.slice(0, 3);
};

const buildMarketBreadthLabel = (quotes: QuoteRow[]) => {
  const equityMoves = ["^GSPC", "^IXIC", "^STOXX50E", "^IBEX"]
    .map((symbol) => quotes.find((quote) => quote.symbol === symbol)?.dayChangePercent)
    .filter((value): value is number => Number.isFinite(value));

  if (equityMoves.length < 3) {
    return { label: "Cobertura parcial", tone: "default" as const };
  }

  const positiveCount = equityMoves.filter((value) => value > 0).length;
  if (positiveCount >= 3) return { label: "Amplitud positiva", tone: "success" as const };
  if (positiveCount <= 1) return { label: "Amplitud débil", tone: "danger" as const };
  return { label: "Sesgo mixto", tone: "warning" as const };
};

const buildHeadlineRead = (
  breadth: ReturnType<typeof buildMarketBreadthLabel>,
  strongestMacroTile: {
    tile: MarketTile;
    quote?: QuoteRow;
  } | null,
  macroDrivers: string[],
) => {
  const driverText = strongestMacroTile
    ? `${strongestMacroTile.tile.label} ${formatMove(strongestMacroTile.quote?.dayChangePercent)}`
    : "sin driver macro dominante";

  if (macroDrivers[0]) {
    return `${breadth.label}. Driver principal: ${driverText}. ${macroDrivers[0]}`;
  }

  return `${breadth.label}. Seguimiento de ${driverText}.`;
};

type DashboardMarketBoardProps = {
  holdings: Holding[];
};

export function DashboardMarketBoard({ holdings }: DashboardMarketBoardProps) {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/yahoo?action=price&symbols=${encodeURIComponent(MARKET_TILES.map((tile) => tile.symbol).join(","))}`,
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
      indices: MARKET_TILES.filter((tile) => tile.group === "INDICES"),
      macro: MARKET_TILES.filter((tile) => tile.group === "MACRO"),
    }),
    []
  );
  const coveredQuotesCount = useMemo(
    () => MARKET_TILES.filter((tile) => hasQuoteData(quoteMap.get(tile.symbol.toUpperCase()))).length,
    [quoteMap]
  );

  const dayMovers = useMemo(() => {
    const valid = holdings.filter((holding) => Number.isFinite(holding.dayChangePercent));
    const top = [...valid]
      .sort((a, b) => (b.dayChangePercent ?? 0) - (a.dayChangePercent ?? 0))
      .slice(0, 3);
    const bottom = [...valid]
      .sort((a, b) => (a.dayChangePercent ?? 0) - (b.dayChangePercent ?? 0))
      .slice(0, 3);
    return { top, bottom };
  }, [holdings]);

  const macroDrivers = useMemo(() => buildMacroDrivers(quotes), [quotes]);
  const breadth = useMemo(() => buildMarketBreadthLabel(quotes), [quotes]);
  const strongestMacroTile = useMemo(() => {
    const macroTiles = MARKET_TILES.filter((tile) => tile.group === "MACRO")
      .map((tile) => ({
        tile,
        quote: quoteMap.get(tile.symbol.toUpperCase()),
      }))
      .filter((entry) => Number.isFinite(entry.quote?.dayChangePercent))
      .sort((a, b) => Math.abs(b.quote?.dayChangePercent ?? 0) - Math.abs(a.quote?.dayChangePercent ?? 0));

    return macroTiles[0] ?? null;
  }, [quoteMap]);
  const headlineRead = useMemo(
    () => buildHeadlineRead(breadth, strongestMacroTile, macroDrivers),
    [breadth, strongestMacroTile, macroDrivers]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr,0.9fr]">
      <Card
        title="Mercado hoy"
        subtitle="Panel rápido inspirado en Investing.com: índices, activos macro y lectura táctica."
      >
        <div className="mb-5 grid gap-4">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-muted/30 to-surface-muted/20 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={breadth.tone}>{breadth.label}</Badge>
              <Badge tone="default">{coveredQuotesCount}/{MARKET_TILES.length} activos</Badge>
              <Badge tone={strongestMacroTile ? getTone(strongestMacroTile.quote?.dayChangePercent) : "default"}>
                {strongestMacroTile ? strongestMacroTile.tile.label : "Sin señal dominante"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text">{headlineRead}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CompactSignal
              label="Cobertura"
              value={`${coveredQuotesCount}/${MARKET_TILES.length}`}
              detail={breadth.label}
            />
            <CompactSignal
              label="Driver macro"
              value={strongestMacroTile ? strongestMacroTile.tile.label : "Ninguno"}
              detail={strongestMacroTile ? formatMove(strongestMacroTile.quote?.dayChangePercent) : "Sin desplazamiento"}
            />
            <CompactSignal
              label="Señal inmediata"
              value={macroDrivers[0] ? "Activa" : "Neutral"}
              detail={macroDrivers[0] ?? "Sin suficiente movimiento para una lectura táctica."}
              className="sm:col-span-2"
            />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {[
            { title: "Índices mundiales", items: groupedTiles.indices },
            { title: "Activos macro", items: groupedTiles.macro },
          ].map((section) => (
            <div key={section.title} className="rounded-xl border border-border/60 bg-surface-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{section.title}</p>
                <Badge tone="default">
                  {
                    section.items.filter((tile) => hasQuoteData(quoteMap.get(tile.symbol.toUpperCase()))).length
                  }/{section.items.length} seguidos
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
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/60 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-text">{tile.label}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{tile.symbol}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text">
                          {formatValue(quote?.price, tile.format)}
                        </p>
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
                    Sin cobertura suficiente para esta cesta ahora mismo.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6">
        <Card title="Claves del día" subtitle="Señales rápidas para no mirar solo el ticker.">
          <div className="flex flex-col gap-3">
            {macroDrivers.length > 0 ? (
              macroDrivers.map((driver, index) => (
                <div
                  key={driver}
                  className="rounded-lg border border-border/60 bg-surface-muted/40 px-3 py-3 text-sm text-text"
                >
                  <span className="mr-2 text-xs font-semibold text-primary/85">{index + 1}.</span>
                  {driver}
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-border/60 bg-surface-muted/40 px-3 py-3 text-sm text-muted">
                Sin suficiente cobertura de mercado para resumir el tono global ahora mismo.
              </p>
            )}
          </div>
        </Card>

        <Card title="Movers de tu cartera" subtitle="Lo que más se mueve hoy dentro de tus posiciones abiertas.">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Mejores", items: dayMovers.top, empty: "Todavía no hay ganadores claros en cartera." },
              { title: "Peores", items: dayMovers.bottom, empty: "Todavía no hay perdedores claros en cartera." },
            ].map((group) => (
              <div key={group.title} className="rounded-xl border border-border/60 bg-surface-muted/40 p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-muted">{group.title}</p>
                <div className="grid gap-3">
                  {group.items.length > 0 ? (
                    group.items.map((holding) => (
                      <div
                        key={`${group.title}-${holding.ticker}`}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/60 px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-text">{holding.ticker}</p>
                          <p className="text-xs text-muted">{holding.name ?? holding.ticker}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text">{holding.currentPrice.toFixed(2)}</p>
                          <p
                            className={cn(
                              "text-xs font-medium",
                              (holding.dayChangePercent ?? 0) >= 0 ? "text-success" : "text-danger"
                            )}
                          >
                            {formatMove(holding.dayChangePercent)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-border/50 bg-surface/60 px-3 py-3 text-sm text-muted">
                      {group.empty}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CompactSignal({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-surface-muted/35 p-4", className)}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
    </div>
  );
}
