import test from "node:test";
import assert from "node:assert/strict";

import { computeCashBalanceBase, computeCashBalancesByCurrency } from "@/lib/portfolio";
import type { Transaction } from "@/types/transactions";

test("mantiene cash por divisa y lo convierte con fx actual", () => {
  const transactions: Transaction[] = [
    {
      date: "2025-04-26T15:38:09.349295Z",
      ticker: "",
      type: "OTHER",
      quantity: 0,
      price: 223,
      grossAmount: 223,
      currency: "USD",
      fxRate: 1.1379,
    },
    {
      date: "2025-04-28T16:22:15.804Z",
      ticker: "GOOGL",
      type: "BUY",
      quantity: 1,
      price: 159,
      grossAmount: 159,
      currency: "USD",
      fxRate: 1.1414,
    },
    {
      date: "2025-05-23T19:24:19.170630Z",
      ticker: "",
      type: "OTHER",
      quantity: 0,
      price: 329,
      grossAmount: 329,
      currency: "EUR",
      fxRate: 1,
    },
  ];

  const balances = computeCashBalancesByCurrency(transactions, "EUR");
  assert.equal(balances.get("USD"), 64);
  assert.equal(balances.get("EUR"), 329);
  assert.equal(computeCashBalanceBase(transactions, 1.16, "EUR"), 329 + (64 / 1.16));
});

test("el seed de brokerage reconstruye el cash final del extracto", async () => {
  const fs = await import("node:fs/promises");
  const text = await fs.readFile("public/portfolio-seed-2026-03.csv", "utf8");
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const columns = header.split(",");
  const transactions: Transaction[] = rows.map((row) => {
    const values = row.split(",");
    const record = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
    const parseNumber = (value: string) => {
      const cleaned = value.replace(/[^\d,.-]/g, "");
      if (!cleaned) return 0;
      if (cleaned.includes(",") && cleaned.includes(".")) {
        return cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
          ? Number(cleaned.replace(/\./g, "").replace(",", "."))
          : Number(cleaned.replace(/,/g, ""));
      }
      return Number(cleaned.replace(",", "."));
    };
    const typeRaw = String(record.Type).toUpperCase();
    const type = typeRaw.includes("BUY")
      ? "BUY"
      : typeRaw.includes("SELL")
        ? "SELL"
        : typeRaw.includes("DIV")
          ? "DIVIDEND"
          : typeRaw.includes("FEE") || typeRaw.includes("COMMISSION")
            ? "FEE"
            : "OTHER";

    return {
      date: String(record.Date),
      ticker: String(record.Ticker),
      type,
      quantity: Math.abs(parseNumber(String(record.Quantity))),
      price: parseNumber(String(record["Price per share"])),
      grossAmount: parseNumber(String(record["Total Amount"])),
      currency: String(record.Currency).trim().toUpperCase() as "EUR" | "USD",
      fxRate: parseNumber(String(record["FX Rate"])),
    };
  });

  const balances = computeCashBalancesByCurrency(transactions, "EUR");
  assert.ok(Math.abs((balances.get("EUR") ?? 0) - 0.12) < 1e-6);
  assert.ok(Math.abs((balances.get("USD") ?? 0) - 10.94) < 1e-6);
});
