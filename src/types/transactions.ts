export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "FEE" | "OTHER";
export type InvestmentAccount = "BROKERAGE" | "ROBO_ADVISOR" | "UNASSIGNED";

import type { CurrencyCode } from "@/lib/formatters";

export interface Transaction {
  date: string; // YYYY-MM-DD
  ticker: string;
  name?: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee?: number;
  currency?: CurrencyCode;
  fxRate?: number;
  grossAmount?: number;
  account?: InvestmentAccount;
}
