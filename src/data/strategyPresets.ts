export const INDICATOR_FILTER_OPTIONS = [
  { id: "sma20", label: "SMA 20" },
  { id: "ema50", label: "EMA 50" },
  { id: "ema200", label: "EMA 200" },
  { id: "bollinger", label: "Bollinger" },
  { id: "vwap", label: "VWAP" },
  { id: "macd", label: "MACD" },
  { id: "atrBands", label: "ATR bandas" },
  { id: "supertrend", label: "Supertrend" },
  { id: "ichimoku", label: "Ichimoku" },
  { id: "pivots", label: "Pivots" },
] as const;

export type IndicatorFilterKey = (typeof INDICATOR_FILTER_OPTIONS)[number]["id"];

export const DEFAULT_INDICATOR_FILTERS: Record<IndicatorFilterKey, boolean> = {
  sma20: true,
  ema50: true,
  ema200: true,
  bollinger: true,
  vwap: true,
  macd: true,
  atrBands: false,
  supertrend: true,
  ichimoku: true,
  pivots: true,
};

export const PATTERN_FILTER_OPTIONS = [
  { id: "double-top", label: "Doble techo" },
  { id: "double-bottom", label: "Doble suelo" },
  { id: "triple-top", label: "Triple techo" },
  { id: "triple-bottom", label: "Triple suelo" },
  { id: "head-shoulders", label: "H-C-H" },
  { id: "inverse-head-shoulders", label: "HCH Inv." },
  { id: "rising-wedge", label: "Cuña asc." },
  { id: "falling-wedge", label: "Cuña desc." },
  { id: "bullish-flag", label: "Bandera alc." },
  { id: "bearish-flag", label: "Bandera baj." },
  { id: "bullish-pennant", label: "Pennant alc." },
  { id: "bearish-pennant", label: "Pennant baj." },
  { id: "rectangle", label: "Rectángulo" },
  { id: "cup-handle", label: "Copa y Asa" },
  { id: "ascending-triangle", label: "Triangulo asc." },
  { id: "descending-triangle", label: "Triangulo desc." },
  { id: "symmetrical-triangle", label: "Triangulo sim." },
  { id: "rising-channel", label: "Canal asc." },
  { id: "falling-channel", label: "Canal desc." },
  { id: "bullish-engulfing", label: "Engulfing alc." },
  { id: "bearish-engulfing", label: "Engulfing baj." },
  { id: "doji", label: "Doji" },
  { id: "hammer", label: "Martillo" },
  { id: "hanging-man", label: "H. Colgado" },
  { id: "shooting-star", label: "Estrella Fugaz" },
  { id: "inverted-hammer", label: "Martillo Inv." },
] as const;

export type PatternFilterKey = (typeof PATTERN_FILTER_OPTIONS)[number]["id"];

export const DEFAULT_PATTERN_FILTERS: Record<PatternFilterKey, boolean> = {
  "double-top": true,
  "double-bottom": true,
  "triple-top": true,
  "triple-bottom": true,
  "head-shoulders": true,
  "inverse-head-shoulders": true,
  "rising-wedge": true,
  "falling-wedge": true,
  "bullish-flag": true,
  "bearish-flag": true,
  "bullish-pennant": true,
  "bearish-pennant": true,
  rectangle: true,
  "cup-handle": true,
  "ascending-triangle": true,
  "descending-triangle": true,
  "symmetrical-triangle": true,
  "rising-channel": true,
  "falling-channel": true,
  "bullish-engulfing": true,
  "bearish-engulfing": true,
  doji: true,
  hammer: true,
  "hanging-man": true,
  "shooting-star": true,
  "inverted-hammer": true,
};

export type StrategyPreset = {
  id: "trend-swing" | "breakout" | "mean-reversion";
  name: string;
  description: string;
  indicators: IndicatorFilterKey[];
  patterns: PatternFilterKey[];
};

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "trend-swing",
    name: "Trend Swing",
    description: "Prioriza tendencia y continuidad de momentum.",
    indicators: ["ema50", "ema200", "sma20", "supertrend", "ichimoku", "macd", "pivots"],
    patterns: [
      "bullish-flag",
      "bearish-flag",
      "bullish-pennant",
      "bearish-pennant",
      "ascending-triangle",
      "descending-triangle",
      "rising-channel",
      "falling-channel",
      "cup-handle",
      "inverse-head-shoulders",
      "head-shoulders",
    ],
  },
  {
    id: "breakout",
    name: "Breakout",
    description: "Enfocado en rupturas con confirmación de estructura y volatilidad.",
    indicators: ["ema50", "ema200", "vwap", "atrBands", "macd", "supertrend", "pivots"],
    patterns: [
      "ascending-triangle",
      "descending-triangle",
      "symmetrical-triangle",
      "rectangle",
      "rising-wedge",
      "falling-wedge",
      "bullish-engulfing",
      "bearish-engulfing",
    ],
  },
  {
    id: "mean-reversion",
    name: "Mean Reversion",
    description: "Busca extremos y reversión hacia medias dinámicas.",
    indicators: ["sma20", "bollinger", "vwap", "macd"],
    patterns: [
      "double-top",
      "double-bottom",
      "triple-top",
      "triple-bottom",
      "doji",
      "hammer",
      "hanging-man",
      "shooting-star",
      "inverted-hammer",
      "bullish-engulfing",
      "bearish-engulfing",
    ],
  },
];

