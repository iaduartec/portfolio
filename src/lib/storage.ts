import { Transaction } from "@/types/transactions";

export const TRANSACTIONS_STORAGE_KEY = "myinvestview:transactions";
export const SESSION_ID_KEY = "myinvestview:session-id";
export const TRANSACTIONS_UPDATED_EVENT = "myinvestview:transactions-updated";

export const parseTransactions = (raw: string | null): Transaction[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Transaction[]) : [];
  } catch {
    return [];
  }
};

export const loadStoredTransactions = (): Transaction[] => {
  if (typeof window === "undefined") return [];
  return parseTransactions(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY));
};

export const persistTransactions = (transactions: Transaction[]): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    window.dispatchEvent(new Event(TRANSACTIONS_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
};
