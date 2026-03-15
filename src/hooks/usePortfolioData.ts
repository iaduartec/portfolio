"use client";

import { useEffect, useMemo, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import {
  loadStoredTransactions,
  loadStoredTransactionsSource,
  loadStoredTransactionsVersion,
  persistTransactions,
  TRANSACTIONS_UPDATED_EVENT,
} from "@/lib/storage";
import { Transaction } from "@/types/transactions";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  computeHoldings, 
  computeSummary, 
  computeRealizedTrades, 
  PriceSnapshot 
} from "@/lib/portfolio";
import { toTransaction } from "@/hooks/usePortfolioData.utils";

const DEFAULT_PORTFOLIO_VERSION = "2026-03-15-merged-roboadvisor-csv";

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

  return Array.from(merged.values()).sort(transactionSort);
};

export function usePortfolioData() {
  const { fxRate, baseCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceSnapshot>>({});
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // Load and sync transactions
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        const stored = loadStoredTransactions();
        const storedSource = loadStoredTransactionsSource();
        const storedVersion = loadStoredTransactionsVersion();
        const shouldUseStoredUserPortfolio = stored.length > 0 && storedSource === "user";
        const shouldUseCurrentDefaultPortfolio =
          stored.length > 0 &&
          storedSource === "default" &&
          storedVersion === DEFAULT_PORTFOLIO_VERSION;

        if (shouldUseStoredUserPortfolio || shouldUseCurrentDefaultPortfolio) {
          setTransactions(stored);
          return;
        }

        const defaultFiles = [
          "/portfolio-seed-2026-03.csv",
          "/roboadvisor-revolut-2026-03.csv",
          "/DA0F4AD2-C6CC-4ED7-A1EA-612069957DA4.csv",
          "/Mi cartera_2025-11-29.csv",
        ];

        const parsedGroups: Transaction[][] = [];

        for (const file of defaultFiles) {
          const response = await fetch(file);
          if (!response.ok) continue;

          const text = await response.text();
          const parsed = await new Promise<Transaction[]>((resolve) => {
            Papa.parse<Record<string, string | number>>(text, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results: ParseResult<Record<string, string | number>>) => {
                const rows = Array.isArray(results.data) ? results.data : [];
                resolve(rows.map(toTransaction).filter((row): row is Transaction => Boolean(row)));
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

    const sync = () => setTransactions(loadStoredTransactions());
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
    const baseTrades = computeRealizedTrades(transactions, fxRate, baseCurrency);
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
