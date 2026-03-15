import test from "node:test";
import assert from "node:assert/strict";

import { dedupeTransactions } from "@/hooks/usePortfolioData";
import type { Transaction } from "@/types/transactions";

test("elimina duplicados exactos almacenados en localStorage", () => {
  const duplicated: Transaction[] = [
    {
      date: "2026-01-12T07:00:18.391Z",
      ticker: "BME:REP",
      type: "BUY",
      quantity: 18.25609756,
      price: 16.4,
      grossAmount: 300,
      currency: "EUR",
      account: "BROKERAGE",
      fxRate: 1,
    },
    {
      date: "2026-01-12T07:00:18.391Z",
      ticker: "BME:REP",
      type: "BUY",
      quantity: 18.25609756,
      price: 16.4,
      grossAmount: 300,
      currency: "EUR",
      account: "BROKERAGE",
      fxRate: 1,
    },
  ];

  const normalized = dedupeTransactions(duplicated);
  assert.equal(normalized.length, 1);
});
