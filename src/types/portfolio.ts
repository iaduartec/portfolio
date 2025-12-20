export interface PricePoint {
  ticker: string;
  price: number;
  asOf?: string;
}

export interface Holding {
  ticker: string;
  totalQuantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  pnlValue: number;
  pnlPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  dailyPnl: number;
  totalPnl: number;
}
