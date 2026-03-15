"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Papa, { ParseResult } from "papaparse";
import {
  loadStoredTransactions,
  loadStoredTransactionsSource,
  loadStoredTransactionsVersion,
  persistTransactions,
  SESSION_ID_KEY,
  TRANSACTIONS_SOURCE_KEY,
  TRANSACTIONS_STORAGE_KEY,
  TRANSACTIONS_UPDATED_EVENT,
  TRANSACTIONS_VERSION_KEY,
} from "@/lib/storage";
import { Transaction } from "@/types/transactions";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  computeHoldings, 
  computeSummary, 
  computeRealizedTrades, 
  PriceSnapshot 
} from "@/lib/portfolio";
import { backfillTransactionAccounts, toTransaction } from "@/hooks/usePortfolioData.utils";

const DEFAULT_PORTFOLIO_VERSION = "2026-03-15-desktop-default-csvs-v1";
const STORAGE_RESET_KEY = "myinvestview:storage-reset-version";
const STORAGE_RESET_VERSION = "2026-03-15-reset-default-seed-v1";
const DEFAULT_PORTFOLIO_FILES = [
  { file: "/portfolio-seed-2026-03.csv", account: "BROKERAGE" as const },
  { file: "/roboadvisor-revolut-2026-03.csv", account: "ROBO_ADVISOR" as const },
];

const transactionSort = (a: Transaction, b: Transaction) => {
  const timeA = Date.parse(a.date);
  const timeB = Date.parse(b.date);
  if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
    return timeA - timeB;
  }
  return 0;
};

const getTransactionKey = (tx: Transaction) =>
  [
    tx.date,
    tx.ticker,
    tx.type,
    tx.quantity,
    tx.price,
    tx.fee ?? "",
    tx.currency ?? "",
    tx.account ?? "",
    tx.fxRate ?? "",
  ].join("|");

const mergeTransactions = (groups: Transaction[][]) => {
  const merged = new Map<string, Transaction>();

  groups.flat().forEach((tx) => {
    const key = getTransactionKey(tx);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, tx);
      return;
    }
    if (!existing.name && tx.name) {
      merged.set(key, { ...existing, name: tx.name });
    }
  });

  return backfillTransactionAccounts(Array.from(merged.values()).sort(transactionSort));
};

export const dedupeTransactions = (rows: Transaction[]) => {
  const deduped = new Map<string, Transaction>();

  rows.forEach((tx) => {
    const key = [
      tx.date,
      tx.ticker,
      tx.type,
      tx.quantity,
      tx.price,
      tx.fee ?? "",
      tx.currency ?? "",
      tx.account ?? "",
      tx.fxRate ?? "",
      tx.grossAmount ?? "",
    ].join("|");
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, tx);
      return;
    }
    if (!existing.name && tx.name) {
      deduped.set(key, { ...existing, name: tx.name });
    }
  });

  return Array.from(deduped.values()).sort(transactionSort);
};

type PortfolioDataValue = {
  transactions: Transaction[];
  holdings: ReturnType<typeof computeHoldings>;
  summary: ReturnType<typeof computeSummary>;
  realizedTrades: ReturnType<typeof computeRealizedTrades>;
  hasTransactions: boolean;
  isLoading: boolean;
};

const PortfolioDataContext = createContext<PortfolioDataValue | undefined>(undefined);

