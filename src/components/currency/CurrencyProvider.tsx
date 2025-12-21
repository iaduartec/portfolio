"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type CurrencyCode } from "@/lib/formatters";

type CurrencyContextValue = {
  baseCurrency: CurrencyCode;
  currency: CurrencyCode;
  fxRate: number;
  setCurrency: (next: CurrencyCode) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);
const STORAGE_KEY = "preferredCurrency";
const FX_STORAGE_KEY = "eurUsdRate";
const FX_TIMESTAMP_KEY = "eurUsdRateUpdatedAt";
const FX_TTL_MS = 1000 * 60 * 60 * 6;
const DEFAULT_RATE = 1.08;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const baseCurrency: CurrencyCode = "EUR";
  const [currency, setCurrencyState] = useState<CurrencyCode>("EUR");
  const [fxRate, setFxRate] = useState<number>(DEFAULT_RATE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "EUR" || stored === "USD") {
      setCurrencyState(stored);
    }
    const storedRate = window.localStorage.getItem(FX_STORAGE_KEY);
    const storedUpdated = window.localStorage.getItem(FX_TIMESTAMP_KEY);
    if (storedRate) {
      const parsed = Number(storedRate);
      if (Number.isFinite(parsed) && parsed > 0) {
        setFxRate(parsed);
      }
    }
    if (storedUpdated) {
      const updatedAt = Number(storedUpdated);
      if (Number.isFinite(updatedAt) && Date.now() - updatedAt < FX_TTL_MS) {
        return;
      }
    }
    void fetch("https://api.exchangerate.host/latest?base=EUR&symbols=USD")
      .then((res) => res.json())
      .then((data) => {
        const nextRate = Number(data?.rates?.USD);
        if (!Number.isFinite(nextRate) || nextRate <= 0) return;
        setFxRate(nextRate);
        window.localStorage.setItem(FX_STORAGE_KEY, String(nextRate));
        window.localStorage.setItem(FX_TIMESTAMP_KEY, String(Date.now()));
      })
      .catch(() => {});
  }, []);

  const setCurrency = (next: CurrencyCode) => {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(
    () => ({ baseCurrency, currency, fxRate, setCurrency }),
    [baseCurrency, currency, fxRate]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
