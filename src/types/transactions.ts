export type TransactionType = "BUY" | "SELL" | "DIVIDEND" | "FEE" | "OTHER";

import type { CurrencyCode } from "@/lib/formatters";

export interface Transaction {
  date: string; // YYYY-MM-DD
  ticker: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee?: number;
  currency?: CurrencyCode;
}
