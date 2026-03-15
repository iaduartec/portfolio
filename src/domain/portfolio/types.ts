export type CurrencyCode = string;

export type TradeSide = "BUY" | "SELL";

export type CashTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "INTEREST"
  | "FEE"
  | "TAX";

export interface Asset {
  symbol: string;
  name: string;
  currency: CurrencyCode;
  lastPrice: number;
  lastFxRateToBase: number;
}

export interface Trade {
  id: string;
  assetSymbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number;
  currency: CurrencyCode;
  fxRateToBase: number;
  executedAt: string;
}

export interface CashTransaction {
  id: string;
  type: CashTransactionType;
  amount: number;
  currency: CurrencyCode;
  fxRateToBase: number;
  createdAt: string;
}

export interface DividendTransaction {
  id: string;
  assetSymbol: string;
  amount: number;
  fee: number;
  currency: CurrencyCode;
  fxRateToBase: number;
  paidAt: string;
}

export interface FxRate {
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  rate: number;
  asOf: string;
}

export interface Position {
  assetSymbol: string;
  assetName: string;
  assetCurrency: CurrencyCode;
  baseCurrency: CurrencyCode;
  totalBoughtQty: number;
  totalSoldQty: number;
  openQty: number;
  averageCostPerUnitBase: number;
  remainingCostBasisBase: number;
  marketValueBase: number;
  unrealizedPnLBase: number;
  unrealizedReturnPct: number | null;
  realizedPnLAllTimeBase: number;
}

export interface PortfolioSummary {
  baseCurrency: CurrencyCode;
  cashBalanceBase: number;
  investedCostBasisBase: number;
  portfolioMarketValueBase: number;
  unrealizedPnLBase: number;
  realizedPnLAllTimeBase: number;
  incomeAllTimeBase: number;
  totalReturnBase: number;
  totalReturnPct: number | null;
  positions: Position[];
}

export interface PeriodPnL {
  realizedPnLBase: number;
  incomeBase: number;
  feesBase: number;
  taxesBase: number;
  netPnLBase: number;
  sellCount: number;
  dividendCount: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface SampleDataset {
  baseCurrency: CurrencyCode;
  trades: Trade[];
  dividends: DividendTransaction[];
  cashTransactions: CashTransaction[];
  marketData: Asset[];
}