function usePortfolioDataValue(): PortfolioDataValue {
  const { fxRate, baseCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceSnapshot>>({});
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const normalizeTransactions = (rows: Transaction[]) =>
    dedupeTransactions(backfillTransactionAccounts(rows));

  // Load and sync transactions
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        if (typeof window !== "undefined") {
          const appliedResetVersion = window.localStorage.getItem(STORAGE_RESET_KEY);
          if (appliedResetVersion !== STORAGE_RESET_VERSION) {
            window.localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
            window.localStorage.removeItem(TRANSACTIONS_SOURCE_KEY);
            window.localStorage.removeItem(TRANSACTIONS_VERSION_KEY);
            window.sessionStorage.removeItem(SESSION_ID_KEY);
            window.localStorage.setItem(STORAGE_RESET_KEY, STORAGE_RESET_VERSION);
          }
        }

        const stored = loadStoredTransactions();
        const storedSource = loadStoredTransactionsSource();
        const storedVersion = loadStoredTransactionsVersion();
        const shouldUseStoredUserPortfolio = stored.length > 0 && storedSource === "user";
        const shouldUseCurrentDefaultPortfolio =
          stored.length > 0 &&
          storedSource === "default" &&
          storedVersion === DEFAULT_PORTFOLIO_VERSION;

        if (shouldUseStoredUserPortfolio || shouldUseCurrentDefaultPortfolio) {
          const normalizedStored = normalizeTransactions(stored);
          if (normalizedStored !== stored) {
            persistTransactions(normalizedStored, {
              source: storedSource ?? "user",
              version: storedVersion ?? "",
            });
          }
          setTransactions(normalizedStored);
          return;
        }

        const parsedGroups: Transaction[][] = [];

        for (const source of DEFAULT_PORTFOLIO_FILES) {
          const response = await fetch(source.file);
          if (!response.ok) continue;

          const text = await response.text();
          const parsed = await new Promise<Transaction[]>((resolve) => {
            Papa.parse<Record<string, string | number>>(text, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results: ParseResult<Record<string, string | number>>) => {
                const rows = Array.isArray(results.data) ? results.data : [];
                resolve(
                  rows
                    .map((row) => toTransaction(row, { account: source.account }))
                    .filter((row): row is Transaction => Boolean(row)),
                );
              },
            });
          });

          if (parsed.length > 0) {
            parsedGroups.push(parsed);
          }
        }

        const merged = mergeTransactions(parsedGroups);
        if (merged.length > 0) {
          persistTransactions(merged, {
            source: "default",
            version: DEFAULT_PORTFOLIO_VERSION,
          });
          setTransactions(merged);
          console.log(`INFO: Loaded ${merged.length} default portfolio transactions from ${parsedGroups.length} files.`);
        }
      } catch (error) {
        console.error("Failed to load default portfolio", error);
      } finally {
        setIsBootstrapping(false);
      }
    };

    loadDefaultData();

    const sync = () => setTransactions(normalizeTransactions(loadStoredTransactions()));
    window.addEventListener("storage", sync);
    window.addEventListener(TRANSACTIONS_UPDATED_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(TRANSACTIONS_UPDATED_EVENT, sync);
    };
  }, []);

  // Fetch Quotes
  useEffect(() => {
    const tickers = Array.from(new Set(transactions.map((tx) => tx.ticker))).filter(Boolean);
    if (tickers.length === 0) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => setIsLoadingQuotes(true), 0);

    fetch(`/api/quotes?tickers=${encodeURIComponent(tickers.join(","))}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.quotes) return;
        const nextMap: Record<string, PriceSnapshot> = {};
        for (const quote of data.quotes) {
          if (!quote?.ticker || !Number.isFinite(quote.price)) continue;
          nextMap[quote.ticker.toUpperCase()] = {
            name: quote.name,
            price: quote.price,
            dayChange: Number.isFinite(quote.dayChange) ? quote.dayChange : undefined,
            dayChangePercent: Number.isFinite(quote.dayChangePercent)
              ? quote.dayChangePercent
              : undefined,
          };
        }
        setPriceMap((prev) => ({ ...prev, ...nextMap }));
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingQuotes(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [transactions]);

  // Derived calculations
  const holdings = useMemo(
    () => computeHoldings(transactions, priceMap, fxRate, baseCurrency),
    [transactions, priceMap, fxRate, baseCurrency]
  );
  
  const summary = useMemo(() => computeSummary(holdings), [holdings]);
  
  const realizedTrades = useMemo(() => {
    const baseTrades = computeRealizedTrades(transactions, priceMap, fxRate, baseCurrency);
    return baseTrades.map((trade) => {
      const quoteName = priceMap[trade.ticker.toUpperCase()]?.name;
      if (trade.name || !quoteName) return trade;
      return { ...trade, name: quoteName };
    });
  }, [transactions, fxRate, baseCurrency, priceMap]);

  const hasTransactions = transactions.length > 0;

  return {
    transactions,
    holdings,
    summary,
    realizedTrades,
    hasTransactions,
    isLoading: isBootstrapping || isLoadingQuotes,
  };
}

export function PortfolioDataProvider({ children }: { children: ReactNode }) {
  const value = usePortfolioDataValue();
  return createElement(PortfolioDataContext.Provider, { value }, children);
}

export function usePortfolioData() {
  const context = useContext(PortfolioDataContext);
  if (!context) {
    throw new Error("usePortfolioData must be used within PortfolioDataProvider");
  }
  return context;
}
