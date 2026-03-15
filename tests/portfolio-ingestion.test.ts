import test from "node:test";
import assert from "node:assert/strict";

import {
  backfillTransactionAccounts,
  toTransaction,
  type ParsedRow,
} from "@/hooks/usePortfolioData.utils";

test("preserva el signo en cash withdrawal", () => {
  const tx = toTransaction({
    Date: "2025-04-26T15:40:31.668209Z",
    Ticker: "",
    Type: "CASH WITHDRAWAL",
    Quantity: "",
    "Price per share": "",
    "Total Amount": "USD -64",
    Currency: "USD",
    "FX Rate": "1.1379",
  } as ParsedRow);

  assert.ok(tx);
  assert.equal(tx.grossAmount, -64);
  assert.equal(tx.price, -64);
});

test("normaliza transacciones guardadas antiguas con signo incorrecto", () => {
  const [withdrawal, dividendCorrection] = backfillTransactionAccounts([
    {
      date: "2025-04-26T15:40:31.668209Z",
      ticker: "",
      type: "OTHER",
      quantity: 0,
      price: -64,
      grossAmount: 64,
      currency: "USD",
    },
    {
      date: "2025-07-02T21:22:14.883440Z",
      ticker: "GOOGL",
      type: "DIVIDEND",
      quantity: 0,
      price: -0.03,
      grossAmount: 0.03,
      currency: "USD",
    },
  ]);

  assert.equal(withdrawal.grossAmount, -64);
  assert.equal(dividendCorrection.grossAmount, -0.03);
});

test("normaliza tickers europeos guardados sin mercado", () => {
  const [transaction] = backfillTransactionAccounts([
    {
      date: "2025-04-15T12:00:02.098Z",
      ticker: "DBXJ",
      type: "BUY",
      quantity: 1,
      price: 70.36,
      grossAmount: 70.36,
      currency: "EUR",
    },
  ]);

  assert.equal(transaction.ticker, "XETR:DBXJ");
});

test("no infiere fee cuando la diferencia es solo redondeo", () => {
  const tx = toTransaction({
    Date: "2026-01-12T07:00:18.391Z",
    Ticker: "REP",
    Type: "BUY - MARKET",
    Quantity: "18.25609756",
    "Price per share": "EUR 16.40",
    "Total Amount": "EUR 300",
    Currency: "EUR",
    "FX Rate": "1.0000",
  } as ParsedRow);

  assert.ok(tx);
  assert.equal(tx.fee, undefined);
});

test("infiere fee cuando la diferencia excede claramente el redondeo", () => {
  const tx = toTransaction({
    Date: "2025-10-20T18:47:05Z",
    Ticker: "AAPL",
    Type: "BUY - LIMIT",
    Quantity: "1",
    "Price per share": "USD 263.05",
    "Total Amount": "USD 264.21",
    Currency: "USD",
    "FX Rate": "1.1671",
  } as ParsedRow);

  assert.ok(tx);
  assert.ok((tx.fee ?? 0) > 1.1);
});
