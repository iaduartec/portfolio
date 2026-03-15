import type { CurrencyCode } from "@/lib/formatters";
import type { InvestmentAccount } from "@/types/transactions";

export interface PricePoint {
  ticker: string;
  price: number;
  asOf?: string;
}

export interface Holding {
  ticker: string;
  name?: string;
  currency: CurrencyCode;
  account?: InvestmentAccount;
  totalQuantity: number;
  averageBuyPrice: number;
  averageBuyPriceRaw?: number;
  currentPrice: number;
  currentPriceRaw?: number;
  dayChange?: number;
  dayChangePercent?: number;
  marketValue: number;
  marketValueRaw?: number;
  pnlValue: number;
  pnlPercent: number;
  pnlStockValue?: number;
  pnlFxValue?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  dailyPnl: number;
  totalPnl: number;
}

export interface RealizedTrade {
  id: string;
  ticker: string;
  name?: string;
  currency: CurrencyCode;
  account?: InvestmentAccount;
  date: string;
  quantity: number;
  entryPrice: number;
  entryPriceRaw?: number;
  exitPrice: number;
  exitPriceRaw?: number;
  pnlValue: number;
  pnlValueRaw?: number;
  currentPrice?: number;
  postSalePnlValue?: number;
  postSaleOutcome?: "MISSED_GAIN" | "AVOIDED_LOSS" | "FLAT";
}
