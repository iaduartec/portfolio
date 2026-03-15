"use client";

import { useMemo } from "react";
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from "recharts";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { convertCurrency, formatCurrency } from "@/lib/formatters";
import type { Holding } from "@/types/portfolio";
import { isFundTicker, isNonInvestmentTicker } from "@/lib/portfolioGroups";

const KNOWN_SECTORS: Record<string, string> = {
  "AAPL": "Tecnología",
  "MSFT": "Tecnología",
  "GOOGL": "Tecnología",
  "GOOG": "Tecnología",
  "NVDA": "Tecnología",
  "TSLA": "Consumo Discrecional",
  "AMZN": "Consumo Discrecional",
  "META": "Comunicaciones",
  "JNJ": "Salud",
  "JPM": "Finanzas",
  "V": "Finanzas",
  "XOM": "Energía",
  "REP": "Energía",
  "IBE": "Servicios Públicos",
  "SAN": "Finanzas",
  "BBVA": "Finanzas",
  "ITX": "Consumo Discrecional",
  "IT": "Tecnología",
  "PFE": "Salud",
  "BTC-USD": "Criptomonedas",
  "ETH-USD": "Criptomonedas",
};

const CustomizedContent = (props: any) => {
  const { depth, x, y, width, height, name, fill } = props;

  // Only render inner nodes containing something
  if (depth !== 1 || width < 30 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill,
          stroke: "#141923",
          strokeWidth: 2,
          strokeOpacity: 0.8,
          fillOpacity: 0.8,
        }}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={12}
          fontWeight="bold"
          dominantBaseline="central"
          style={{ pointerEvents: "none", textShadow: "0px 1px 3px rgba(0,0,0,0.8)" }}
        >
          {name}
        </text>
      )}
    </g>
  );
};

interface SectorTreemapProps {
  holdings: Holding[];
}

export function SectorTreemap({ holdings }: SectorTreemapProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();

  const data = useMemo(() => {
    const sectorsMap = new Map<string, { name: string; size: number; children: { name: string; size: number; fill: string }[] }>();

    holdings.forEach((h) => {
      if (isNonInvestmentTicker(h.ticker)) return;
      if (h.marketValue <= 0) return;

      const val = convertCurrency(h.marketValue, h.currency || baseCurrency, fxRate, baseCurrency);

      let sectorName = "Otros";
      let color = "#3bc2ff";

      if (isFundTicker(h.ticker)) {
        sectorName = "Fondos / ETFs";
        color = "#a78bfa";
      } else {
        const core = h.ticker.includes(":") ? h.ticker.split(":")[1] : h.ticker;
        if (KNOWN_SECTORS[core]) {
          sectorName = KNOWN_SECTORS[core];
        }
        
        // Colors mapping by sector approximately
        if (sectorName === "Tecnología") color = "#3bc2ff";
        else if (sectorName === "Finanzas") color = "#48d597";
        else if (sectorName === "Salud") color = "#ef4444";
        else if (sectorName === "Energía") color = "#facc15";
        else if (sectorName === "Consumo Discrecional") color = "#f472b6";
        else if (sectorName === "Comunicaciones") color = "#60a5fa";
        else if (sectorName === "Criptomonedas") color = "#f59e0b";
        else color = "#9ca3af";
      }

      if (!sectorsMap.has(sectorName)) {
        sectorsMap.set(sectorName, { name: sectorName, size: 0, children: [] });
      }

      const sector = sectorsMap.get(sectorName)!;
      sector.size += val;
      sector.children.push({ name: h.ticker, size: val, fill: color });
    });

    return Array.from(sectorsMap.values()).sort((a, b) => b.size - a.size);
  }, [holdings, baseCurrency, fxRate]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-surface-muted/30 p-3 text-sm text-muted">
        Insuficientes datos para calcular exposición por sector.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">Exposición Sectorial</h3>
        <p className="text-xs text-muted">
          Distribución del valor de mercado agrupado por sectores principales y fondos.
        </p>
      </div>
      <div className="h-[300px] overflow-hidden rounded-2xl border border-border bg-surface-muted/30">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            fill="#8884d8"
            content={(props: any) => <CustomizedContent {...props} />}
            isAnimationActive={false}
          >
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const node = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border bg-surface p-3 shadow-panel">
                      <p className="text-sm font-semibold text-text">{node.name}</p>
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(node.size, currency)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
