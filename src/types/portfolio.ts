import type { CurrencyCode } from "@/lib/formatters";

export interface PricePoint {
  ticker: string;
  price: number;
  asOf?: string;
}

export interface Holding {
  ticker: string;
  currency: CurrencyCode;
  totalQuantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  dayChange?: number;
  dayChangePercent?: number;
  marketValue: number;
  pnlValue: number;
  pnlPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  dailyPnl: number;
  totalPnl: number;
}

export interface RealizedTrade {
  id: string;
  ticker: string;
  currency: CurrencyCode;
  date: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnlValue: number;
}
