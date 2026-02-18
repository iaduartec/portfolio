"use client";

import { useEffect, useMemo, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import {
  loadStoredTransactions,
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

export function usePortfolioData() {
  const { fxRate, baseCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceSnapshot>>({});
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // Load and sync transactions
  useEffect(() => {
    const loadDefaultData = async () => {
      const stored = loadStoredTransactions();
      if (stored.length > 0) {
        setTransactions(stored);
        return;
      }

      try {
        const defaultFiles = [
          "/DA0F4AD2-C6CC-4ED7-A1EA-612069957DA4.csv",
          "/Mi cartera_2025-11-29.csv",
        ];

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
            persistTransactions(parsed);
            setTransactions(parsed);
            console.log(`INFO: Loaded default portfolio data from ${file}.`);
            break;
          }
        }
      } catch (error) {
        console.error("Failed to load default portfolio", error);
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

  return { transactions, holdings, summary, realizedTrades, hasTransactions, isLoading: isLoadingQuotes };
}
