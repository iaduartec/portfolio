import { Transaction } from "@/types/transactions";

export const TRANSACTIONS_STORAGE_KEY = "myinvestview:transactions";
export const SESSION_ID_KEY = "myinvestview:session-id";
export const TRANSACTIONS_UPDATED_EVENT = "myinvestview:transactions-updated";
export const TRANSACTIONS_SOURCE_KEY = "myinvestview:transactions-source";
export const TRANSACTIONS_VERSION_KEY = "myinvestview:transactions-version";

export type TransactionsSource = "default" | "user";

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

export const loadStoredTransactionsSource = (): TransactionsSource | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRANSACTIONS_SOURCE_KEY);
  return raw === "default" || raw === "user" ? raw : null;
};

export const loadStoredTransactionsVersion = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TRANSACTIONS_VERSION_KEY);
};

export const persistTransactions = (
  transactions: Transaction[],
  options?: {
    source?: TransactionsSource;
    version?: string;
  }
): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    if (options?.source) {
      window.localStorage.setItem(TRANSACTIONS_SOURCE_KEY, options.source);
    }
    if (options?.version !== undefined) {
      window.localStorage.setItem(TRANSACTIONS_VERSION_KEY, options.version);
    }
    window.dispatchEvent(new Event(TRANSACTIONS_UPDATED_EVENT));
    return true;
  } catch {
    return false;
  }
};
