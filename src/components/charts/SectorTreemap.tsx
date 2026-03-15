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
      <defs>
        <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        style={{
          fill: `url(#gradient-${index})`,
          stroke: 'rgba(255,255,255,0.1)',
          strokeWidth: 1,
        }}
        className="transition-all duration-300 hover:opacity-90"
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

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center space-y-3 rounded-2xl border border-white/5 bg-surface/20 p-8 text-center backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/10 text-muted/40">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-text">Sin datos de exposición</h3>
          <p className="text-xs text-muted/60">Agrega activos con valor de mercado para ver tu diversificación.</p>
        </div>
      </div>
    );
  }

  const totalPortfolioValue = data.reduce((sum, sector) => sum + sector.size, 0);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted/80 uppercase tracking-widest flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
           Exposición por Sector
        </h3>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#1c1c1e"
            content={<CustomizedContent />}
          >
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-white/10 bg-surface/95 p-3 shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted/50 mb-1">{item.name}</p>
                      <p className="text-sm font-bold text-text">
                        {maskValue(formatCurrency(item.size, currency))}
                      </p>
                      <p className="text-[10px] font-medium text-success mt-1">
                         {((item.size / (totalPortfolioValue || 1)) * 100).toFixed(1)}% del total
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
