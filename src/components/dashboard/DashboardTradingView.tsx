"use client";

import { useEffect, useMemo, useState } from "react";
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
  if (value === undefined || !Number.isFinite(value)) return "N/D";
  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

const toneClass = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return "text-text";
  return value >= 0 ? "text-success" : "text-danger";
};

const recommendationLabel = (ratings: RatingsSnapshot | null) => {
  const raw = (ratings?.recommendationKey ?? "").replace(/_/g, " ").trim();
  if (!raw) return "N/D";
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
  if (!text) return "Sin resumen disponible.";
  return text.length > 420 ? `${text.slice(0, 417)}...` : text;
};

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

  const holdingCurrency = useMemo<CurrencyCode>(
    () => selectedHolding?.currency ?? inferCurrencyFromTicker(selectedHolding?.ticker ?? ""),
    [selectedHolding?.currency, selectedHolding?.ticker]
  );

  const displayedPrice = useMemo(() => {
    if (!selectedHolding) return undefined;
    const rawPrice = quote?.price ?? selectedHolding.currentPrice;
    return convertCurrencyFrom(rawPrice, holdingCurrency, currency, fxRate, baseCurrency);
  }, [baseCurrency, currency, fxRate, holdingCurrency, quote?.price, selectedHolding]);

  const displayedTarget =
    fundamentals?.targetMeanPrice === undefined
      ? undefined
      : convertCurrencyFrom(fundamentals.targetMeanPrice, holdingCurrency, currency, fxRate, baseCurrency);

  if (!selectedHolding) {
    return (
      <section aria-labelledby="local-market-panel-title">
        <Card
          title={<span id="local-market-panel-title">Panel financiero local</span>}
          subtitle="Selecciona una posición para ver gráfico, fundamentales y contexto sin depender de widgets externos."
        >
          <p className="p-4 text-sm text-muted">Selecciona un ticker para cargar el panel local.</p>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="local-market-panel-title">
      <Card
        title={<span id="local-market-panel-title">Panel financiero local</span>}
        subtitle={`${selectedHolding.name || selectedHolding.ticker}${
          selectedHolding.name ? ` (${selectedHolding.ticker})` : ""
        } · Gráfico propio, fundamentales y señal resumida`}
      >
        <div className="grid gap-6">
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
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Precio y momentum</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <p className="text-xs text-muted">Precio actual</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {displayedPrice !== undefined ? formatCurrency(displayedPrice, currency) : "N/D"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Cambio diario</p>
                    <p className={`mt-1 text-xl font-semibold ${toneClass(quote?.dayChangePercent ?? selectedHolding.dayChangePercent)}`}>
                      {quote?.dayChangePercent !== undefined || selectedHolding.dayChangePercent !== undefined
                        ? formatPercent(((quote?.dayChangePercent ?? selectedHolding.dayChangePercent ?? 0) as number) / 100)
                        : "N/D"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">P&L posición</p>
                    <p className={`mt-1 text-xl font-semibold ${toneClass(selectedHolding.pnlPercent)}`}>
                      {formatPercent(selectedHolding.pnlPercent / 100)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Lectura táctica</p>
                    <p className="mt-1 text-sm leading-relaxed text-text">{buildTechnicalRead(selectedHolding, quote)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Snapshot fundamental</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Metric label="PER" value={fundamentals?.trailingPE?.toFixed(2) ?? "N/D"} />
                  <Metric label="P/B" value={fundamentals?.priceToBook?.toFixed(2) ?? "N/D"} />
                  <Metric label="ROE" value={fundamentals?.returnOnEquity !== undefined ? formatPercent(fundamentals.returnOnEquity) : "N/D"} />
                  <Metric label="Valuación" value={valuationLabel(fundamentals)} />
                  <Metric label="Mkt Cap" value={toCompactNumber(fundamentals?.marketCap)} />
                  <Metric
                    label="Precio objetivo"
                    value={displayedTarget !== undefined ? formatCurrency(displayedTarget, currency) : "N/D"}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Consenso y flujo</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Metric label="Consenso" value={recommendationLabel(ratings)} />
                  <Metric label="Score analistas" value={ratings?.recommendationMean?.toFixed(2) ?? "N/D"} />
                  <Metric
                    label="Dividendo"
                    value={dividends?.dividendYield !== undefined ? formatPercent(dividends.dividendYield) : "N/D"}
                  />
                  <Metric
                    label="Payout"
                    value={dividends?.payoutRatio !== undefined ? formatPercent(dividends.payoutRatio) : "N/D"}
                  />
                  <Metric label="Volumen" value={toCompactNumber(quote?.volume)} />
                  <Metric label="Vol. medio" value={toCompactNumber(quote?.avgVolume)} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Perfil de empresa</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.sector && <Tag>{profile.sector}</Tag>}
                {profile?.industry && <Tag>{profile.industry}</Tag>}
                {profile?.country && <Tag>{profile.country}</Tag>}
                {!profile?.sector && !profile?.industry && !profile?.country && <Tag>N/D</Tag>}
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
            </div>

            <div className="rounded-2xl border border-border/70 bg-surface-muted/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Rango y contexto</p>
              <div className="mt-3 grid gap-3">
                <Metric
                  label="52w mínimo"
                  value={
                    quote?.fiftyTwoWeekLow !== undefined
                      ? formatCurrency(
                          convertCurrencyFrom(quote.fiftyTwoWeekLow, holdingCurrency, currency, fxRate, baseCurrency),
                          currency
                        )
                      : "N/D"
                  }
                />
                <Metric
                  label="52w máximo"
                  value={
                    quote?.fiftyTwoWeekHigh !== undefined
                      ? formatCurrency(
                          convertCurrencyFrom(quote.fiftyTwoWeekHigh, holdingCurrency, currency, fxRate, baseCurrency),
                          currency
                        )
                      : "N/D"
                  }
                />
                <Metric label="Valor posición" value={formatCurrency(selectedHolding.marketValue, currency)} />
                <Metric label="Cargando datos" value={isLoading ? "Sí" : "No"} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Este panel ya no usa embeds de TradingView. Tira de histórico local, Yahoo y tus métricas de cartera.
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
    <div className="rounded-xl border border-border/60 bg-surface/45 p-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border/70 bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-text">
      {children}
    </span>
  );
}
