import test from "node:test";
import assert from "node:assert/strict";

import { buildSampleDataset } from "@/adapters/portfolio";
import {
  calculatePeriodPnL,
  calculatePortfolioSummary,
  calculatePosition,
} from "@/calculations/portfolio";
import {
  Asset,
  CashTransaction,
  DividendTransaction,
  PortfolioCalculationError,
  Trade,
} from "@/domain/portfolio";

const approxEqual = (actual: number, expected: number, precision = 1e-6): void => {
  assert.ok(
    Math.abs(actual - expected) <= precision,
    `expected ${expected}, received ${actual}`,
  );
};

const createAsset = (overrides: Partial<Asset> = {}): Asset => ({
  symbol: "ABC",
  name: "Asset ABC",
  currency: "EUR",
  lastPrice: 110,
  lastFxRateToBase: 1,
  ...overrides,
});

const createTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: "trade-1",
  assetSymbol: "ABC",
  side: "BUY",
  quantity: 10,
  price: 100,
  fee: 0,
  currency: "EUR",
  fxRateToBase: 1,
  executedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const createDividend = (
  overrides: Partial<DividendTransaction> = {},
): DividendTransaction => ({
  id: "dividend-1",
  assetSymbol: "ABC",
  amount: 25,
  fee: 0,
  currency: "EUR",
  fxRateToBase: 1,
  paidAt: "2026-01-15T00:00:00Z",
  ...overrides,
});

