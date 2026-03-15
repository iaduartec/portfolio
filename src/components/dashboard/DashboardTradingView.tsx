"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  convertCurrencyFrom,
  formatCurrency,
  formatPercent,
  inferCurrencyFromTicker,
  type CurrencyCode,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Holding } from "@/types/portfolio";

interface DashboardTradingViewProps {
  selectedHolding: Holding | undefined;
}

type QuoteSnapshot = {
  symbol: string;
  price?: number;
  dayChangePercent?: number;
  volume?: number;
  avgVolume?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
};

type FundamentalsSnapshot = {
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  marketCap?: number;
  returnOnEquity?: number;
  targetMeanPrice?: number;
};

type RatingsSnapshot = {
  recommendationMean?: number;
  recommendationKey?: string;
};

type DividendsSnapshot = {
  dividendYield?: number;
  payoutRatio?: number;
};

type ProfileSnapshot = {
  sector?: string;
  industry?: string;
  country?: string;
  website?: string;
  longBusinessSummary?: string;
};

const toCompactNumber = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return "No disponible";
  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

const recommendationLabel = (ratings: RatingsSnapshot | null) => {
  const raw = (ratings?.recommendationKey ?? "").replace(/_/g, " ").trim();
  if (!raw) return "Sin consenso";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const valuationLabel = (fundamentals: FundamentalsSnapshot | null) => {
  const pe = fundamentals?.trailingPE;
  const pb = fundamentals?.priceToBook;
  if (pe !== undefined && pe > 40) return "Exigente";
  if (pb !== undefined && pb > 8) return "Exigente";
  if (pe !== undefined && pe > 0 && pe < 18) return "Moderada";
  if (pb !== undefined && pb > 0 && pb < 3) return "Moderada";
  return "Neutral";
};

const buildTechnicalRead = (holding: Holding, quote: QuoteSnapshot | null) => {
  const dayChangePercent = quote?.dayChangePercent ?? holding.dayChangePercent;
  const totalPnlPercent = holding.pnlPercent;
  if (dayChangePercent !== undefined && dayChangePercent >= 2 && totalPnlPercent >= 0) {
    return "Momentum diario positivo con la posicion ya en beneficios.";
  }
  if (dayChangePercent !== undefined && dayChangePercent <= -2 && totalPnlPercent < 0) {
    return "Debilidad diaria y estructura de posicion deteriorada; exige control de riesgo.";
  }
  if (totalPnlPercent >= 15) {
    return "Posicion ganadora; vigila toma parcial de beneficios y soportes recientes.";
  }
  if (totalPnlPercent <= -10) {
    return "Posicion castigada; revisa si el deterioro es tactico o ya fundamental.";
  }
  return "Estructura mixta; conviene esperar confirmacion adicional antes de mover tamaño.";
};

const trimSummary = (text?: string) => {
  if (!text) return "Sin resumen disponible para este activo.";
  return text.length > 420 ? `${text.slice(0, 417)}...` : text;
};

const formatMetricValue = (value?: number, digits = 2) =>
  value !== undefined && Number.isFinite(value) ? value.toFixed(digits) : "No disponible";

const formatPercentMetric = (value?: number) =>
  value !== undefined && Number.isFinite(value) ? formatPercent(value) : "No disponible";

const buildDataQualityLabel = (
  quote: QuoteSnapshot | null,
  fundamentals: FundamentalsSnapshot | null,
  ratings: RatingsSnapshot | null,
  dividends: DividendsSnapshot | null,
  profile: ProfileSnapshot | null,
) => {
  const loadedBlocks = [quote, fundamentals, ratings, dividends, profile].filter(Boolean).length;
  if (loadedBlocks >= 4) return "Cobertura alta";
  if (loadedBlocks >= 2) return "Cobertura media";
  return "Cobertura limitada";
};

const buildExecutiveSummary = (
  holding: Holding,
  quote: QuoteSnapshot | null,
  fundamentals: FundamentalsSnapshot | null,
  ratings: RatingsSnapshot | null,
) => {
  const dayMove = quote?.dayChangePercent ?? holding.dayChangePercent;
  const pnl = holding.pnlPercent;
  const recMean = ratings?.recommendationMean;
  const valuation = valuationLabel(fundamentals);

  if (dayMove !== undefined && dayMove >= 2 && pnl >= 0) {
    return "Impulso favorable y posición en verde; el foco debería estar en gestionar continuación y no en rescatar la posición.";
  }
  if (dayMove !== undefined && dayMove <= -2 && pnl < 0) {
    return "Sesgo débil en precio y en cartera; aquí importa más proteger capital que buscar rebote sin confirmación.";
  }
  if (recMean !== undefined && recMean <= 2.2 && valuation !== "Exigente") {
    return "El consenso acompaña y la valoración no parece extrema; es una de las configuraciones más limpias del panel.";
  }
  if (valuation === "Exigente" && pnl >= 10) {
    return "La posición ha funcionado, pero la valoración exige disciplina para no confundir calidad con precio infinito.";
  }
  return "El activo no está roto ni claro; conviene leerlo como seguimiento táctico y esperar mejor confirmación para mover tamaño.";
};

const buildDistanceLabel = (
  currentValue: number | undefined,
  referenceValue: number | undefined,
  currency: CurrencyCode,
) => {
  if (
    currentValue === undefined ||
    referenceValue === undefined ||
    !Number.isFinite(currentValue) ||
    !Number.isFinite(referenceValue)
  ) {
    return "No disponible";
  }

  const diff = currentValue - referenceValue;
  const pct = referenceValue !== 0 ? diff / referenceValue : 0;
  return `${diff >= 0 ? "+" : ""}${formatCurrency(diff, currency)} · ${formatPercent(pct)}`;
};

const buildSignalTone = (holding: Holding, quote: QuoteSnapshot | null) => {
  const dayMove = quote?.dayChangePercent ?? holding.dayChangePercent;
  const pnl = holding.pnlPercent;

  if (dayMove !== undefined && dayMove >= 2 && pnl >= 0) {
    return {
      label: "Impulso favorable",
      tone: "success" as const,
      detail: "Precio y posición empujan en la misma dirección.",
    };
  }

  if (dayMove !== undefined && dayMove <= -2 && pnl < 0) {
    return {
      label: "Presión defensiva",
      tone: "danger" as const,
      detail: "La sesión refuerza una posición ya débil.",
    };
  }

  return {
    label: "Seguimiento táctico",
    tone: "default" as const,
    detail: "No hay confirmación suficiente para sobrerreaccionar.",
  };
};

const hasFundamentalData = (fundamentals: FundamentalsSnapshot | null) =>
  [
    fundamentals?.trailingPE,
    fundamentals?.priceToBook,
    fundamentals?.marketCap,
    fundamentals?.returnOnEquity,
    fundamentals?.targetMeanPrice,
  ].some((value) => Number.isFinite(value));

const hasFlowData = (quote: QuoteSnapshot | null, ratings: RatingsSnapshot | null, dividends: DividendsSnapshot | null) =>
  [
    quote?.volume,
    quote?.avgVolume,
    ratings?.recommendationMean,
    dividends?.dividendYield,
    dividends?.payoutRatio,
  ].some((value) => Number.isFinite(value)) || Boolean(ratings?.recommendationKey);

const hasProfileData = (profile: ProfileSnapshot | null) =>
  Boolean(profile?.sector || profile?.industry || profile?.country || profile?.website || profile?.longBusinessSummary);

const hasRangeData = (quote: QuoteSnapshot | null) =>
  [quote?.fiftyTwoWeekLow, quote?.fiftyTwoWeekHigh].some((value) => Number.isFinite(value));

export function DashboardTradingView({ selectedHolding }: DashboardTradingViewProps) {
  const { currency, fxRate, baseCurrency } = useCurrency();
  const [panelData, setPanelData] = useState<{
    ticker: string | null;
    quote: QuoteSnapshot | null;
    fundamentals: FundamentalsSnapshot | null;
    ratings: RatingsSnapshot | null;
    dividends: DividendsSnapshot | null;
    profile: ProfileSnapshot | null;
  }>({
    ticker: null,
    quote: null,
    fundamentals: null,
    ratings: null,
    dividends: null,
    profile: null,
  });

  const activeTicker = selectedHolding?.ticker ?? null;

  useEffect(() => {
    if (!activeTicker) return;

    let ignore = false;

    const loadPanel = async () => {
      try {
        const response = await fetch(`/api/yahoo?action=snapshot&symbol=${encodeURIComponent(activeTicker)}`, { cache: "no-store" });
        if (ignore) return;
        
        const json = await response.json();
        const data = json.data ?? {};

        setPanelData({
          ticker: activeTicker,
          quote: data.quote ?? null,
          fundamentals: data.fundamentals ?? null,
          ratings: data.ratings ?? null,
          dividends: data.dividends ?? null,
          profile: data.profile ?? null,
        });
      } catch {
        if (!ignore) {
          setPanelData({
            ticker: activeTicker,
            quote: null,
            fundamentals: null,
            ratings: null,
            dividends: null,
            profile: null,
          });
        }
      }
    };

    void loadPanel();

    return () => {
      ignore = true;
    };
  }, [activeTicker]);

  const quote = panelData.ticker === activeTicker ? panelData.quote : null;
  const fundamentals = panelData.ticker === activeTicker ? panelData.fundamentals : null;
  const ratings = panelData.ticker === activeTicker ? panelData.ratings : null;
  const dividends = panelData.ticker === activeTicker ? panelData.dividends : null;
  const profile = panelData.ticker === activeTicker ? panelData.profile : null;
  const isLoading = Boolean(activeTicker) && panelData.ticker !== activeTicker;

  if (!selectedHolding) {
    return (
      <section aria-labelledby="local-market-panel-title">
        <Card
          title={<span id="local-market-panel-title">Panel financiero local</span>}
          subtitle="Selecciona una posición para ver gráfico, fundamentales y contexto sin depender de widgets externos."
        >
          <p className="p-4 text-sm text-muted">Selecciona un activo para cargar el panel local.</p>
        </Card>
      </section>
    );
  }

  const holdingCurrency: CurrencyCode =
    selectedHolding.currency ?? inferCurrencyFromTicker(selectedHolding.ticker ?? "");

  const displayedPrice = convertCurrencyFrom(
    quote?.price ?? selectedHolding.currentPrice,
    holdingCurrency,
    currency,
    fxRate,
    baseCurrency
  );

  const displayedTarget =
    fundamentals?.targetMeanPrice === undefined
      ? undefined
      : convertCurrencyFrom(fundamentals.targetMeanPrice, holdingCurrency, currency, fxRate, baseCurrency);

  const displayedRangeLow =
    quote?.fiftyTwoWeekLow === undefined
      ? undefined
      : convertCurrencyFrom(quote.fiftyTwoWeekLow, holdingCurrency, currency, fxRate, baseCurrency);

  const displayedRangeHigh =
    quote?.fiftyTwoWeekHigh === undefined
      ? undefined
      : convertCurrencyFrom(quote.fiftyTwoWeekHigh, holdingCurrency, currency, fxRate, baseCurrency);

  const displayedAverageBuyPrice = convertCurrencyFrom(
    selectedHolding.averageBuyPrice,
    holdingCurrency,
    currency,
    fxRate,
    baseCurrency
  );

  const dataQualityLabel = buildDataQualityLabel(quote, fundamentals, ratings, dividends, profile);
  const executiveSummary = buildExecutiveSummary(selectedHolding, quote, fundamentals, ratings);
  const signalTone = buildSignalTone(selectedHolding, quote);
  const tacticalRead = buildTechnicalRead(selectedHolding, quote);
  const fundamentalsAvailable = hasFundamentalData(fundamentals);
  const flowAvailable = hasFlowData(quote, ratings, dividends);
  const profileAvailable = hasProfileData(profile);
  const rangeAvailable = hasRangeData(quote);

  return (
    <section aria-labelledby="local-market-panel-title">
      <Card
        title={<span id="local-market-panel-title">Panel financiero local</span>}
        subtitle={`${selectedHolding.name || selectedHolding.ticker}${
          selectedHolding.name ? ` (${selectedHolding.ticker})` : ""
        } · Gráfico propio, fundamentales y señal resumida`}
      >
        <div className="grid gap-6">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-muted/35 to-surface-muted/25 p-5">
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={signalTone.tone}>{signalTone.label}</Tag>
                  <Tag>{dataQualityLabel}</Tag>
                  <Tag>{valuationLabel(fundamentals)}</Tag>
                  <Tag>{recommendationLabel(ratings)}</Tag>
                </div>
                <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-muted">Lectura ejecutiva</p>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text/90">{executiveSummary}</p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <HeroMetric
                  label="Precio"
                  value={displayedPrice !== undefined ? formatCurrency(displayedPrice, currency) : "No disponible"}
                />
                <HeroMetric
                  label="P&L"
                  value={formatPercent(selectedHolding.pnlPercent / 100)}
                  tone={selectedHolding.pnlPercent >= 0 ? "success" : "danger"}
                />
                <HeroMetric
                  label="Cambio día"
                  value={
                    quote?.dayChangePercent !== undefined || selectedHolding.dayChangePercent !== undefined
                      ? formatPercent(((quote?.dayChangePercent ?? selectedHolding.dayChangePercent ?? 0) as number) / 100)
                      : "No disponible"
                  }
                  tone={(quote?.dayChangePercent ?? selectedHolding.dayChangePercent ?? 0) >= 0 ? "success" : "danger"}
                  className="sm:col-span-2"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
            <PortfolioValueChart
              ticker={selectedHolding.ticker}
              name={selectedHolding.name || selectedHolding.ticker}
              account={selectedHolding.account}
              showProjectionInsights
              chartHeight={460}
              range="1y"
            />

            <div className="grid gap-4">
              <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Lectura táctica</p>
                  <Tag tone={signalTone.tone}>{signalTone.detail}</Tag>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text">{tacticalRead}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Metric label="Precio medio" value={formatCurrency(displayedAverageBuyPrice, currency)} />
                  <Metric label="Vs precio medio" value={buildDistanceLabel(displayedPrice, displayedAverageBuyPrice, currency)} />
                  <Metric
                    label="Precio objetivo"
                    value={displayedTarget !== undefined ? formatCurrency(displayedTarget, currency) : "No disponible"}
                  />
                  <Metric label="Vs objetivo" value={buildDistanceLabel(displayedTarget, displayedPrice, currency)} />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Resumen fundamental</p>
                {fundamentalsAvailable ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Metric label="PER" value={formatMetricValue(fundamentals?.trailingPE)} />
                    <Metric label="P/B" value={formatMetricValue(fundamentals?.priceToBook)} />
                    <Metric label="ROE" value={formatPercentMetric(fundamentals?.returnOnEquity)} />
                    <Metric label="Valuación" value={valuationLabel(fundamentals)} />
                    <Metric label="Cap. bursátil" value={toCompactNumber(fundamentals?.marketCap)} />
                    <Metric
                      label="Precio objetivo"
                      value={displayedTarget !== undefined ? formatCurrency(displayedTarget, currency) : "No disponible"}
                    />
                  </div>
                ) : (
                  <DataGapMessage text="Este activo no trae suficientes fundamentales en la fuente actual." />
                )}
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Consenso y flujo</p>
                {flowAvailable ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Metric label="Consenso" value={recommendationLabel(ratings)} />
                    <Metric label="Puntuación de analistas" value={formatMetricValue(ratings?.recommendationMean)} />
                    <Metric
                      label="Dividendo"
                      value={formatPercentMetric(dividends?.dividendYield)}
                    />
                    <Metric
                      label="Reparto"
                      value={formatPercentMetric(dividends?.payoutRatio)}
                    />
                    <Metric label="Volumen" value={toCompactNumber(quote?.volume)} />
                    <Metric label="Vol. medio" value={toCompactNumber(quote?.avgVolume)} />
                  </div>
                ) : (
                  <DataGapMessage text="No hay suficiente consenso, dividendo o volumen para una lectura de flujo útil." />
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Perfil de empresa</p>
              {profileAvailable ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile?.sector && <Tag>{profile.sector}</Tag>}
                    {profile?.industry && <Tag>{profile.industry}</Tag>}
                    {profile?.country && <Tag>{profile.country}</Tag>}
                    {!profile?.sector && !profile?.industry && !profile?.country && <Tag>Perfil limitado</Tag>}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text/90">{trimSummary(profile?.longBusinessSummary)}</p>
                  {profile?.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener nofollow"
                      className="mt-4 inline-flex text-sm font-medium text-accent hover:underline"
                    >
                      Visitar web corporativa
                    </a>
                  )}
                </>
              ) : (
                <DataGapMessage text="La fuente actual no trae un perfil descriptivo suficiente para este activo." className="mt-3" />
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Rango y contexto</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {rangeAvailable ? (
                  <>
                    <Metric
                      label="Mínimo 52 sem."
                      value={
                        displayedRangeLow !== undefined ? formatCurrency(displayedRangeLow, currency) : "No disponible"
                      }
                    />
                    <Metric
                      label="Máximo 52 sem."
                      value={
                        displayedRangeHigh !== undefined ? formatCurrency(displayedRangeHigh, currency) : "No disponible"
                      }
                    />
                  </>
                ) : (
                  <DataGapMessage
                    text="No hay rango anual disponible en esta fuente."
                    className="sm:col-span-2"
                  />
                )}
                <Metric label="Valor posición" value={formatCurrency(selectedHolding.marketValue, currency)} />
                <Metric label="Estado de carga" value={isLoading ? "Actualizando" : "Listo"} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Este panel combina histórico local, snapshot de Yahoo y datos reales de tu cartera para darte una lectura más operativa.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-surface/45 p-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-border/60 bg-surface/50 p-3", className)}>
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p
        className={`mt-1 break-words text-lg font-semibold ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Tag({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/10 text-success"
      : tone === "danger"
        ? "border-rose-500/25 bg-rose-500/10 text-danger"
        : "border-border/70 bg-surface/60 text-text";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClassName}`}>
      {children}
    </span>
  );
}

function DataGapMessage({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("rounded-xl border border-border/60 bg-surface/45 px-3 py-3 text-sm text-muted", className)}>
      {text}
    </p>
  );
}
