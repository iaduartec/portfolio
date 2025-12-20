export type TransactionType = "BUY" | "SELL";

export interface Transaction {
  date: string; // YYYY-MM-DD
  ticker: string;
  type: TransactionType;
  quantity: number;
  price: number;
  fee?: number;
}