const createCashTransaction = (
  overrides: Partial<CashTransaction> = {},
): CashTransaction => ({
  id: "cash-1",
  type: "DEPOSIT",
  amount: 1000,
  currency: "EUR",
  fxRateToBase: 1,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

test("compra unica sin fees", () => {
  const position = calculatePosition([createTrade()], createAsset(), "EUR");

  assert.equal(position.totalBoughtQty, 10);
  assert.equal(position.totalSoldQty, 0);
  assert.equal(position.openQty, 10);
  assert.equal(position.averageCostPerUnitBase, 100);
  assert.equal(position.remainingCostBasisBase, 1000);
  assert.equal(position.marketValueBase, 1100);
  assert.equal(position.unrealizedPnLBase, 100);
  assert.equal(position.unrealizedReturnPct, 10);
});

test("compra con fees", () => {
  const position = calculatePosition(
    [createTrade({ fee: 10 })],
    createAsset({ lastPrice: 100 }),
    "EUR",
  );

  assert.equal(position.averageCostPerUnitBase, 101);
  assert.equal(position.remainingCostBasisBase, 1010);
  assert.equal(position.unrealizedPnLBase, -10);
});

test("dos compras con precio distinto calculan coste medio ponderado", () => {
  const trades = [
    createTrade({ id: "buy-1", quantity: 10, price: 100 }),
    createTrade({
      id: "buy-2",
      quantity: 5,
      price: 130,
      executedAt: "2026-01-02T00:00:00Z",
    }),
  ];

  const position = calculatePosition(trades, createAsset({ lastPrice: 130 }), "EUR");

  approxEqual(position.averageCostPerUnitBase, 110);
  assert.equal(position.remainingCostBasisBase, 1650);
});

test("venta parcial calcula realized pnl correcto", () => {
  const trades = [
    createTrade({ id: "buy-1", quantity: 10, price: 100, fee: 10 }),
    createTrade({
      id: "sell-1",
      side: "SELL",
      quantity: 4,
      price: 120,
      fee: 8,
      executedAt: "2026-01-05T00:00:00Z",
    }),
  ];

  const position = calculatePosition(trades, createAsset({ lastPrice: 120 }), "EUR");

  approxEqual(position.realizedPnLAllTimeBase, 68);
  approxEqual(position.remainingCostBasisBase, 606);
  approxEqual(position.averageCostPerUnitBase, 101);
});

test("posicion abierta calcula unrealized pnl correcto", () => {
  const trades = [
    createTrade({ id: "buy-1", quantity: 10, price: 100 }),
    createTrade({
      id: "sell-1",
      side: "SELL",
      quantity: 3,
      price: 105,
      fee: 0,
      executedAt: "2026-01-02T00:00:00Z",
    }),
  ];

  const position = calculatePosition(trades, createAsset({ lastPrice: 112 }), "EUR");

  assert.equal(position.openQty, 7);
  assert.equal(position.remainingCostBasisBase, 700);
  assert.equal(position.marketValueBase, 784);
  assert.equal(position.unrealizedPnLBase, 84);
  assert.equal(position.unrealizedReturnPct, 12);
});

test("dividendos e intereses se incluyen en period pnl", () => {
  const trades = [createTrade()];
  const dividends = [createDividend({ amount: 20, fee: 2 })];
  const cash = [createCashTransaction({
    id: "interest-1",
    type: "INTEREST",
    amount: 5,
    createdAt: "2026-01-20T00:00:00Z",
  })];

  const result = calculatePeriodPnL(
    { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
    trades,
    dividends,
    cash,
  );

  assert.equal(result.realizedPnLBase, 0);
  assert.equal(result.incomeBase, 23);
  assert.equal(result.feesBase, 2);
  assert.equal(result.netPnLBase, 23);
  assert.equal(result.dividendCount, 1);
});

test("evita doble conteo de fees de compra y venta en net pnl", () => {
  const trades = [
    createTrade({ id: "buy-1", quantity: 10, price: 100, fee: 10 }),
    createTrade({
      id: "sell-1",
      side: "SELL",
      quantity: 10,
      price: 110,
      fee: 10,
      executedAt: "2026-01-10T00:00:00Z",
    }),
  ];

  const result = calculatePeriodPnL(
    { from: "2026-01-01T00:00:00Z", to: "2026-01-31T23:59:59Z" },
    trades,
    [],
    [],
  );

  assert.equal(result.realizedPnLBase, 80);
  assert.equal(result.feesBase, 20);
  assert.equal(result.netPnLBase, 80);
});

test("conversion fx correcta para coste historico y market value", () => {
  const trades = [
    createTrade({
      id: "usd-buy",
      assetSymbol: "USDX",
      currency: "USD",
      fxRateToBase: 0.9,
      quantity: 10,
      price: 100,
      fee: 1,
    }),
  ];
  const asset = createAsset({
    symbol: "USDX",
    currency: "USD",
    lastPrice: 120,
    lastFxRateToBase: 0.95,
  });

  const position = calculatePosition(trades, asset, "EUR");

  approxEqual(position.remainingCostBasisBase, 900.9);
  approxEqual(position.marketValueBase, 1140);
  approxEqual(position.unrealizedPnLBase, 239.1);
});

test("portfolio summary calcula cash, pnl y retorno total", () => {
  const dataset = buildSampleDataset();

  const summary = calculatePortfolioSummary(
    dataset.trades,
    dataset.dividends,
    dataset.cashTransactions,
    dataset.marketData,
    dataset.baseCurrency,
  );

  approxEqual(summary.cashBalanceBase, 3121.13);
  approxEqual(summary.investedCostBasisBase, 2095.11);
  approxEqual(summary.portfolioMarketValueBase, 5479.93);
  approxEqual(summary.unrealizedPnLBase, 263.69);
  approxEqual(summary.realizedPnLAllTimeBase, 197.93);
  approxEqual(summary.incomeAllTimeBase, 21.81);
  approxEqual(summary.totalReturnBase, 479.93);
  approxEqual(summary.totalReturnPct ?? 0, 15.36341374);
  assert.equal(summary.positions.length, 2);
});

test("venta mayor que cantidad disponible lanza error", () => {
  assert.throws(
    () =>
      calculatePosition(
        [
          createTrade({ quantity: 5 }),
          createTrade({
            id: "sell-too-much",
            side: "SELL",
            quantity: 6,
            price: 110,
            executedAt: "2026-01-02T00:00:00Z",
          }),
        ],
        createAsset(),
        "EUR",
      ),
    PortfolioCalculationError,
  );
});

test("datos de mercado ausentes lanzan error en resumen", () => {
  const trades = [createTrade({ assetSymbol: "MISS" })];

  assert.throws(
    () => calculatePortfolioSummary(trades, [], [], [], "EUR"),
    PortfolioCalculationError,
  );
});

test("fx rate invalido lanza error", () => {
  assert.throws(
    () =>
      calculatePosition(
        [
          createTrade({
            assetSymbol: "USDX",
            currency: "USD",
            fxRateToBase: 0,
          }),
        ],
        createAsset({
          symbol: "USDX",
          currency: "USD",
          lastPrice: 100,
          lastFxRateToBase: 1,
        }),
        "EUR",
      ),
    PortfolioCalculationError,
  );
});
