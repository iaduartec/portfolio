'use client';

import React, { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Holding } from '@/types/portfolio';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { formatCurrency, convertCurrency } from '@/lib/formatters';

interface SectorTreemapProps {
  holdings: Holding[];
  isPrivate?: boolean;
}

const KNOWN_SECTORS: Record<string, string> = {
  'REP.MC': 'Energía',
  'AAPL': 'Tecnología',
  'MSFT': 'Tecnología',
  'NVDA': 'Tecnología',
  'GOOGL': 'Comunicación',
  'AMZN': 'Consumo Cíclico',
};

const SECTOR_COLORS: Record<string, string> = {
  'Tecnología': '#3bc9db',
  'Energía': '#ffa94d',
  'Comunicación': '#74c0fc',
  'Consumo Cíclico': '#ff8787',
  'Fondos / ETFs': '#a78bfa',
  'Otros': '#94a3b8',
};

const isNonInvestmentTicker = (ticker: string) => {
  const t = ticker.toUpperCase();
  return t === 'EUR' || t === 'USD' || t === 'CASH';
};

const isFundTicker = (ticker: string) => {
  const t = ticker.toUpperCase();
  return t.endsWith('.MC') && (t.startsWith('ES0') || t.includes('LU') || t.includes('IE'));
};

const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, name, color } = props;

  if (depth !== 1 || !width || !height) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color || '#8884d8',
          stroke: '#1c1c1e',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {width > 40 && height > 25 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={10}
          fontWeight="bold"
          className="pointer-events-none select-none"
        >
          {name}
        </text>
      )}
    </g>
  );
};

export function SectorTreemap({ holdings, isPrivate = false }: SectorTreemapProps) {
  const { currency, baseCurrency, fxRate } = useCurrency();

  const maskValue = (value: string) => (isPrivate ? "••••••" : value);

  const data = useMemo(() => {
    const sectorsMap = new Map<string, { name: string; size: number; children: { name: string; size: number; color: string }[] }>();

    holdings.forEach((h) => {
      if (isNonInvestmentTicker(h.ticker)) return;
      if (h.marketValue <= 0) return;

      // Convert marketValue (baseCurrency) to display currency
      const val = convertCurrency(h.marketValue, currency, fxRate, baseCurrency);

      let sectorName = "Otros";
      if (isFundTicker(h.ticker)) {
        sectorName = "Fondos / ETFs";
      } else {
        const core = h.ticker.includes(":") ? h.ticker.split(":")[1] : h.ticker;
        if (KNOWN_SECTORS[core]) {
          sectorName = KNOWN_SECTORS[core];
        } else if (KNOWN_SECTORS[h.ticker]) {
          sectorName = KNOWN_SECTORS[h.ticker];
        }
      }

      const color = SECTOR_COLORS[sectorName] || SECTOR_COLORS["Otros"];

      const sector = sectorsMap.get(sectorName) || { name: sectorName, size: 0, children: [] };
      sector.size += val;
      sector.children.push({ name: h.ticker, size: val, color });
      sectorsMap.set(sectorName, sector);
    });

    return Array.from(sectorsMap.values()).map(s => ({
      ...s,
      color: SECTOR_COLORS[s.name] || SECTOR_COLORS["Otros"]
    }));
  }, [holdings, currency, fxRate, baseCurrency]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-text">Sectores</h3>
        <p className="text-xs text-muted/60">
          Distribución del valor de mercado agrupado por sectores principales y fondos.
        </p>
      </div>
      <div className="h-[300px] overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-surface-muted/20 to-surface/40">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            stroke="#1c1c1e"
            fill="#8884d8"
            content={<CustomizedContent />}
            isAnimationActive={false}
          >
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const node = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border/75 bg-surface/95 p-3 shadow-panel backdrop-blur-md">
                      <p className="text-[10px] uppercase tracking-widest text-muted/60 font-bold mb-1">{node.name}</p>
                      <p className="text-sm font-bold text-primary">
                        {maskValue(formatCurrency(node.size, currency))}
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
